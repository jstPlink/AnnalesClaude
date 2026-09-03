import PocketBase from 'pocketbase'

// Istanza PocketBase pubblica del progetto.
// Sovrascrivibile in locale con VITE_PB_URL (vedi .env.example).
export const PB_URL =
  import.meta.env.VITE_PB_URL?.trim() || 'https://pocketbase.fplinio.it'

export const pb = new PocketBase(PB_URL)

// Non annullare automaticamente le richieste duplicate: in React 18/19 con
// StrictMode i doppi mount genererebbero errori "autocancelled" fuorvianti.
pb.autoCancellation(false)

// URL pubblico di un file allegato a un record.
export function fileUrl(record, filename, query = {}) {
  if (!record || !filename) return ''
  return pb.files.getURL(record, filename, query)
}
