import { pb } from './pocketbase'
import { colorForName } from './pagesSkin'

// Accesso alla collection `people` di PocketBase: l'elenco (curato dall'utente
// in Profilo) delle persone selezionabili nelle note. È per-utente: il campo
// `user` va sempre valorizzato in creazione, altrimenti le regole della
// collection rifiutano il record.
// Campi: name, immichPersonId (foto da Immich), user, tapeColor (colore della
// targhetta nella skin "Pagine", calcolato dal nome alla creazione — vedi
// src/lib/pagesSkin.js: colorForName/personTapeColor — "nascosto", non
// mostrato in nessuna UI).

const COLLECTION = 'people'

export async function listPeople() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createPersonFromImmich(immichPerson) {
  return pb.collection(COLLECTION).create({
    name: immichPerson.name,
    immichPersonId: immichPerson.id,
    user: pb.authStore.record?.id,
    tapeColor: colorForName(immichPerson.name),
  })
}

// Persona "locale": solo il nome, nessun collegamento a Immich. Usata quando
// si aggiunge al volo una persona mentre si scrive una nota.
export async function createPerson(name) {
  const trimmed = name.trim()
  return pb.collection(COLLECTION).create({
    name: trimmed,
    user: pb.authStore.record?.id,
    tapeColor: colorForName(trimmed),
  })
}

export async function deletePerson(id) {
  return pb.collection(COLLECTION).delete(id)
}

// Le `limit` persone più frequenti (per numero di note in `counts`, poi
// alfabetico), più quelle in `keepIds` anche se fuori dai primi `limit`
// (così una persona già selezionata non sparisce dall'elenco).
export function topByUsage(people, counts, keepIds = [], limit = 10) {
  const c = counts || {}
  const sorted = [...people].sort((a, b) => {
    const d = (c[b.id] || 0) - (c[a.id] || 0)
    return d !== 0 ? d : a.name.localeCompare(b.name)
  })
  const top = sorted.slice(0, limit)
  const ids = new Set(top.map((p) => p.id))
  const kept = new Set(keepIds)
  return top.concat(sorted.filter((p) => kept.has(p.id) && !ids.has(p.id)))
}
