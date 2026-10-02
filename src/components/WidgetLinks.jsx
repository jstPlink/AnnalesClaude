import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'

// App Android: gestisce i link aperti dall'esterno (widget della home) e il
// tocco sulle notifiche dei promemoria.
// https://localhost/note/new -> vista mese con la scelta "Con Gemini / A mano".
export default function WidgetLinks() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const open = (raw) => {
      try {
        const url = new URL(raw)
        if (url.pathname === '/note/new') navigate('/', { state: { newNote: Date.now() } })
      } catch {
        /* link non valido: ignora */
      }
    }
    CapApp.getLaunchUrl().then((l) => l?.url && open(l.url)).catch(() => {})
    const handle = CapApp.addListener('appUrlOpen', (e) => open(e.url))
    const notif = LocalNotifications.addListener('localNotificationActionPerformed', () =>
      navigate('/', { state: { newNote: Date.now() } }),
    )
    return () => {
      handle.then((h) => h.remove()).catch(() => {})
      notif.then((h) => h.remove()).catch(() => {})
    }
  }, [navigate])

  return null
}
