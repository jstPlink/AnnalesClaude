import { pb } from './pocketbase'
import { dayKey, toPbTime } from './dates'

// Il campo `people` è testo che contiene un array JSON (es. "[]", '["Jessica"]').
// Fallback: lista separata da virgole.
export function parsePeople(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw !== 'string' || !raw.trim()) return []
  const s = raw.trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean)
    } catch {
      /* niente */
    }
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export function peopleToText(raw) {
  return parsePeople(raw).join(', ')
}

// Accesso alla collection `note` di PocketBase.
// Campi: title, content (Markdown), mood (0–1), date, timeStart, timeEnd,
// images (file multipli), people (testo).

const COLLECTION = 'note'

// Elenco note con `date` nell'intervallo [start, end] (stringhe datetime PB).
export async function listNotesInRange({ start, end }) {
  // La collection non ha i campi autodate `created`/`updated`: ordinare solo
  // per `timeStart` (poi eventualmente lato client).
  return pb.collection(COLLECTION).getFullList({
    filter: pb.filter('date >= {:start} && date <= {:end}', { start, end }),
    sort: 'timeStart',
  })
}

export async function getNote(id) {
  return pb.collection(COLLECTION).getOne(id)
}

function buildFormData(data, newFiles = [], removedImages = []) {
  const fd = new FormData()
  const dKey = dayKey(data.date) || data.date
  fd.append('title', data.title ?? '')
  fd.append('content', data.content ?? '')
  fd.append('mood', String(data.mood ?? 0))
  fd.append('date', dKey)
  fd.append('timeStart', toPbTime(data.timeStart))
  fd.append('timeEnd', toPbTime(data.timeEnd))
  // Coerente con i dati esistenti: array JSON in un campo testo.
  fd.append('people', JSON.stringify(parsePeople(data.people)))
  for (const file of newFiles) fd.append('images', file)
  for (const name of removedImages) fd.append('images-', name)
  return fd
}

export async function createNote(data, newFiles = []) {
  return pb.collection(COLLECTION).create(buildFormData(data, newFiles, []))
}

export async function updateNote(id, data, newFiles = [], removedImages = []) {
  return pb
    .collection(COLLECTION)
    .update(id, buildFormData(data, newFiles, removedImages))
}

export async function deleteNote(id) {
  return pb.collection(COLLECTION).delete(id)
}

// Raggruppa le note per chiave giorno "YYYY-MM-DD".
export function groupByDay(notes) {
  const map = new Map()
  for (const note of notes) {
    const key = dayKey(note.date)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(note)
  }
  return map
}

// Messaggio d'errore leggibile da un errore del SDK PocketBase.
export function describeError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.isAbort) return 'Richiesta annullata.'
  // Errore di rete / CORS / Cloudflare Access: status 0 e nessuna risposta.
  if (err.status === 0 || err.originalError?.name === 'TypeError') {
    return 'Impossibile raggiungere PocketBase (rete/CORS/Cloudflare Access). Da sistemare lato server.'
  }
  return err.response?.message || err.message || String(err)
}
