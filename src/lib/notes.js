import { pb } from './pocketbase'
import { dayKey, timeInputValue, toPbTime } from './dates'

// Accesso alla collection `note` di PocketBase.
// Campi: title, content (Markdown), mood (0–1), date, timeStart, timeEnd,
// images (file multipli).

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

// Campi comuni a create e update (la data è gestita a parte).
function commonFields(data, newFiles = [], removedImages = [], peopleIds = []) {
  const fd = new FormData()
  fd.append('title', data.title ?? '')
  fd.append('content', data.content ?? '')
  fd.append('mood', String(data.mood ?? 0))
  fd.append('timeStart', toPbTime(data.timeStart))
  fd.append('timeEnd', toPbTime(data.timeEnd))
  for (const file of newFiles) fd.append('images', file)
  for (const name of removedImages) fd.append('images-', name)
  if (peopleIds.length) {
    for (const id of peopleIds) fd.append('people', id)
  } else {
    fd.append('people', '')
  }
  return fd
}

export async function createNote(data, newFiles = [], peopleIds = []) {
  const dKey = dayKey(data.dateKey ?? data.date)
  if (!dKey) throw new Error('Data della nota mancante o non valida.')
  const fd = commonFields(data, newFiles, [], peopleIds)
  fd.append('date', dKey)
  return pb.collection(COLLECTION).create(fd)
}

// La data della nota NON viene modificata in aggiornamento: resta quella salvata.
export async function updateNote(id, data, newFiles = [], removedImages = [], peopleIds = []) {
  const fd = commonFields(data, newFiles, removedImages, peopleIds)
  return pb.collection(COLLECTION).update(id, fd)
}

export async function deleteNote(id) {
  return pb.collection(COLLECTION).delete(id)
}

// Elenco note filtrato per intervallo di date e/o intervallo di mood.
// Tutti i parametri sono opzionali: se assenti, nessun vincolo su quel campo.
export async function listNotesFiltered({ start, end, moodMin, moodMax } = {}) {
  const clauses = []
  const params = {}
  if (start) {
    clauses.push('date >= {:start}')
    params.start = start
  }
  if (end) {
    clauses.push('date <= {:end}')
    params.end = end
  }
  if (moodMin != null) {
    clauses.push('mood >= {:moodMin}')
    params.moodMin = moodMin
  }
  if (moodMax != null) {
    clauses.push('mood <= {:moodMax}')
    params.moodMax = moodMax
  }
  const filter = clauses.length ? pb.filter(clauses.join(' && '), params) : ''
  return pb.collection(COLLECTION).getFullList({ filter, sort: 'date' })
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

// Testo semplice dal contenuto HTML della nota (per anteprime e confronti).
export function plainText(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Confronta la nota salvata sul server con quanto inserito nell'editor.
// Ritorna un elenco di problemi (vuoto = tutto ok).
export function checkSavedNote(rec, expected) {
  const problems = []
  const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim()
  const plain = plainText

  if (norm(rec.title) !== norm(expected.title)) {
    problems.push('Il titolo salvato non corrisponde a quello inserito.')
  }
  if (plain(rec.content) !== plain(expected.content)) {
    problems.push('Il contenuto salvato non corrisponde a quello inserito.')
  }
  if (Math.abs(Number(rec.mood) - Number(expected.mood)) > 0.005) {
    problems.push(
      `Il mood salvato (${Number(rec.mood).toFixed(2)}) non corrisponde a quello impostato (${Number(expected.mood).toFixed(2)}).`,
    )
  }
  const savedImgs = (rec.images || []).length
  if (savedImgs !== expected.imageCount) {
    problems.push(
      `Immagini salvate: ${savedImgs} invece di ${expected.imageCount}.`,
    )
  }
  if (expected.peopleCount != null) {
    const savedPeople = (rec.people || []).length
    if (savedPeople !== expected.peopleCount) {
      problems.push(
        `Persone salvate: ${savedPeople} invece di ${expected.peopleCount}.`,
      )
    }
  }
  if (expected.dateKey && dayKey(rec.date) !== expected.dateKey) {
    problems.push(
      rec.date
        ? `La nota è stata salvata con la data ${dayKey(rec.date)} invece di ${expected.dateKey}.`
        : "La nota è stata salvata senza data: non comparirà nell'elenco dei giorni.",
    )
  }
  if (expected.timeStart && timeInputValue(rec.timeStart) !== expected.timeStart) {
    problems.push("L'orario di inizio salvato non corrisponde.")
  }
  if (expected.timeEnd && timeInputValue(rec.timeEnd) !== expected.timeEnd) {
    problems.push("L'orario di fine salvato non corrisponde.")
  }
  return problems
}

// Messaggio d'errore leggibile da un errore del SDK PocketBase.
export function describeError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.isAbort) return 'Richiesta annullata.'
  // Errore di rete / CORS / Cloudflare Access: status 0 e nessuna risposta.
  if (err.status === 0 || err.originalError?.name === 'TypeError') {
    return 'Impossibile raggiungere PocketBase (rete/CORS/Cloudflare Access). Da sistemare lato server.'
  }
  // Errori di validazione: err.response.data = { campo: { message } }
  const data = err.response?.data || err.data
  if (data && typeof data === 'object' && Object.keys(data).length) {
    const parts = Object.entries(data).map(
      ([field, info]) => `${field}: ${info?.message || info}`,
    )
    const head = err.response?.message || 'Dati non validi'
    return `${head} — ${parts.join('; ')}`
  }
  return err.response?.message || err.message || String(err)
}
