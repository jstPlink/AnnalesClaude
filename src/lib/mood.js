import { parseWall } from './dates'

// Gestione del valore `mood` (0–1) e della sua rappresentazione a colori.

// Posizioni fisse degli stop del gradiente del mood (0 = pessimo, 1 = ottimo).
// L'utente può cambiarne i COLORI da Impostazioni → Dati utente (salvati
// sull'account, campo `moodGradient`); le posizioni restano queste.
export const MOOD_STOP_POSITIONS = [0, 0.2, 0.4, 0.6, 0.8, 1]

// Gradiente predefinito, coerente con la palette dell'app:
// rosso corallo (= delete) → arancio → giallo → verde (= save) → blu → blu-viola.
const DEFAULT_STOPS = [
  { t: 0.0, c: [224, 101, 94] }, // #e0655e
  { t: 0.2, c: [231, 154, 77] }, // #e79a4d
  { t: 0.4, c: [230, 207, 92] }, // #e6cf5c
  { t: 0.6, c: [166, 208, 110] }, // #a6d06e
  { t: 0.8, c: [94, 169, 214] }, // #5ea9d6
  { t: 1.0, c: [139, 143, 214] }, // #8b8fd6
]

const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
export function rgbToHex([r, g, b]) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '').trim())
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

export const DEFAULT_MOOD_HEX = DEFAULT_STOPS.map((s) => rgbToHex(s.c))

// Stop attivi: il modulo li tiene in una variabile mutabile così che
// moodColor/moodTextColor (usate ovunque nell'app) riflettano subito il
// gradiente scelto senza dover passare un parametro in decine di componenti.
let STOPS = DEFAULT_STOPS

// Imposta il gradiente da 6 colori esadecimali (nell'ordine delle posizioni
// in MOOD_STOP_POSITIONS). Un valore assente/non valido ripristina il
// gradiente predefinito. Chiamata all'avvio e a ogni salvataggio dal
// contesto di autenticazione (src/context/AuthContext.jsx).
export function setMoodGradient(hexArray) {
  const arr = Array.isArray(hexArray) ? hexArray.map(hexToRgb) : null
  if (!arr || arr.length !== MOOD_STOP_POSITIONS.length || arr.some((c) => !c)) {
    STOPS = DEFAULT_STOPS
    return
  }
  STOPS = arr.map((c, i) => ({ t: MOOD_STOP_POSITIONS[i], c }))
}

// I 6 colori del gradiente attivo, in esadecimale.
export function getMoodGradientHex() {
  return STOPS.map((s) => rgbToHex(s.c))
}

// Stringa CSS `linear-gradient(...)` del gradiente attivo, per le anteprime.
export function moodGradientCss(direction = 'to right') {
  const stops = STOPS.map(
    (s) => `rgb(${s.c[0]}, ${s.c[1]}, ${s.c[2]}) ${Math.round(s.t * 100)}%`,
  )
  return `linear-gradient(${direction}, ${stops.join(', ')})`
}

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

// Opacità del titolo di una nota in base a quanto il mood si allontana dal
// centro scala (0.5, neutro): più il mood è marcato (vicino a 0 o 1), più il
// titolo è leggibile; più è neutro, più sfuma — al posto di nasconderlo del
// tutto sopra/sotto una soglia. Simmetrica per costruzione (si lavora sulla
// distanza assoluta da 0.5, non sul segno). Interpolazione lineare tra i
// punti indicati (in "distanza da 0.5"): 0 → 0.2, 0.1 → 0.4, 0.2 → 0.7,
// 0.3+ → 1 — divario più marcato di prima per rendere la differenza più
// visibile a colpo d'occhio.
const TITLE_OPACITY_STOPS = [
  { d: 0, o: 0.2 },
  { d: 0.1, o: 0.4 },
  { d: 0.2, o: 0.7 },
  { d: 0.3, o: 1 },
]

export function moodTitleOpacity(value) {
  const dist = Math.abs(clamp01(Number(value)) - 0.5)
  const last = TITLE_OPACITY_STOPS[TITLE_OPACITY_STOPS.length - 1]
  if (dist >= last.d) return last.o
  for (let i = 0; i < TITLE_OPACITY_STOPS.length - 1; i++) {
    const lo = TITLE_OPACITY_STOPS[i]
    const hi = TITLE_OPACITY_STOPS[i + 1]
    if (dist >= lo.d && dist <= hi.d) {
      const k = (dist - lo.d) / (hi.d - lo.d)
      return lo.o + (hi.o - lo.o) * k
    }
  }
  return 1
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
// grafico, più un riepilogo per mese con una barretta per ogni giorno.

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
    const groups = [] // una barretta per ogni giorno del mese
    for (let d = 1; d <= dim; d++) {
      const ns = byDay.get(`${mo}-${d}`) || []
      daily.push(ns.length ? dayMood(ns) : null)
      monthNotes.push(...ns)
      groups.push({
        mood: ns.length ? dayMood(ns) : null,
        count: ns.length,
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
