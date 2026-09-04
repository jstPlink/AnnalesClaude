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

export async function deletePerson(id) {
  return pb.collection(COLLECTION).delete(id)
}
