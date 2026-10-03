import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useAuth } from '../context/AuthContext'
import { refreshWidget, widgetSupported } from '../lib/widgetSync'

// App Android: tiene aggiornato il widget 3x1 della home (src/lib/widgetSync.js)
// all'apertura e ogni volta che l'app torna in primo piano. I salvataggi lo
// aggiornano a parte (notifyNotesChanged).
export default function WidgetSync() {
  const { isAuthed } = useAuth()

  useEffect(() => {
    if (!isAuthed || !widgetSupported()) return
    refreshWidget()
    const handle = CapApp.addListener('resume', refreshWidget)
    return () => {
      handle.then((h) => h.remove()).catch(() => {})
    }
  }, [isAuthed])

  return null
}
