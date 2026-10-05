// Vocali registrati e NON ancora trascritti, salvati sul dispositivo (IndexedDB)
// così non si perdono se Gemini è sovraccarico o ha finito le richieste, né se
// si chiude il pannello o l'app: si possono ritrascrivere più tardi (vedi
// VoiceRecordButton). Un vocale si cancella da qui appena la trascrizione va a
// buon fine, o a mano dall'utente.

const DB_NAME = 'annales-voice'
const STORE = 'recordings'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const result = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(result?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// Salva un vocale e ne restituisce l'id. Non lancia: se l'archivio non è
// disponibile (navigazione privata...) la registrazione resta comunque in memoria.
export async function saveVoice({ blob, mimeType, seconds }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  try {
    await run('readwrite', (s) => s.put({ id, blob, mimeType, seconds, createdAt: Date.now() }))
    return id
  } catch {
    return null
  }
}

// [{ id, blob, mimeType, seconds, createdAt }], dal più recente
export async function listVoices() {
  try {
    const all = await run('readonly', (s) => s.getAll())
    return (all || []).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export async function deleteVoice(id) {
  if (!id) return
  try {
    await run('readwrite', (s) => s.delete(id))
  } catch {
    /* già assente o archivio non disponibile */
  }
}
