import { pb } from './pocketbase'
import { listDistinctPlacesFromNotes } from './notes'

// Accesso alla collection `places` di PocketBase: l'elenco (curato
// dall'utente in Impostazioni, o creato al volo scegliendo un luogo su una
// nota tramite PlacePickerSheet) dei luoghi selezionabili nelle note. È
// per-utente: il campo `user` va sempre valorizzato in creazione.
// Campi: name, lat, lon, user.
//
// NB: il campo `place` di ogni nota resta un JSON {name,lat,lon}
// indipendente (non una relazione a questa collection) — vedi
// lib/notes.js: parsePlace, listNotesWithPlace, reassignPlaceInNotes.

const COLLECTION = 'places'

export async function listPlaces() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createPlace(place) {
  return pb.collection(COLLECTION).create({
    name: place.name.trim(),
    lat: place.lat ?? null,
    lon: place.lon ?? null,
    user: pb.authStore.record?.id,
  })
}

export async function deletePlace(id) {
  return pb.collection(COLLECTION).delete(id)
}

// Crea il luogo in `places` se non esiste già uno con lo stesso nome
// (case-insensitive) per l'utente corrente. Usata quando si aggiunge un
// luogo a una nota: finisce anche nell'elenco gestibile da Impostazioni,
// senza doverlo ricreare a mano.
export async function upsertPlaceIfMissing(place, existing) {
  if (!place?.name) return null
  const key = place.name.trim().toLowerCase()
  const already = existing.find((p) => p.name.trim().toLowerCase() === key)
  if (already) return already
  return createPlace(place)
}

// Sincronizzazione una tantum: crea in `places` i luoghi già scritti in
// note esistenti (create prima che questa collection esistesse, o comunque
// non passate da PlacePickerSheet) ma non ancora presenti come voce curata.
// Ritorna l'elenco aggiornato e quanti ne ha creati di nuovi.
export async function syncPlacesFromNotes(existingPlaces) {
  const fromNotes = await listDistinctPlacesFromNotes()
  const result = [...existingPlaces]
  let created = 0
  for (const place of fromNotes) {
    const key = place.name.trim().toLowerCase()
    if (result.some((p) => p.name.trim().toLowerCase() === key)) continue
    const rec = await createPlace(place)
    result.push(rec)
    created += 1
  }
  result.sort((a, b) => a.name.localeCompare(b.name))
  return { places: result, created }
}
