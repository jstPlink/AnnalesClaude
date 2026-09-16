import { pb } from './pocketbase'

// Accesso alla collection `import_csvs` di PocketBase: la libreria di file
// caricati nella schermata di import (beta), per riprenderli anche da un
// altro dispositivo invece di doverli ricaricare da capo. È per-utente: il
// campo `user` va sempre valorizzato in creazione. Campi: label, content, user.

const COLLECTION = 'import_csvs'

export async function listImportCsvs() {
  return pb.collection(COLLECTION).getFullList({ sort: '-created' })
}

export async function createImportCsv(label, content) {
  return pb.collection(COLLECTION).create({
    label,
    content,
    user: pb.authStore.record?.id,
  })
}

export async function deleteImportCsv(id) {
  return pb.collection(COLLECTION).delete(id)
}
