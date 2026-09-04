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

// Colore CSS per un singolo valore di mood.
export function moodColor(value) {
  const v = clamp01(Number(value))
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
  const v = clamp01(Number(value))
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

// ---- Andamento del mood sull'anno (4 "settimane" per mese) ----

function weekIndexOfDay(day) {
  if (day <= 7) return 0
  if (day <= 14) return 1
  if (day <= 21) return 2
  return 3
}

// Riempie i null SOLO tra due valori noti (niente estrapolazione alle estremità).
function interpolateNulls(arr) {
  const known = arr
    .map((v, i) => (v == null ? null : { i, v }))
    .filter(Boolean)
  if (!known.length) return null
  const first = known[0].i
  const last = known[known.length - 1].i
  const out = arr.slice()
  for (let i = first; i <= last; i++) {
    if (out[i] != null) continue
    let lo = null
    let hi = null
    for (const k of known) {
      if (k.i <= i) lo = k
      if (k.i >= i && hi == null) hi = k
    }
    const t = (i - lo.i) / (hi.i - lo.i)
    out[i] = lo.v + (hi.v - lo.v) * t
  }
  return out
}

// Media mobile con finestra ±r (ignora i null; null se la finestra è vuota).
function movingAvg(arr, r) {
  return arr.map((v, i) => {
    if (v == null) return null
    let sum = 0
    let n = 0
    for (let j = Math.max(0, i - r); j <= Math.min(arr.length - 1, i + r); j++) {
      if (arr[j] == null) continue
      sum += arr[j]
      n++
    }
    return n ? sum / n : null
  })
}

// Per un anno: 48 valori settimanali (12 mesi × 4 settimane) più le versioni
// interpolata / lisciata / di tendenza, e un riepilogo per mese.
export function yearWeeklyMood(year, notes) {
  const buckets = Array.from({ length: 48 }, () => [])
  for (const n of notes) {
    const p = parseWall(n.date)
    if (!p || p.y !== year) continue
    buckets[(p.mo - 1) * 4 + weekIndexOfDay(p.d)].push(n)
  }

  const raw = buckets.map((ns) => (ns.length ? dayMood(ns) : null))
  const counts = buckets.map((ns) => ns.length)
  const filled = interpolateNulls(raw)
  const smooth = filled ? movingAvg(filled, 2) : null
  const trend = smooth ? movingAvg(smooth, 4) : null

  const points = raw.map((mood, i) => ({
    i,
    month: Math.floor(i / 4),
    week: i % 4,
    t: (i + 0.5) / 48,
    mood,
    count: counts[i],
  }))

  const monthly = Array.from({ length: 12 }, (_, mo) => {
    const ns = buckets.slice(mo * 4, mo * 4 + 4).flat()
    return {
      month: mo,
      count: ns.length,
      mood: ns.length ? dayMood(ns) : null,
      weeks: [0, 1, 2, 3].map((wk) => ({
        week: wk,
        mood: raw[mo * 4 + wk],
        count: counts[mo * 4 + wk],
      })),
    }
  })

  return {
    points,
    filled,
    smooth,
    trend,
    monthly,
    hasData: filled != null,
  }
}
