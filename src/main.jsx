import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { applyPrefs, watchSystemTheme } from './lib/prefs'
import { installAudioUnlock } from './lib/sounds'

// Tema e font scelti dall'utente: applicati subito, prima del render.
applyPrefs()
watchSystemTheme()
installAudioUnlock()

// Aggiorna il service worker in background quando c'è una nuova versione.
// Nell'app Android (Capacitor) i file sono già dentro l'APK: niente service worker.
if (!Capacitor.isNativePlatform()) registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
