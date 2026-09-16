// Parsing dell'export TSV/CSV del vecchio diario tenuto su Google Fogli
// (una riga = un giorno; una colonna con il testo della giornata, una con il
// titolo, una col voto di umore 0–100). Usato SOLO dalla schermata
// provvisoria "Importa da testo" (src/pages/web/WebImport.jsx).

import { MONTHS_IT } from './dates'

const pad = (n) => String(n).padStart(2, '0')

// Interpreta il valore di una colonna "mese": numero 1–12, oppure nome
// italiano anche abbreviato ("gennaio", "gen", "GEN"), oppure una stringa
// tipo "01-2019" / "2019-01" da cui si prende il primo numero 1–12.
// Ritorna il mese 0-based (0 = gennaio), o null se non riconosciuto.
export function parseMonth(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (!s) return null
  const whole = Number(s.replace(',', '.'))
  if (Number.isInteger(whole) && whole >= 1 && whole <= 12) return whole - 1
  const idx = MONTHS_IT.findIndex((m) => {
    const ml = m.toLowerCase()
    return s === ml || (s.length >= 3 && ml.startsWith(s))
  })
  if (idx >= 0) return idx
  for (const tok of s.split(/[^\d]+/).filter(Boolean)) {
    const n = Number(tok)
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n - 1
  }
  return null
}

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
// - `year` dà l'anno; mese e giorno si leggono dalla riga stessa (colonne
//   `monthCol` e `day`) — così si può incollare l'anno intero in un colpo
//   solo e ogni riga finisce da sola nel mese giusto, senza dover scegliere
//   un mese alla volta da un menu.
// - Le righe senza un mese riconoscibile in `monthCol`, o con un numero di
//   giorno non valido per quel mese, vengono ignorate (intestazioni,
//   separatori, celle vuote).
// - Una riga senza testo E senza voto viene ignorata; con solo il voto resta
//   (giornata vuota comunque registrata).
// - Se la stessa data compare più volte si tiene la prima occorrenza.
export function sheetRowsToDays(rows, { year, day, text, title, mood, monthCol }) {
  const di = colToIndex(day)
  const ti = colToIndex(text)
  const tii = colToIndex(title)
  const mi = colToIndex(mood)
  const mci = colToIndex(monthCol)
  const seen = new Set()
  const out = []
  for (const r of rows) {
    const month = mci != null ? parseMonth(r[mci]) : null
    if (month == null) continue
    const lastDay = new Date(year, month + 1, 0).getDate()
    const dayNum = Number(String((di != null && r[di]) || '').trim())
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > lastDay) continue
    const dateKey = `${year}-${pad(month + 1)}-${pad(dayNum)}`
    if (seen.has(dateKey)) continue
    const rawText = ti != null ? String(r[ti] ?? '').replace(/\s+$/g, '') : ''
    const moodRaw = mi != null ? String(r[mi] ?? '').trim() : ''
    const moodNum = moodRaw === '' ? NaN : Number(moodRaw.replace(',', '.'))
    const moodScore = Number.isFinite(moodNum)
      ? Math.min(100, Math.max(0, moodNum))
      : null
    if (!rawText.trim() && moodScore == null) continue
    seen.add(dateKey)
    out.push({
      dateKey,
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

const clamp01 = (x) => Math.min(1, Math.max(0, x))

// Avvisi non bloccanti su un blocco: servono solo a guidare la revisione.
function dayFlags(content) {
  const flags = []
  if (content.trim().length < 40) flags.push('Blocco molto corto')
  if (content.trim() && !timesInText(content).length)
    flags.push('Nessun orario nel blocco')
  return flags
}

// Minuscolo e senza accenti, per confronti insensibili a maiuscole/accenti.
function foldCase(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Parole di un testo (≥3 lettere, così non abboccano ad articoli/preposizioni
// come "un", "di", "al").
function wordsOf(s) {
  return foldCase(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
}

// Tra `names` (persone o tag già a database), quelli con almeno una "parola"
// (nome/cognome per una persona, l'intera parola per un tag di una parola)
// che compare per intero nel testo — confronto per parole intere, non per
// sottostringa, per non far scattare "Ann" dentro "Anna" o "vino" dentro
// "avvinare". Sostituisce l'analisi che faceva Gemini: qui è solo un
// controllo lessicale, va sempre rivisto in revisione.
export function matchMentioned(text, names) {
  const words = new Set(wordsOf(text))
  const out = []
  for (const name of names) {
    const parts = wordsOf(name)
    if (parts.length && parts.some((p) => words.has(p))) out.push(name)
  }
  return out
}

// Da una giornata (sheetRowsToDays) a UNA nota che copre tutto il testo del
// giorno, senza tagliarlo: è lo "script" locale che sostituisce la
// segmentazione via Gemini per l'import da foglio, che con molti giorni
// insieme si bloccava spesso. La suddivisione in più fasi (e l'umore di
// ciascuna) resta a chi rivede, con "Spezza qui" nella schermata di import.
// `peopleNames`/`tagNames` (opzionali): elenco di quelli già a database, per
// precompilare persone/tag citati nel testo (vedi matchMentioned) — sempre
// da confermare in revisione.
export function dayToNote(
  { dateKey, rawText, sheetTitle, moodScore },
  { peopleNames = [], tagNames = [] } = {},
) {
  const lines = String(rawText ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  const nonEmpty = []
  lines.forEach((l, i) => {
    if (l.trim()) nonEmpty.push(i)
  })
  const mood = moodScore != null ? clamp01(moodScore / 100) : 0.5
  if (!nonEmpty.length) {
    return {
      date: dateKey,
      title: sheetTitle,
      content: '',
      mood,
      timeStart: '',
      timeEnd: '',
      people: matchMentioned(sheetTitle, peopleNames),
      place: '',
      tags: matchMentioned(sheetTitle, tagNames),
      sourceStart: null,
      sourceEnd: null,
      flags: ['Giornata senza testo'],
    }
  }
  const start = nonEmpty[0]
  const end = nonEmpty[nonEmpty.length - 1]
  const content = lines
    .slice(start, end + 1)
    .join('\n')
    .replace(/^\s+|\s+$/g, '')
  const times = timesInText(content)
  const haystack = `${sheetTitle} ${content}`
  return {
    date: dateKey,
    title: sheetTitle,
    content,
    mood,
    timeStart: times[0] || '',
    timeEnd: times[times.length - 1] || '',
    people: matchMentioned(haystack, peopleNames),
    place: '',
    tags: matchMentioned(haystack, tagNames),
    sourceStart: start,
    sourceEnd: end,
    flags: dayFlags(content),
  }
}
