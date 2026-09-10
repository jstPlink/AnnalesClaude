// Parsing dell'export TSV/CSV del vecchio diario tenuto su Google Fogli
// (una riga = un giorno; una colonna con il testo della giornata, una con il
// titolo, una col voto di umore 0–100). Usato SOLO dalla schermata
// provvisoria "Importa da testo" (src/pages/web/WebImport.jsx).

const pad = (n) => String(n).padStart(2, '0')

// Divide un testo delimitato (TSV o CSV) in righe di celle, gestendo i campi
// tra virgolette con a-capo interni e virgolette raddoppiate ("") — è così
// che Google Fogli esporta (o mette negli appunti) una cella su più righe.
// Il delimitatore è dedotto: TAB se presente nel testo, altrimenti virgola.
export function parseDelimited(text, delimiter) {
  const src = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  const delim = delimiter || (src.includes('\t') ? '\t' : ',')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let i = 0
  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }
  while (i < src.length) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      quoted = true
      i++
      continue
    }
    if (c === delim) {
      pushField()
      i++
      continue
    }
    if (c === '\n') {
      pushRow()
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length || row.length) pushRow()
  // scarta le righe completamente vuote
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

// "A" -> 0, "B" -> 1, ... "AA" -> 26. Accetta anche un indice numerico già
// 0-based (stringa o numero). Ritorna null se non interpretabile.
export function colToIndex(spec) {
  if (spec == null || spec === '') return null
  const s = String(spec).trim()
  if (/^\d+$/.test(s)) return Number(s)
  if (!/^[A-Za-z]+$/.test(s)) return null
  let n = 0
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

// Tutti gli orari "H.MM" / "HH:MM" trovati in un testo, normalizzati a
// "HH:MM" e nell'ordine in cui compaiono. Serve a dedurre inizio/fine di un
// blocco dalle righe "09.00 ~ ..." del vecchio diario.
export function timesInText(s) {
  const str = String(s ?? '')
  const re = /\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g
  const out = []
  let m
  while ((m = re.exec(str))) out.push(`${pad(Number(m[1]))}:${m[2]}`)
  return out
}

// Da righe di celle (parseDelimited) a giornate
// { dateKey, rawText, sheetTitle, moodScore }.
// - `year` / `month` (month 0–11) danno anno e mese; il giorno viene dalla
//   colonna `day`.
// - Le righe il cui numero di giorno non è valido per quel mese vengono
//   ignorate (intestazioni, separatori, celle vuote).
// - Una riga senza testo E senza voto viene ignorata; con solo il voto resta
//   (giornata vuota comunque registrata).
// - Se lo stesso giorno compare più volte si tiene la prima occorrenza.
export function sheetRowsToDays(rows, { year, month, day, text, title, mood }) {
  const di = colToIndex(day)
  const ti = colToIndex(text)
  const tii = colToIndex(title)
  const mi = colToIndex(mood)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const dayNum = Number(String((di != null && r[di]) || '').trim())
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > lastDay) continue
    if (seen.has(dayNum)) continue
    const rawText = ti != null ? String(r[ti] ?? '').replace(/\s+$/g, '') : ''
    const moodRaw = mi != null ? String(r[mi] ?? '').trim() : ''
    const moodNum = moodRaw === '' ? NaN : Number(moodRaw.replace(',', '.'))
    const moodScore = Number.isFinite(moodNum)
      ? Math.min(100, Math.max(0, moodNum))
      : null
    if (!rawText.trim() && moodScore == null) continue
    seen.add(dayNum)
    out.push({
      dateKey: `${year}-${pad(month + 1)}-${pad(dayNum)}`,
      rawText,
      sheetTitle:
        tii != null
          ? String(r[tii] ?? '')
              .trim()
              .replace(/\s*\n\s*/g, ' ')
          : '',
      moodScore,
    })
  }
  out.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))
  return out
}
