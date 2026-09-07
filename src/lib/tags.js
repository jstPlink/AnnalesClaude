import { pb } from './pocketbase'

// Accesso alla collection `tags` di PocketBase: l'elenco (curato dall'utente
// in Profilo, o creato al volo dalla nota) dei tag selezionabili nelle note.
// È per-utente: il campo `user` va sempre valorizzato in creazione.
// Campi: name, user.

const COLLECTION = 'tags'

export async function listTags() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createTag(name) {
  return pb.collection(COLLECTION).create({
    name: name.trim(),
    user: pb.authStore.record?.id,
  })
}

export async function deleteTag(id) {
  return pb.collection(COLLECTION).delete(id)
}
