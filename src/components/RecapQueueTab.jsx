import { useCallback, useEffect, useState } from 'react'
import SideTab from './SideTab'
import { useAuth } from '../context/AuthContext'
import { fetchRecapQueue, jobShortLabel, onRecapQueuePoke } from '../lib/recapQueue'

const POLL_MS = 60_000

// Linguetta che avvisa dei recap in attesa: dopo aver salvato una nota, i recap
// toccati (giorno → mese → anno) sono segnati da aggiornare e il server li
// rigenera tutti in blocco alle 23:00. Compare solo finché c'è qualcosa in coda.
export default function RecapQueueTab() {
  const { isAuthed } = useAuth()
  const [queue, setQueue] = useState({ total: 0, items: [] })

  const refresh = useCallback(async () => {
    setQueue(await fetchRecapQueue())
  }, [])

  // all'avvio, e quando una nota viene salvata (pokeRecapQueue)
  useEffect(() => {
    if (!isAuthed) return
    const first = setTimeout(refresh, 0)
    const off = onRecapQueuePoke(refresh)
    return () => {
      clearTimeout(first)
      off()
    }
  }, [isAuthed, refresh])

  // finché c'è coda, controlla ogni tanto fino a svuotarla
  useEffect(() => {
    if (!isAuthed || !queue.total) return
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [isAuthed, queue.total, refresh])

  if (!isAuthed || !queue.total) return null

  const GROUPS = [
    ['day', 'Giorni'],
    ['month', 'Mesi'],
    ['year', 'Anni'],
  ]
  return (
    <SideTab
      icon="sparkles"
      tone="paper"
      badge={queue.total}
      body={
        <div className="mx-2.5 mb-2.5 max-h-[40vh] overflow-y-auto text-xs text-ink">
          {GROUPS.map(([period, title]) => {
            const list = queue.items.filter((j) => j.period === period)
            if (!list.length) return null
            return (
              <div key={period} className="mb-1.5">
                <p className="font-extrabold">{title}</p>
                <ul className="ml-3 list-disc">
                  {list.map((j) => (
                    <li key={j.id}>{jobShortLabel(j)}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      }
    >
      Aggiornamento recap alle 23.00
    </SideTab>
  )
}
