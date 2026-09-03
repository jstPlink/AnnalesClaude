// Gestione del valore `mood` (0–1) e della sua rappresentazione a colori.

// Soglia oltre la quale il titolo di una nota viene elencato nella vista mensile.
export const MOOD_TITLE_THRESHOLD = 0.675

// Stop del gradiente, equamente distribuiti da 0 a 1:
// rosso → arancione → giallo → verde → blu → bianco.
const STOPS = [
  { t: 0.0, c: [226, 59, 46] },
  { t: 0.2, c: [240, 140, 30] },
  { t: 0.4, c: [242, 208, 36] },
  { t: 0.6, c: [87, 192, 74] },
  { t: 0.8, c: [63, 123, 216] },
  { t: 1.0, c: [255, 255, 255] },
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
  return 'rgb(255, 255, 255)'
}

// Media dei mood di un elenco di note (ignora i valori non numerici).
export function averageMood(notes) {
  const vals = notes
    .map((n) => Number(n.mood))
    .filter((n) => !Number.isNaN(n))
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
