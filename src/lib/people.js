import { pb } from './pocketbase'

// Accesso alla collection `people` di PocketBase: l'elenco locale (curato
// dall'utente in Profilo) delle persone selezionabili nelle note.
// Campi: name, immichPersonId (per recuperare la foto da Immich).

const COLLECTION = 'people'

export async function listPeople() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createPersonFromImmich(immichPerson) {
  return pb.collection(COLLECTION).create({
    name: immichPerson.name,
    immichPersonId: immichPerson.id,
  })
}

// Persona "locale": solo il nome, nessun collegamento a Immich. Usata quando
// si aggiunge al volo una persona mentre si scrive una nota.
export async function createPerson(name) {
  return pb.collection(COLLECTION).create({ name: name.trim() })
}

export async function deletePerson(id) {
  return pb.collection(COLLECTION).delete(id)
}
