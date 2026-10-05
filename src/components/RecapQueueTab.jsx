import { useCallback, useEffect, useState } from 'react'
import SideTab from './SideTab'
import { useAuth } from '../context/AuthContext'
import { fetchRecapQueue, jobLabel, onRecapQueuePoke } from '../lib/recapQueue'

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

  const [first] = queue.items
  const more = queue.total - 1
  return (
    <SideTab icon="sparkles" tone="paper" badge={queue.total}>
      Stasera alle 23:00 aggiorno il recap del{first ? ` ${jobLabel(first)}` : ''}
      {more > 0 ? ` (e di altri ${more} ${more === 1 ? 'giorno' : 'giorni'})` : ''}, poi
      quello del mese e dell&apos;anno. Li preparo tutti insieme in blocco, così salvare le
      note resta veloce.
    </SideTab>
  )
}
