import PocketBase from 'pocketbase'

const PB_URL_KEY = 'annales.pbUrl'

// Indirizzo di default: quello bundled avviato insieme al frontend
// (docker-compose.yml) o da `npm run dev` in locale, sovrascrivibile in
// fase di build con VITE_PB_URL (vedi .env.example).
export const DEFAULT_PB_URL =
  import.meta.env.VITE_PB_URL?.trim() || 'http://localhost:28090'

// L'utente può puntare l'app a un'altra istanza PocketBase (pagina di
// accesso o Impostazioni) — l'indirizzo scelto vive in localStorage,
// per-dispositivo, e va letto PRIMA di creare il client: serve a sapere con
// chi autenticarsi.
function readPbUrlOverride() {
  try {
    return localStorage.getItem(PB_URL_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function getPbUrl() {
  return readPbUrlOverride() || DEFAULT_PB_URL
}

// Cambia l'indirizzo del server A RUNTIME e lo ricorda per le prossime
// aperture. Un valore vuoto (o uguale al default) torna a quello bundled.
// Non tocca la sessione: chi chiama decide se serve un logout (vedi
// ProfileCard.jsx, dove il server cambia da autenticati).
export function setPbUrl(url) {
  const next = url?.trim() || ''
  try {
    if (next && next !== DEFAULT_PB_URL) localStorage.setItem(PB_URL_KEY, next)
    else localStorage.removeItem(PB_URL_KEY)
  } catch {
    // localStorage non disponibile: vale solo per questa sessione
  }
  pb.baseURL = next || DEFAULT_PB_URL
}

export const pb = new PocketBase(getPbUrl())

// Non annullare automaticamente le richieste duplicate: in React 18/19 con
// StrictMode i doppi mount genererebbero errori "autocancelled" fuorvianti.
pb.autoCancellation(false)

// URL pubblico di un file allegato a un record.
export function fileUrl(record, filename, query = {}) {
  if (!record || !filename) return ''
  return pb.files.getURL(record, filename, query)
}
