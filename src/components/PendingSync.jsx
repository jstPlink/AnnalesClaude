import { useCallback, useEffect, useState } from 'react'
import { queuedCount, onQueueChange } from '../lib/offlineQueue'
import { flushQueue } from '../lib/notes'
import { useAuth } from '../context/AuthContext'
import SideTab from './SideTab'

// Linguetta laterale (posizionata da StatusPills.jsx) che compare quando ci sono modifiche in coda offline: mostra
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
    <SideTab
      icon="cloud"
      badge={count}
      actionLabel="Sincronizza ora"
      onAction={flush}
      busy={busy}
    >
      {busy
        ? 'Sincronizzo…'
        : `${count} ${count === 1 ? 'nota in attesa' : 'note in attesa'} di sincronizzazione: create o modificate senza rete, si caricano appena la connessione lo permette.`}
    </SideTab>
  )
}
