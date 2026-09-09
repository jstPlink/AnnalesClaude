// Preferenze di aspetto dell'app (tema, font, animazioni, sfondo).
// Sono per-dispositivo: salvate in localStorage e applicate come attributi
// data-* sull'elemento <html>, che il CSS in index.css legge.

const THEME_KEY = 'annales.theme'
const FONT_KEY = 'annales.font'
const ANIM_KEY = 'annales.anim'
const PAPER_KEY = 'annales.paper'
const SKIN_DAY_KEY = 'annales.skinDay'
const SKIN_MONTH_KEY = 'annales.skinMonth'

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

// Skin per pagina: temi grafici alternativi applicati a una singola vista.
// "sketch" = diario disegnato a mano sulla vista giorno (web + mobile).
// "board" = bacheca collage sulla vista mese (solo web).
export const SKIN_DAYS = ['plain', 'sketch']
export const SKIN_DAY_LABELS = { plain: 'Normale', sketch: 'Disegnata' }
export const SKIN_MONTHS = ['plain', 'board']
export const SKIN_MONTH_LABELS = { plain: 'Normale', board: 'Bacheca' }

function read(key, fallback, allowed) {
  try {
    const v = localStorage.getItem(key)
    return allowed.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

export function getTheme() {
  return read(THEME_KEY, 'light', THEMES)
}
export function getFont() {
  return read(FONT_KEY, 'rounded', FONTS)
}
export function getAnim() {
  return read(ANIM_KEY, 'on', ANIMS)
}
export function getPaper() {
  return read(PAPER_KEY, 'rigato', PAPERS)
}
export function getSkinDay() {
  return read(SKIN_DAY_KEY, 'plain', SKIN_DAYS)
}
export function getSkinMonth() {
  return read(SKIN_MONTH_KEY, 'plain', SKIN_MONTHS)
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

  const skinDay = getSkinDay()
  if (skinDay === 'plain') delete root.dataset.skinDay
  else root.dataset.skinDay = skinDay

  const skinMonth = getSkinMonth()
  if (skinMonth === 'plain') delete root.dataset.skinMonth
  else root.dataset.skinMonth = skinMonth

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
export function setSkinDay(v) {
  setKey(SKIN_DAY_KEY, v)
}
export function setSkinMonth(v) {
  setKey(SKIN_MONTH_KEY, v)
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
