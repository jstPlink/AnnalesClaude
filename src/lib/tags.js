import { pb } from './pocketbase'

// Accesso alla collection `tags` di PocketBase: l'elenco locale (curato
// dall'utente in Profilo, o creato al volo dalla nota) dei tag selezionabili
// nelle note. Campo: name.

const COLLECTION = 'tags'

export async function listTags() {
  return pb.collection(COLLECTION).getFullList({ sort: 'name' })
}

export async function createTag(name) {
  return pb.collection(COLLECTION).create({ name: name.trim() })
}

export async function deleteTag(id) {
  return pb.collection(COLLECTION).delete(id)
}
