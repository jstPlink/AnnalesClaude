import { pb } from './pocketbase'
import { dayKey, timeInputValue, toPbTime } from './dates'
import {
  enqueue,
  allOps,
  removeOp,
  queuedCount,
  isNetworkError,
} from './offlineQueue'

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

// Conteggio di tutte le note mai scritte (nessun filtro sull'anno): una
// pagina da 1 elemento basta, serve solo `totalItems`.
export async function countAllNotes() {
  const res = await pb.collection(COLLECTION).getList(1, 1, { fields: 'id' })
  return res.totalItems
}

// Il luogo è salvato come JSON { name, lat, lon } dentro il campo testo
// `place` (retrocompatibile: un valore pre-esistente, semplice stringa col
// nome, viene letto come luogo senza coordinate note).
export function parsePlace(raw) {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.name) return p
  } catch {
    // valore pre-esistente: stringa semplice col nome del luogo
  }
  return { name: raw, lat: null, lon: null }
}

function serializePlace(place) {
  if (!place || !place.name) return ''
  return JSON.stringify(place)
}

// Aggiunge al FormData un campo relazione multiplo: sostituisce l'intero
// elenco con quello passato (vuoto incluso, per svuotarlo esplicitamente).
function appendMultiRelation(fd, field, ids) {
  if (ids.length) {
    for (const id of ids) fd.append(field, id)
  } else {
    fd.append(field, '')
  }
}

// Campi comuni a create e update, inclusa la data: modificabile anche dopo
// il primo salvataggio, per correggere note assegnate al giorno sbagliato.
// `appendImages`: in aggiornamento le nuove immagini vanno inviate con la
// chiave `images+` (AGGIUNGI in coda). Senza il `+` PocketBase sostituisce
// l'intera lista file con le sole nuove immagini, cancellando quelle già
// salvate — era la causa del "salva solo le nuove immagini" in modifica.
function commonFields(data, opts) {
  const { newFiles, removedImages, peopleIds, tagIds, appendImages, setUser } =
    opts
  const fd = new FormData()
  fd.append('title', data.title ?? '')
  fd.append('content', data.content ?? '')
  fd.append('mood', String(data.mood ?? 0))
  fd.append('place', serializePlace(data.place))
  fd.append('songs', JSON.stringify(data.songs ?? []))
  fd.append('timeStart', toPbTime(data.timeStart))
  fd.append('timeEnd', toPbTime(data.timeEnd))
  const imagesField = appendImages ? 'images+' : 'images'
  for (const file of newFiles) fd.append(imagesField, file)
  for (const name of removedImages) fd.append('images-', name)
  appendMultiRelation(fd, 'people', peopleIds)
  appendMultiRelation(fd, 'tags', tagIds)
  // Solo in creazione: assegna la nota all'utente loggato (campo `user`).
  // In aggiornamento non si tocca, per non riassegnare note altrui.
  if (setUser && pb.authStore.record?.id) {
    fd.append('user', pb.authStore.record.id)
  }
  const dKey = dayKey(data.dateKey ?? data.date)
  if (!dKey) throw new Error('Data della nota mancante o non valida.')
  fd.append('date', dKey)
  return fd
}

// Esegue `exec`; se fallisce per rete assente mette `op` in coda offline e
// rilancia un errore con `.queued = true`. Con `queue: false` (riproduzione
// della coda) non ri-accoda e propaga l'errore così com'è.
async function runOrQueue(op, exec, queue) {
  try {
    return await exec()
  } catch (err) {
    if (queue && isNetworkError(err) && (await enqueue(op))) {
      const e = new Error(
        'Sei offline: la modifica è in coda e verrà sincronizzata al ritorno online.',
      )
      e.queued = true
      throw e
    }
    throw err
  }
}

export async function createNote(
  data,
  { newFiles = [], peopleIds = [], tagIds = [], queue = true } = {},
) {
  return runOrQueue(
    { kind: 'create', data, newFiles, peopleIds, tagIds },
    () =>
      pb.collection(COLLECTION).create(
        commonFields(data, {
          newFiles,
          removedImages: [],
          peopleIds,
          tagIds,
          appendImages: false,
          setUser: true,
        }),
      ),
    queue,
  )
}

export async function updateNote(
  id,
  data,
  {
    newFiles = [],
    removedImages = [],
    peopleIds = [],
    tagIds = [],
    queue = true,
  } = {},
) {
  return runOrQueue(
    { kind: 'update', id, data, newFiles, removedImages, peopleIds, tagIds },
    () =>
      pb.collection(COLLECTION).update(
        id,
        commonFields(data, {
          newFiles,
          removedImages,
          peopleIds,
          tagIds,
          appendImages: true,
        }),
      ),
    queue,
  )
}

export async function deleteNote(id, { queue = true } = {}) {
  return runOrQueue({ kind: 'delete', id }, () =>
    pb.collection(COLLECTION).delete(id), queue)
}

// Riproduce la coda offline in ordine FIFO. Si ferma appena torna un errore
// di rete (ancora offline); scarta invece un'operazione che fallisce per
// altri motivi (validazione, nota già cancellata) per non bloccare la coda.
export async function flushQueue() {
  if (!pb.authStore.isValid) return { done: 0, left: await queuedCount() }
  const ops = await allOps()
  let done = 0
  for (const op of ops) {
    try {
      if (op.kind === 'create') {
        await createNote(op.data, {
          newFiles: op.newFiles,
          peopleIds: op.peopleIds,
          tagIds: op.tagIds,
          queue: false,
        })
      } else if (op.kind === 'update') {
        await updateNote(op.id, op.data, {
          newFiles: op.newFiles,
          removedImages: op.removedImages,
          peopleIds: op.peopleIds,
          tagIds: op.tagIds,
          queue: false,
        })
      } else if (op.kind === 'delete') {
        try {
          await deleteNote(op.id, { queue: false })
        } catch (e) {
          if (e?.status !== 404) throw e
        }
      }
      await removeOp(op.id)
      done++
    } catch (err) {
      if (isNetworkError(err)) break
      // eslint-disable-next-line no-console
      console.warn('Operazione offline scartata:', op.kind, err)
      await removeOp(op.id)
    }
  }
  return { done, left: await queuedCount() }
}

// Conteggio di quante note coinvolgono ciascuna persona: { personId: n }.
// Serve a mostrare in cima le persone più usate nel selettore.
export async function peopleUsageCounts() {
  const list = await pb.collection(COLLECTION).getFullList({ fields: 'people' })
  const counts = {}
  for (const n of list) {
    for (const id of n.people || []) counts[id] = (counts[id] || 0) + 1
  }
  return counts
}

// Conteggio di quante note usano ciascun luogo, chiave = nome normalizzato
// (minuscolo, come per il confronto in listNotesWithPlace): { nome: n }.
// Serve a mostrare il numero di note collegate in Impostazioni → Luoghi.
export async function placesUsageCounts() {
  const list = await pb.collection(COLLECTION).getFullList({ fields: 'place' })
  const counts = {}
  for (const n of list) {
    const p = parsePlace(n.place)
    if (!p?.name) continue
    const key = p.name.trim().toLowerCase()
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

// Canzoni distinte usate nelle note (deduplicate per titolo, case-
// insensitive) con quante note le collegano ciascuna — { title,
// thumbnailUrl, count }[], le più usate per prime. Come il luogo, una
// canzone non è una relazione ma un JSON per nota (songs:
// [{url, title, thumbnailUrl}]): si aggrega lato client per titolo. Serve a
// mostrare l'elenco in Impostazioni → Canzoni.
export async function songsUsageList() {
  const list = await pb.collection(COLLECTION).getFullList({ fields: 'songs' })
  const byTitle = new Map()
  for (const n of list) {
    for (const s of n.songs || []) {
      const title = s?.title?.trim()
      if (!title) continue
      const key = title.toLowerCase()
      const entry = byTitle.get(key)
      if (entry) {
        entry.count += 1
      } else {
        byTitle.set(key, { title, thumbnailUrl: s.thumbnailUrl || '', count: 1 })
      }
    }
  }
  return [...byTitle.values()].sort(
    (a, b) => b.count - a.count || a.title.localeCompare(b.title),
  )
}

// Luoghi distinti già scritti nelle note (nome + coordinate), deduplicati
// per nome. Serve alla sincronizzazione una tantum con la collection
// `places` (lib/places.js: syncPlacesFromNotes) — le note create prima di
// Impostazioni → Luoghi hanno il loro luogo solo dentro il campo `place`
// della nota, non ancora come voce curata.
export async function listDistinctPlacesFromNotes() {
  const records = await pb.collection(COLLECTION).getFullList({
    filter: 'place != ""',
    fields: 'place',
  })
  const seen = new Set()
  const places = []
  for (const r of records) {
    const p = parsePlace(r.place)
    if (!p?.name) continue
    const key = p.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    places.push(p)
  }
  return places
}

// Note il cui luogo corrisponde (per nome, case-insensitive) al luogo dato
// (record completi di `place`, così da poterlo riscrivere). Usata dalla
// gestione luoghi in Impostazioni per la cascata cancella/sostituisci, come
// già `listNotesWithPerson` per le persone — qui però `place` non è una
// relazione ma un JSON {name,lat,lon} per nota (vedi parsePlace), quindi il
// confronto è sul nome invece che su un id.
export async function listNotesWithPlace(placeName) {
  const key = placeName.trim().toLowerCase()
  const list = await pb
    .collection(COLLECTION)
    .getFullList({ fields: 'id,title,date,place' })
  return list.filter((n) => parsePlace(n.place)?.name?.trim().toLowerCase() === key)
}

// Sostituisce (o rimuove, se `toPlace` è null/assente) il luogo in un
// elenco di note. A differenza di persone/tag il campo non è una relazione
// multipla: si riscrive per intero (una nota ha un solo luogo).
export async function reassignPlaceInNotes(toPlace, notes) {
  const value = toPlace?.name ? serializePlace(toPlace) : ''
  for (const n of notes) {
    await pb.collection(COLLECTION).update(n.id, { place: value })
  }
}

// Note che coinvolgono una data persona (record completi di `people`, così
// da poter riscrivere la relazione senza perdere le altre persone).
export async function listNotesWithPerson(personId) {
  const list = await pb
    .collection(COLLECTION)
    .getFullList({ fields: 'id,title,date,people' })
  return list.filter((n) => (n.people || []).includes(personId))
}

// Sostituisce (o rimuove, se `toId` è null) una persona in un elenco di note.
// La relazione viene riscritta per intero: niente duplicati, le altre
// persone della nota restano intatte.
export async function reassignPersonInNotes(fromId, toId, notes) {
  for (const n of notes) {
    const next = (n.people || []).filter((id) => id !== fromId)
    if (toId && !next.includes(toId)) next.push(toId)
    await pb.collection(COLLECTION).update(n.id, { people: next })
  }
}

// Elenco note filtrato per intervallo di date, intervallo di mood, luogo
// (sottostringa) e/o persone/tag coinvolti (nota inclusa se coinvolge
// ALMENO una delle persone/uno dei tag). Tutti i parametri sono opzionali:
// se assenti, nessun vincolo su quel campo.
//
// Il filtro per persone/tag è applicato lato client (dopo il fetch) invece
// che nella query PocketBase: la sintassi filtro per campi relazione
// multipli si è rivelata inaffidabile da qui, mentre un controllo diretto
// sugli array del record è garantito corretto.
export async function listNotesFiltered({
  start,
  end,
  moodMin,
  moodMax,
  place,
  text,
  personIds,
  tagIds,
  hasSongs,
  hasPlace,
} = {}) {
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
  if (place && place.trim()) {
    clauses.push('place ~ {:place}')
    params.place = place.trim()
  }
  const filter = clauses.length ? pb.filter(clauses.join(' && '), params) : ''
  let list = await pb.collection(COLLECTION).getFullList({ filter, sort: 'date' })
  if (personIds && personIds.length) {
    list = list.filter((n) => (n.people || []).some((id) => personIds.includes(id)))
  }
  if (tagIds && tagIds.length) {
    list = list.filter((n) => (n.tags || []).some((id) => tagIds.includes(id)))
  }
  if (hasSongs) {
    list = list.filter((n) => Array.isArray(n.songs) && n.songs.length > 0)
  }
  if (hasPlace) {
    list = list.filter((n) => Boolean(n.place))
  }
  // Ricerca testo su titolo + contenuto (lato client sul testo semplice: il
  // campo `content` è HTML, un `~` sul server matcherebbe anche i tag).
  if (text && text.trim()) {
    const q = text.trim().toLowerCase()
    list = list.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        plainText(n.content).toLowerCase().includes(q),
    )
  }
  return list
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
  if (expected.tagCount != null) {
    const savedTags = (rec.tags || []).length
    if (savedTags !== expected.tagCount) {
      problems.push(`Tag salvati: ${savedTags} invece di ${expected.tagCount}.`)
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
