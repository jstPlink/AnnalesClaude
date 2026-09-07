import { pb } from './pocketbase'

// Accesso alla collection `people` di PocketBase: l'elenco (curato dall'utente
// in Profilo) delle persone selezionabili nelle note. È per-utente: il campo
// `user` va sempre valorizzato in creazione, altrimenti le regole della
// collection rifiutano il record.
// Campi: name, immichPersonId (foto da Immich), user.

const COLLECTION = 'people'

export async function listPeople() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createPersonFromImmich(immichPerson) {
  return pb.collection(COLLECTION).create({
    name: immichPerson.name,
    immichPersonId: immichPerson.id,
    user: pb.authStore.record?.id,
  })
}

// Persona "locale": solo il nome, nessun collegamento a Immich. Usata quando
// si aggiunge al volo una persona mentre si scrive una nota.
export async function createPerson(name) {
  return pb.collection(COLLECTION).create({
    name: name.trim(),
    user: pb.authStore.record?.id,
  })
}

export async function deletePerson(id) {
  return pb.collection(COLLECTION).delete(id)
}
