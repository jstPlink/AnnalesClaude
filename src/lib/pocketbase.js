import PocketBase from 'pocketbase'

// Istanza PocketBase collegata all'app — di default quella bundled avviata
// insieme al frontend (docker-compose.yml) o da `npm run dev` in locale.
// Sovrascrivibile con VITE_PB_URL (vedi .env.example) per puntare altrove.
export const PB_URL =
  import.meta.env.VITE_PB_URL?.trim() || 'http://localhost:28090'

export const pb = new PocketBase(PB_URL)

// Non annullare automaticamente le richieste duplicate: in React 18/19 con
// StrictMode i doppi mount genererebbero errori "autocancelled" fuorvianti.
pb.autoCancellation(false)

// URL pubblico di un file allegato a un record.
export function fileUrl(record, filename, query = {}) {
  if (!record || !filename) return ''
  return pb.files.getURL(record, filename, query)
}
