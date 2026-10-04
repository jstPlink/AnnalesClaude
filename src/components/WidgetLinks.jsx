import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'

// App Android: gestisce i link aperti dall'esterno (widget della home) e il
// tocco sulle notifiche dei promemoria.
// https://localhost/note/new -> vista mese con la scelta "Con Gemini / A mano".
// Widget 3x1: /dati (mood della settimana) e /day/AAAA-MM-GG (ultima nota)
// aprono quelle viste.

// L'indirizzo con cui l'app è stata AVVIATA (getLaunchUrl) resta lo stesso per
// tutta la vita del processo: va gestito UNA volta sola. Prima lo si
// rileggeva a ogni cambio di pagina (l'effetto si rieseguiva perché `navigate`
// cambia identità a ogni rotta), quindi dopo aver generato una nota con Gemini
// — appena la pagina cambiava — l'app tornava alla scelta "Gemini / a mano"
// (o a Andamento / al giorno, con gli altri tasti del widget).
let launchUrlHandled = false

export default function WidgetLinks() {
  const navigate = useNavigate()
  // sempre l'ultimo `navigate`, senza dover riregistrare i listener a ogni rotta
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const go = (...args) => navigateRef.current(...args)
    const open = (raw) => {
      try {
        const url = new URL(raw)
        if (url.pathname === '/note/new') go('/', { state: { newNote: Date.now() } })
        else if (url.pathname === '/dati' || /^\/day\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)) go(url.pathname)
      } catch {
        /* link non valido: ignora */
      }
    }
    if (!launchUrlHandled) {
      launchUrlHandled = true
      CapApp.getLaunchUrl().then((l) => l?.url && open(l.url)).catch(() => {})
    }
    const handle = CapApp.addListener('appUrlOpen', (e) => open(e.url))
    const notif = LocalNotifications.addListener('localNotificationActionPerformed', () =>
      go('/', { state: { newNote: Date.now() } }),
    )
    return () => {
      handle.then((h) => h.remove()).catch(() => {})
      notif.then((h) => h.remove()).catch(() => {})
    }
  }, [])

  return null
}
