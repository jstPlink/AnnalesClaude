import PocketBase from 'pocketbase'
import { getBackend } from './backend'
import { createLocalClient } from './localPocketBase'

// Client dei dati. Dove puntano lo decide l'utente (src/lib/backend.js):
//  - modalità "server": l'indirizzo scelto al primo avvio, nessun valore nel
//    codice;
//  - modalità "locale": un client con la stessa interfaccia ma che salva
//    tutto in questo dispositivo (src/lib/localPocketBase.js).
// Cambiare scelta = tornare alla schermata iniziale e ricaricare l'app.
// Questo modulo si carica solo dopo la scelta (vedi main.jsx).
const backend = getBackend()

export const isLocal = backend?.mode === 'local'
export const serverUrl = backend?.mode === 'server' ? backend.url : ''

export const pb = isLocal ? createLocalClient() : new PocketBase(serverUrl)

// Non annullare automaticamente le richieste duplicate: in React 18/19 con
// StrictMode i doppi mount genererebbero errori "autocancelled" fuorvianti.
if (!isLocal) pb.autoCancellation(false)

// Da attendere prima di montare l'app: in modalità locale carica i dati.
export const backendReady = isLocal ? pb.ready : Promise.resolve()

// URL pubblico di un file allegato a un record.
export function fileUrl(record, filename, query = {}) {
  if (!record || !filename) return ''
  return pb.files.getURL(record, filename, query)
}
