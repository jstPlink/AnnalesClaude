import PocketBase from 'pocketbase'

// Indirizzo del database (non configurabile dall'utente):
//  - build di produzione: la STESSA origin da cui è servita l'app (es.
//    annales.fplinio.it) — il container del frontend inoltra /api/ a
//    PocketBase (vedi nginx.conf.template), quindi non c'è nessun URL da
//    configurare;
//  - `npm run dev`: idem, con il proxy di Vite (vite.config.js) verso lo
//    stack Docker locale;
//  - VITE_PB_URL (build time) vince su tutto, per puntare a un backend
//    esterno (vedi .env.example).
const PB_URL = import.meta.env.VITE_PB_URL?.trim() || window.location.origin

// Fino alla v0.60 l'indirizzo si poteva cambiare da login/Impostazioni e restava
// in localStorage: un valore vecchio (es. l'hostname del database rimosso dal
// tunnel) farebbe puntare l'app nel vuoto. Ora l'indirizzo è uno solo, quindi
// il valore salvato si scarta.
try {
  localStorage.removeItem('annales.pbUrl')
} catch {
  // localStorage non disponibile
}

export const pb = new PocketBase(PB_URL)

// Non annullare automaticamente le richieste duplicate: in React 18/19 con
// StrictMode i doppi mount genererebbero errori "autocancelled" fuorvianti.
pb.autoCancellation(false)

// URL pubblico di un file allegato a un record.
export function fileUrl(record, filename, query = {}) {
  if (!record || !filename) return ''
  return pb.files.getURL(record, filename, query)
}
