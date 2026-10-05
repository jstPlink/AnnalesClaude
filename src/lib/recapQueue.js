// Recap segnati da aggiornare (collection `recap_jobs`, scritta solo dal
// server — vedi pb_hooks/recap_lib.js): il server li rigenera tutti in blocco
// ogni sera alle 23:00. Serve a far vedere in app cosa è in attesa dopo aver
// salvato una nota (src/components/RecapQueueTab.jsx).
import { pb } from './pocketbase'
import { MONTHS_IT, dayMonthLabel } from './dates'

const POKE_EVENT = 'annales:recap-queue-poke'

// Da chiamare dopo aver salvato una nota: fa ricontrollare subito la coda
// (con un attimo di respiro, il tempo che l'hook del server la riempia).
export function pokeRecapQueue(delayMs = 1500) {
  setTimeout(() => window.dispatchEvent(new Event(POKE_EVENT)), delayMs)
}

export function onRecapQueuePoke(fn) {
  window.addEventListener(POKE_EVENT, fn)
  return () => window.removeEventListener(POKE_EVENT, fn)
}

export function jobLabel(job) {
  if (job.period === 'day') return `il giorno ${dayMonthLabel(job.key)}`
  if (job.period === 'month') {
    const [y, m] = job.key.split('-')
    return `il mese di ${MONTHS_IT[Number(m) - 1]} ${y}`
  }
  return `l'anno ${job.key}`
}

// { total, items: [{period, key}] } — vuota anche se la collection non
// esiste ancora (server non aggiornato) o la rete manca.
export async function fetchRecapQueue() {
  try {
    // Solo i giorni: per ogni giorno modificato sono segnati anche mese e anno,
    // ma contarli tutti darebbe tre voci per una sola nota.
    const res = await pb.collection('recap_jobs').getList(1, 3, {
      filter: 'period = "day"',
      sort: 'queuedAt',
      skipTotal: false,
    })
    return { total: res.totalItems, items: res.items }
  } catch {
    return { total: 0, items: [] }
  }
}
