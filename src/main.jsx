import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { applyPrefs, watchSystemTheme } from './lib/prefs'

// Tema e font scelti dall'utente: applicati subito, prima del render.
applyPrefs()
watchSystemTheme()

// Aggiorna il service worker in background quando c'è una nuova versione.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
