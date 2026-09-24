import { useCallback, useEffect, useState } from 'react'
import { offlineStats, clearOfflineCache } from '../lib/cache'
import { prefetchAll } from '../lib/prefetch'
import { useConnection } from '../hooks/useConnection'

function fmtBytes(n) {
  if (n == null) return '—'
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function fmtWhen(ms) {
  if (!ms) return 'mai'
  return new Date(ms).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Impostazioni → Uso offline: quanto spazio occupa la cache locale (note e
// miniature scaricate per usare l'app con poca rete), con aggiornamento e
// svuotamento manuali. Vedi src/lib/cache.js e src/lib/prefetch.js.
export default function OfflineStorage() {
  const conn = useConnection()
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState('')

  const refresh = useCallback(async () => {
    setStats(await offlineStats())
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function update() {
    setBusy('update')
    try {
      await prefetchAll()
    } finally {
      setBusy('')
      refresh()
    }
  }

  async function clear() {
    if (!window.confirm('Svuotare la cache offline? Le note sul server restano intatte; si riscarica al prossimo avvio.')) {
      return
    }
    setBusy('clear')
    try {
      await clearOfflineCache()
    } finally {
      setBusy('')
      refresh()
    }
  }

  const pct =
    stats?.usage != null && stats?.quota ? (stats.usage / stats.quota) * 100 : null

  return (
    <div className="space-y-3 text-xs sm:text-sm">
      <p className="text-ink-soft">
        Note e miniature delle immagini salvate su questo dispositivo, per usare l&apos;app
        anche con poca o nessuna connessione.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-ink-soft">Spazio usato</dt>
        <dd className="font-semibold text-ink">
          {fmtBytes(stats?.usage)}
          {pct != null && (
            <span className="font-normal text-ink-soft">
              {' '}
              ({pct < 0.1 ? '<0,1' : pct.toFixed(1)}% dei {fmtBytes(stats.quota)} disponibili)
            </span>
          )}
        </dd>
        <dt className="text-ink-soft">Note salvate</dt>
        <dd className="font-semibold text-ink">{stats ? stats.notes : '—'}</dd>
        <dt className="text-ink-soft">Miniature</dt>
        <dd className="font-semibold text-ink">{stats ? stats.thumbs : '—'}</dd>
        <dt className="text-ink-soft">Ultimo aggiornamento</dt>
        <dd className="font-semibold text-ink">{fmtWhen(stats?.savedAt || conn.lastSync)}</dd>
      </dl>
      <p className="text-[11px] text-ink-soft">
        Lo spazio è la stima del browser per l&apos;intera app (include anche i file
        dell&apos;app e le modifiche in attesa di sincronizzazione).
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={update}
          disabled={Boolean(busy) || conn.status === 'offline'}
          className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
        >
          {busy === 'update' ? 'Aggiorno…' : 'Aggiorna ora'}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={Boolean(busy)}
          className="flex-1 rounded-full border border-delete-dark bg-delete/15 px-4 py-2 text-xs font-bold text-delete-dark transition disabled:opacity-50"
        >
          {busy === 'clear' ? 'Svuoto…' : 'Svuota cache'}
        </button>
      </div>
    </div>
  )
}
