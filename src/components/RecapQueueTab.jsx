import { useCallback, useEffect, useState } from 'react'
import SideTab from './SideTab'
import { useAuth } from '../context/AuthContext'
import { fetchRecapQueue, jobLabel, onRecapQueuePoke } from '../lib/recapQueue'

const POLL_MS = 15_000

// Linguetta che spiega cosa sta facendo il server dopo aver salvato una nota
// di un giorno passato: i recap (giorno → mese → anno) si rigenerano in
// background, uno per volta e distanziati nel tempo, per non appesantire il
// salvataggio. Compare solo finché c'è qualcosa in coda.
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
      Aggiorno in background il recap del{first ? ` ${jobLabel(first)}` : ''}
      {more > 0 ? ` (e altri ${more} in coda)` : ''}. Lo faccio con calma, una richiesta
      a Gemini alla volta, così salvare le note resta veloce: puoi continuare a usare l&apos;app.
    </SideTab>
  )
}
