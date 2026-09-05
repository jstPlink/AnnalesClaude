import { parseWall } from './dates'

// Gestione del valore `mood` (0–1) e della sua rappresentazione a colori.

// Nella vista mensile si elencano i titoli delle note "estreme": mood molto
// alto (> HIGH) o molto basso (< LOW). Le vie di mezzo restano nascoste.
export const MOOD_HIGH_THRESHOLD = 0.675
export const MOOD_LOW_THRESHOLD = 0.375

// true se il mood della nota va elencato nella vista mensile.
export function isNoteworthyMood(value) {
  const v = Number(value)
  return v > MOOD_HIGH_THRESHOLD || v < MOOD_LOW_THRESHOLD
}

// Stop del gradiente del mood, coerenti con la palette dell'app:
// rosso corallo (= delete) → arancio → giallo → verde (= save) → blu → blu-viola.
const STOPS = [
  { t: 0.0, c: [224, 101, 94] }, // #e0655e
  { t: 0.2, c: [231, 154, 77] }, // #e79a4d
  { t: 0.4, c: [230, 207, 92] }, // #e6cf5c
  { t: 0.6, c: [166, 208, 110] }, // #a6d06e
  { t: 0.8, c: [94, 169, 214] }, // #5ea9d6
  { t: 1.0, c: [139, 143, 214] }, // #8b8fd6
]

function clamp01(n) {
  if (Number.isNaN(n) || n == null) return 0
  return Math.min(1, Math.max(0, n))
}

function lerp(a, b, k) {
  return Math.round(a + (b - a) * k)
}

// Esalta lo scostamento dal centro (0.5) prima di mappare il colore: stessa
// distanza dal centro produce un cambio di colore molto più marcato vicino
// a 0.5 (dove serve più "risalto"), via via più attenuato avvicinandosi
// agli estremi (già ai margini della scala, non serve spingerli oltre).
// Il valore numerico mostrato in UI resta quello reale: solo il colore usa
// questa versione "esagerata".
function boostForColor(v) {
  const d = 2 * (v - 0.5) // -1..1
  const boosted = Math.sign(d) * Math.pow(Math.abs(d), 0.55)
  return clamp01(0.5 + boosted / 2)
}

// Colore CSS per un singolo valore di mood.
export function moodColor(value) {
  const v = boostForColor(clamp01(Number(value)))
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i]
    const hi = STOPS[i + 1]
    if (v >= lo.t && v <= hi.t) {
      const k = hi.t === lo.t ? 0 : (v - lo.t) / (hi.t - lo.t)
      const r = lerp(lo.c[0], hi.c[0], k)
      const g = lerp(lo.c[1], hi.c[1], k)
      const b = lerp(lo.c[2], hi.c[2], k)
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  const last = STOPS[STOPS.length - 1].c
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`
}

// Colore del testo (scuro o chiaro) da usare SOPRA un'area colorata col mood,
// per mantenere il contrasto leggibile.
export function moodTextColor(value) {
  const v = boostForColor(clamp01(Number(value)))
  let rgb = [255, 255, 255]
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i]
    const hi = STOPS[i + 1]
    if (v >= lo.t && v <= hi.t) {
      const k = hi.t === lo.t ? 0 : (v - lo.t) / (hi.t - lo.t)
      rgb = [
        lerp(lo.c[0], hi.c[0], k),
        lerp(lo.c[1], hi.c[1], k),
        lerp(lo.c[2], hi.c[2], k),
      ]
      break
    }
  }
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  return lum > 0.62 ? '#3a3226' : '#fdf7ea'
}

// Media dei mood di un elenco di note (ignora i valori non numerici).
export function averageMood(notes) {
  const vals = notes
    .map((n) => Number(n.mood))
    .filter((n) => !Number.isNaN(n))
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Peso di una nota nel calcolo del mood del giorno.
// Curva a "valle": peso ~1 ai mood estremi (0 e 1), peso minimo (0.15) a 0.5,
// con transizione morbida (smoothstep) e code piatte.
function extremeWeight(m) {
  const d = Math.min(1, Math.abs(2 * clamp01(m) - 1))
  const s = d * d * (3 - 2 * d)
  return 0.15 + 0.85 * s
}

// Mood del giorno: media delle note pesata con extremeWeight, così le note
// "neutre" (mood ~0.5) contano poco e quelle marcate contano molto.
export function dayMood(notes) {
  const vals = notes
    .map((n) => Number(n.mood))
    .filter((n) => !Number.isNaN(n))
  if (!vals.length) return 0
  let wsum = 0
  let acc = 0
  for (const m of vals) {
    const w = extremeWeight(m)
    wsum += w
    acc += m * w
  }
  return wsum > 0
    ? acc / wsum
    : vals.reduce((a, b) => a + b, 0) / vals.length
}

// ---- Andamento del mood sull'anno ----
// Tre serie a granularità diversa (giorno / settimana / mese) per il
// grafico, più un riepilogo per mese con i giorni raggruppati a coppie
// (al massimo 16 per mese) per le barrette.

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function daysInMonthOf(year, month /* 0–11 */) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month
  ]
}

// Media semplice ignorando i null; null se non c'è alcun valore noto.
function meanIgnoringNulls(vals) {
  const known = vals.filter((v) => v != null)
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null
}

export function yearWeeklyMood(year, notes) {
  const byDay = new Map() // "mese-giorno" (1-based) -> note[]
  for (const n of notes) {
    const p = parseWall(n.date)
    if (!p || p.y !== year) continue
    const key = `${p.mo}-${p.d}`
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(n)
  }

  const daily = []
  const monthly = []
  for (let mo = 1; mo <= 12; mo++) {
    const dim = daysInMonthOf(year, mo - 1)
    const monthNotes = []
    const groups = [] // coppie di giorni consecutivi: fino a 16 per mese
    for (let d = 1; d <= dim; d += 2) {
      const ns1 = byDay.get(`${mo}-${d}`) || []
      const hasSecond = d + 1 <= dim
      const ns2 = hasSecond ? byDay.get(`${mo}-${d + 1}`) || [] : []
      daily.push(ns1.length ? dayMood(ns1) : null)
      if (hasSecond) daily.push(ns2.length ? dayMood(ns2) : null)
      const pairNotes = [...ns1, ...ns2]
      monthNotes.push(...pairNotes)
      groups.push({
        mood: pairNotes.length ? dayMood(pairNotes) : null,
        count: pairNotes.length,
      })
    }
    monthly.push({
      month: mo - 1,
      count: monthNotes.length,
      mood: monthNotes.length ? dayMood(monthNotes) : null,
      groups,
    })
  }

  // Settimanale: media dei valori giornalieri a blocchi di 7 dal 1° gennaio.
  const weekly = []
  for (let i = 0; i < daily.length; i += 7) {
    weekly.push(meanIgnoringNulls(daily.slice(i, i + 7)))
  }

  const monthlySeries = monthly.map((m) => m.mood)

  return {
    daily,
    weekly,
    monthlySeries,
    monthly,
    hasData: daily.some((v) => v != null),
  }
}
