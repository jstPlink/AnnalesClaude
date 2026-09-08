import { useCallback, useEffect, useState } from 'react'
import { queuedCount, onQueueChange } from '../lib/offlineQueue'
import { flushQueue } from '../lib/notes'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

// Pillola fissa che compare quando ci sono modifiche in coda offline: mostra
// il conteggio e permette di forzare la sincronizzazione. Prova a sincronizzare
// da sola al login e a ogni evento `online`.
export default function PendingSync() {
  const { isAuthed } = useAuth()
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    queuedCount()
      .then(setCount)
      .catch(() => {})
  }, [])

  const flush = useCallback(async () => {
    if (busy || !isAuthed) return
    setBusy(true)
    try {
      await flushQueue()
    } catch {
      // riproveremo al prossimo evento online
    } finally {
      setBusy(false)
      refresh()
    }
  }, [busy, isAuthed, refresh])

  useEffect(() => {
    refresh()
    return onQueueChange(refresh)
  }, [refresh])

  useEffect(() => {
    if (!isAuthed) return
    flush()
    const onOnline = () => flush()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={flush}
      className="anim-drop fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-warn-dark bg-warn px-3 py-1.5 text-xs font-bold text-ink shadow-lg"
    >
      <Icon name="cloud" size={14} className="shrink-0" />
      {busy ? 'Sincronizzo…' : `${count} in attesa · sincronizza`}
    </button>
  )
}
