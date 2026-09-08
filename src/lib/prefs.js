// Preferenze di aspetto dell'app (tema, font, animazioni, sfondo).
// Sono per-dispositivo: salvate in localStorage e applicate come attributi
// data-* sull'elemento <html>, che il CSS in index.css legge.

const THEME_KEY = 'annales.theme'
const FONT_KEY = 'annales.font'
const ANIM_KEY = 'annales.anim'
const PAPER_KEY = 'annales.paper'

export const THEMES = ['system', 'light', 'dark']
export const THEME_LABELS = { system: 'Sistema', light: 'Chiaro', dark: 'Scuro' }

export const FONTS = ['rounded', 'sans', 'serif', 'mono']
export const FONT_LABELS = {
  rounded: 'Tondeggiante',
  sans: 'Lineare',
  serif: 'Serif',
  mono: 'Monospazio',
}

export const ANIMS = ['system', 'on', 'off']
export const ANIM_LABELS = { system: 'Sistema', on: 'Sì', off: 'No' }

export const PAPERS = [
  'nessuna',
  'puntini',
  'rigato',
  'quadretti',
  'grana',
  'margine',
  'lino',
  'vignetta',
]
export const PAPER_LABELS = {
  nessuna: 'Nessuno',
  puntini: 'Puntini',
  rigato: 'Rigato',
  quadretti: 'Quadretti',
  grana: 'Grana',
  margine: 'Margine',
  lino: 'Lino',
  vignetta: 'Vignetta',
}

function read(key, fallback, allowed) {
  try {
    const v = localStorage.getItem(key)
    return allowed.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

export function getTheme() {
  return read(THEME_KEY, 'system', THEMES)
}
export function getFont() {
  return read(FONT_KEY, 'rounded', FONTS)
}
export function getAnim() {
  return read(ANIM_KEY, 'system', ANIMS)
}
export function getPaper() {
  return read(PAPER_KEY, 'nessuna', PAPERS)
}

function prefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}
function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function resolvedTheme() {
  const t = getTheme()
  if (t === 'light' || t === 'dark') return t
  return prefersDark() ? 'dark' : 'light'
}
function resolvedAnim() {
  const a = getAnim()
  if (a === 'on' || a === 'off') return a
  return prefersReducedMotion() ? 'off' : 'on'
}

// Scrive gli attributi su <html>. Chiamata all'avvio e a ogni modifica.
export function applyPrefs() {
  const root = document.documentElement
  const dark = resolvedTheme() === 'dark'
  root.dataset.theme = dark ? 'dark' : 'light'

  const font = getFont()
  if (font === 'rounded') delete root.dataset.font
  else root.dataset.font = font

  root.dataset.anim = resolvedAnim()

  const paper = getPaper()
  if (paper === 'nessuna') delete root.dataset.paper
  else root.dataset.paper = paper

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#211e18' : '#dbd1bd')
}

function setKey(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage non disponibile: la scelta vale solo per questa sessione
  }
  applyPrefs()
}

export function setTheme(v) {
  setKey(THEME_KEY, v)
}
export function setFont(v) {
  setKey(FONT_KEY, v)
}
export function setAnim(v) {
  setKey(ANIM_KEY, v)
}
export function setPaper(v) {
  setKey(PAPER_KEY, v)
}

// In modalità "Sistema", segue i cambi del SO in tempo reale (tema + motion).
export function watchSystemTheme() {
  try {
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    dark.addEventListener('change', () => {
      if (getTheme() === 'system') applyPrefs()
    })
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', () => {
      if (getAnim() === 'system') applyPrefs()
    })
  } catch {
    // matchMedia non disponibile: nessun aggiornamento automatico
  }
}
