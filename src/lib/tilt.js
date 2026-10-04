import { getTilt } from './prefs'

// Foto che oscillano a destra e a sinistra seguendo l'inclinazione del
// telefono (giroscopio/sensori di movimento): le polaroid delle viste mese e
// giorno sono attaccate al foglio con il nastro, quindi dondolano attorno al
// bordo alto. Si legge `deviceorientation.gamma` (inclinazione laterale, da
// −90° a +90°), la si ammorbidisce con un filtro passa-basso e la si applica
// come rotazione aggiuntiva (proprietà CSS `rotate`, che si compone con il
// `transform: rotate(...)` già presente sulle foto, senza toccarlo).
//
// Si aggiornano direttamente gli elementi delle foto (pochi), invece di una
// variabile CSS sulla radice: cambiarla a 60 volte al secondo ricalcolerebbe lo
// stile di tutta la pagina. Android non richiede nessun permesso per questi
// sensori (solo quelli ad alta frequenza, oltre 200 Hz, che qui non servono).

const SELECTOR = '.mp-pola, .dn-pola, .mp-pola-mobile, .dn-pola-mobile'
const MAX_DEG = 6 // oscillazione massima ai due lati
const GAIN = -0.22 // gradi di foto per grado di inclinazione (negativo: la foto pende verso il basso del telefono, come un pendolo)
const SMOOTH = 0.14 // 0–1: più basso = più morbido/lento

let running = false
let target = 0
let current = 0
let raf = 0
let els = []
let lastQuery = 0

function animationsOn() {
  return document.documentElement.dataset.anim !== 'off'
}

function clearStyles() {
  for (const el of els) {
    el.style.rotate = ''
    el.style.transformOrigin = ''
  }
  els = []
}

function frame(now) {
  raf = 0
  current += (target - current) * SMOOTH
  // telefono in piano: le foto tornano esattamente com'erano (senza resti di rotazione né di perno)
  if (Math.abs(target) < 0.03 && Math.abs(current) < 0.03) {
    current = 0
    clearStyles()
    return
  }
  if (now - lastQuery > 400) {
    els = [...document.querySelectorAll(SELECTOR)]
    lastQuery = now
  }
  els.forEach((el, i) => {
    // ogni foto un po' diversa dalle altre, così non si muovono "in blocco"
    const k = 0.85 + ((i * 37) % 30) / 100
    el.style.transformOrigin = '50% 0'
    el.style.rotate = (current * k).toFixed(2) + 'deg'
  })
  if (running && Math.abs(target - current) > 0.02) raf = requestAnimationFrame(frame)
}

function onOrientation(e) {
  if (e.gamma == null || !animationsOn()) return
  const t = Math.max(-MAX_DEG, Math.min(MAX_DEG, e.gamma * GAIN))
  target = t
  if (!raf) raf = requestAnimationFrame(frame)
}

export function startTilt() {
  if (running || typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return
  running = true
  window.addEventListener('deviceorientation', onOrientation, { passive: true })
}

export function stopTilt() {
  if (!running) return
  running = false
  window.removeEventListener('deviceorientation', onOrientation)
  cancelAnimationFrame(raf)
  raf = 0
  target = 0
  current = 0
  clearStyles()
}

// Accende o spegne in base alla preferenza (Impostazioni → Permessi) e alle animazioni.
export function syncTilt() {
  if (getTilt() && animationsOn()) startTilt()
  else stopTilt()
}
