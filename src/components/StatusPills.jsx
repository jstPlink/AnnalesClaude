import { useEffect } from 'react'
import PendingSync from './PendingSync'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'
import { useConnection } from '../hooks/useConnection'
import { prefetchAll } from '../lib/prefetch'

function hhmm(ms) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Pillole fisse in alto (una sotto l'altra): connessione debole/assente e
// modifiche in coda offline. Qui parte anche il precaricamento della cache
// (note, persone, tag, luoghi, miniature) all'apertura e a ogni ritorno
// della rete — vedi src/lib/prefetch.js.
export default function StatusPills() {
  const { isAuthed } = useAuth()
  const conn = useConnection()

  useEffect(() => {
    if (!isAuthed) return
    prefetchAll()
    const onOnline = () => prefetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [isAuthed])

  const offline = conn.status === 'offline'

  return (
    <div className="pointer-events-none fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex max-w-[calc(100vw-16px)] -translate-x-1/2 flex-col items-center gap-1.5">
      <PendingSync />
      {isAuthed && conn.status !== 'ok' && (
        <button
          type="button"
          onClick={prefetchAll}
          title="Riprova ad aggiornare"
          className="anim-drop pointer-events-auto flex items-center gap-2 rounded-full border border-warn-dark bg-warn px-3 py-1.5 text-left text-xs font-bold leading-tight text-ink shadow-lg"
        >
          <Icon name="cloud" size={14} className="shrink-0" />
          <span>
            {offline ? 'Offline' : 'Connessione debole'} · i dati potrebbero non essere
            aggiornati
            {conn.lastSync ? ` (ultimo aggiornamento ${hhmm(conn.lastSync)})` : ''}
          </span>
        </button>
      )}
    </div>
  )
}
