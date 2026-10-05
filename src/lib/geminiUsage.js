// Contatore delle richieste a Gemini fatte da QUESTO dispositivo.
//
// L'API di Gemini non dice quante richieste restano: la quota (richieste al
// minuto e al giorno, per chiave e per modello) si vede solo nella console di
// Google AI Studio. Qui si contano quindi le richieste partite dall'app e si
// confrontano con i limiti che l'utente copia da AI Studio (Impostazioni →
// Gemini). Non include le richieste del server (recap delle 23:00) né quelle
// di altri dispositivi con la stessa chiave: il conteggio è una stima per
// difetto.

const LOG_KEY = 'annales.geminiLog'
const LIMITS_KEY = 'annales.geminiLimits'
const EVENT = 'annales:gemini-usage'
const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const MAX_ENTRIES = 3000

function readLog() {
  try {
    const list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// Registra una richiesta che ha raggiunto il server di Gemini (qualunque esito
// HTTP; gli errori di rete non contano). `status` = codice HTTP.
export function logGeminiRequest(status) {
  const now = Date.now()
  const list = readLog().filter((e) => now - e.t < DAY_MS)
  list.push({ t: now, s: status })
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-MAX_ENTRIES)))
  } catch {
    /* storage non disponibile: il conteggio salta */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function onGeminiUsageChange(fn) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

// { minute, hour, day, rejected } — richieste negli ultimi 60 s / 60 min / 24 h
// e quante di queste sono state respinte per limite raggiunto (429).
export function getGeminiUsage() {
  const now = Date.now()
  const out = { minute: 0, hour: 0, day: 0, rejected: 0 }
  for (const e of readLog()) {
    const age = now - e.t
    if (age >= DAY_MS) continue
    out.day++
    if (age < HOUR_MS) out.hour++
    if (age < MINUTE_MS) out.minute++
    if (e.s === 429) out.rejected++
  }
  return out
}

// { perMinute, perDay } — 0 = non impostato
export function getGeminiLimits() {
  try {
    const l = JSON.parse(localStorage.getItem(LIMITS_KEY) || '{}')
    return {
      perMinute: Math.max(0, Number(l.perMinute) || 0),
      perDay: Math.max(0, Number(l.perDay) || 0),
    }
  } catch {
    return { perMinute: 0, perDay: 0 }
  }
}

export function setGeminiLimits({ perMinute, perDay }) {
  try {
    localStorage.setItem(
      LIMITS_KEY,
      JSON.stringify({
        perMinute: Math.max(0, Math.floor(Number(perMinute) || 0)),
        perDay: Math.max(0, Math.floor(Number(perDay) || 0)),
      }),
    )
  } catch {
    /* la scelta vale solo per questa sessione */
  }
  window.dispatchEvent(new Event(EVENT))
}
