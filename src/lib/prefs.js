// Preferenze di aspetto dell'app (tema chiaro/scuro, famiglia font).
// Sono per-dispositivo: salvate in localStorage e applicate come attributi
// data-* sull'elemento <html>, che il CSS in index.css legge.

const THEME_KEY = 'annales.theme'
const FONT_KEY = 'annales.font'

export const THEMES = ['system', 'light', 'dark']
export const THEME_LABELS = {
  system: 'Sistema',
  light: 'Chiaro',
  dark: 'Scuro',
}

export const FONTS = ['rounded', 'sans', 'serif', 'mono']
export const FONT_LABELS = {
  rounded: 'Tondeggiante',
  sans: 'Lineare',
  serif: 'Serif',
  mono: 'Monospazio',
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

function prefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function resolvedTheme() {
  const t = getTheme()
  if (t === 'light' || t === 'dark') return t
  return prefersDark() ? 'dark' : 'light'
}

// Scrive gli attributi su <html>. Chiamata all'avvio e a ogni modifica.
export function applyPrefs() {
  const root = document.documentElement
  const dark = resolvedTheme() === 'dark'
  root.dataset.theme = dark ? 'dark' : 'light'

  const font = getFont()
  if (font === 'rounded') delete root.dataset.font
  else root.dataset.font = font

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#211e18' : '#dbd1bd')
}

export function setTheme(value) {
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch {
    // localStorage non disponibile: la scelta vale solo per questa sessione
  }
  applyPrefs()
}

export function setFont(value) {
  try {
    localStorage.setItem(FONT_KEY, value)
  } catch {
    // idem
  }
  applyPrefs()
}

// In modalità "Sistema", segue il cambio di tema del SO in tempo reale.
export function watchSystemTheme() {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getTheme() === 'system') applyPrefs()
    }
    mq.addEventListener('change', onChange)
  } catch {
    // matchMedia non disponibile: nessun aggiornamento automatico
  }
}
