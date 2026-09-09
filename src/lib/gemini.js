// Integrazione Gemini (Google AI Studio): pulizia/riassunto del testo di una
// nota, analisi delle persone citate, generazione di nuovo contenuto,
// estrazione di note da uno screenshot di vecchio diario.
// Serve solo una API key (Profilo) — nessun OAuth, chiamata REST diretta,
// nessuna libreria necessaria.

import { MONTHS_IT, dayKey } from './dates'
import { plainText } from './notes'

// gemini-2.5-flash è stato ritirato per i nuovi utenti (l'API risponde 404
// indicando questo modello come sostituto): vedi errore riportato dall'utente
// il 2026-09-06.
const MODEL = 'gemini-3.6-flash'

// Bozza del prompt scritto per "Nuova nota con Gemini": salvata in
// localStorage a ogni battitura e cancellata solo alla generazione riuscita.
// Se la chiamata a Gemini fallisce per qualunque motivo (rete, chiave,
// limite di richieste...) il testo scritto non va perso — riaprendo il
// dialog lo si ritrova già lì, senza doverlo riscrivere.
const PROMPT_DRAFT_KEY = 'annales.geminiPromptDraft'

export function loadGeminiPromptDraft() {
  try {
    return localStorage.getItem(PROMPT_DRAFT_KEY) || ''
  } catch {
    return ''
  }
}

export function saveGeminiPromptDraft(text) {
  try {
    if (text) localStorage.setItem(PROMPT_DRAFT_KEY, text)
    else localStorage.removeItem(PROMPT_DRAFT_KEY)
  } catch {
    // localStorage non disponibile: nessun backup possibile, non blocca l'uso
  }
}

export function clearGeminiPromptDraft() {
  saveGeminiPromptDraft('')
}

// Chiamata generica: il chiamante fornisce l'array `parts` completo (testo,
// e/o immagini come { inlineData: { mimeType, data } }).
async function callGeminiParts(apiKey, parts) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    },
  )
  if (!res.ok) {
    let detail = ''
    let retryDelaySeconds = null
    try {
      const data = await res.json()
      detail = data?.error?.message || ''
      // Sui 429 Gemini include spesso un dettaglio RetryInfo con il tempo
      // esatto di attesa consigliato (es. "retryDelay": "38s") — lo usiamo
      // per dare un tempo preciso invece di un generico "riprova tra poco".
      const retryInfo = data?.error?.details?.find((d) =>
        String(d?.['@type'] || '').includes('RetryInfo'),
      )
      const m = String(retryInfo?.retryDelay || '').match(/([\d.]+)\s*s/)
      if (m) retryDelaySeconds = Math.ceil(Number(m[1]))
    } catch {
      // risposta non JSON, ignora
    }
    if (retryDelaySeconds == null) {
      const retryAfter = res.headers.get('retry-after')
      if (retryAfter && !Number.isNaN(Number(retryAfter))) {
        retryDelaySeconds = Math.ceil(Number(retryAfter))
      }
    }
    const err = new Error(detail || 'Richiesta a Gemini non riuscita.')
    err.status = res.status
    err.retryDelaySeconds = retryDelaySeconds
    throw err
  }
  const data = await res.json()
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('Gemini non ha restituito testo.')
  return text
}

async function callGemini(apiKey, prompt) {
  return callGeminiParts(apiKey, [{ text: prompt }])
}

// Verifica rapida della chiave (una richiesta minima).
export async function testGeminiKey(apiKey) {
  await callGemini(apiKey, 'Rispondi con la sola parola: ok.')
}

// Ripulisce/sintetizza il testo esistente di una nota, mantenendone i fatti.
export async function cleanupNoteText(apiKey, text) {
  const prompt =
    "Ripulisci e sintetizza il seguente testo di una nota personale di diario, in italiano: correggi refusi e sgrammaticature, migliora la scorrevolezza, mantieni fatti, senso e tono originali. Non aggiungere informazioni non presenti nel testo. Rispondi SOLO con il testo finale della nota, senza titoli, virgolette o commenti.\n\nTesto:\n" +
    text
  return callGemini(apiKey, prompt)
}

// Scrive un nuovo contenuto di nota a partire da indicazioni dell'utente.
export async function writeNoteText(apiKey, instructions) {
  const prompt =
    'Scrivi il contenuto di una nota personale di diario in italiano, in prima persona, seguendo queste indicazioni. Rispondi SOLO con il testo della nota, senza titoli, virgolette o commenti.\n\nIndicazioni:\n' +
    instructions
  return callGemini(apiKey, prompt)
}

// Ritorna i nomi (presi esattamente da peopleNames) delle persone che
// risultano menzionate o coinvolte nel testo.
export async function analyzePeopleInText(apiKey, text, peopleNames) {
  if (!peopleNames.length) return []
  const prompt =
    "Di seguito trovi il testo di una nota personale di diario e un elenco di persone conosciute dall'autore. Restituisci SOLO un array JSON (nessun altro testo) con i nomi, presi esattamente dall'elenco, delle persone chiaramente menzionate o coinvolte nel testo. Se nessuna corrisponde, restituisci [].\n\n" +
    `Elenco persone: ${JSON.stringify(peopleNames)}\n\n` +
    `Testo:\n${text}`
  const raw = await callGemini(apiKey, prompt)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const arr = JSON.parse(match[0])
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Genera una nota intera (titolo, contenuto, tag/persone tra quelli
// disponibili, luogo, mood e orario stimati) a partire da un prompt libero.
// La nota risultante va sempre rivista dall'utente prima di salvare: qui si
// crea solo una bozza.
export async function draftNoteFromPrompt(
  apiKey,
  prompt,
  { peopleNames = [], tagNames = [], customInstructions = '' } = {},
) {
  const instruction =
    'Da queste indicazioni scritte da un utente, prepara la bozza di una nota personale di diario in italiano, in prima persona. ' +
    'Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, con esattamente questa forma:\n' +
    '{"title": string (breve, poche parole), ' +
    '"content": string (il testo della nota, ripulito e scorrevole, più lungo e articolato delle indicazioni), ' +
    `"tags": array di stringhe prese ESATTAMENTE dall'elenco ${JSON.stringify(tagNames)} se pertinenti, altrimenti [], ` +
    `"people": array di stringhe prese ESATTAMENTE dall'elenco ${JSON.stringify(peopleNames)} se pertinenti, altrimenti [], ` +
    '"place": string col nome del luogo se le indicazioni ne citano uno, altrimenti stringa vuota, ' +
    '"mood": numero tra 0 e 1 che stimi l\'umore raccontato (0 = pessima giornata, 0.5 = neutra, 1 = ottima giornata), dedotto dal tono e dai fatti del testo, ' +
    '"timeStart": stringa "HH:MM" (24 ore) con l\'orario di inizio più plausibile in base alle indicazioni (es. "colazione" ~ mattina presto, "cena" ~ sera); se non è deducibile usa "09:00", ' +
    '"timeEnd": stringa "HH:MM" con l\'orario di fine plausibile, successivo a timeStart di una durata ragionevole per quanto descritto; se non è deducibile usa "10:00"}\n\n' +
    (customInstructions.trim()
      ? `Istruzioni fisse dell'utente su come scrivere le note (rispettale sempre, a meno che non contraddicano il formato JSON richiesto sopra): ${customInstructions.trim()}\n\n`
      : '') +
    `Indicazioni dell'utente:\n${prompt}`
  const raw = await callGemini(apiKey, instruction)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Gemini non ha restituito un risultato valido.')
  let data
  try {
    data = JSON.parse(match[0])
  } catch {
    throw new Error('Gemini non ha restituito un risultato valido.')
  }

  const mood = Number(data.mood)
  let timeStart = TIME_RE.test(data.timeStart) ? data.timeStart : '09:00'
  let timeEnd = TIME_RE.test(data.timeEnd) ? data.timeEnd : '10:00'
  // Se Gemini restituisce un intervallo invertito o nullo, non fidarsi:
  // meglio l'intervallo di default che uno privo di senso.
  if (toMinutes(timeEnd) <= toMinutes(timeStart)) {
    timeStart = '09:00'
    timeEnd = '10:00'
  }

  return {
    title: typeof data.title === 'string' ? data.title.trim() : '',
    content: typeof data.content === 'string' ? data.content.trim() : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((x) => typeof x === 'string') : [],
    people: Array.isArray(data.people)
      ? data.people.filter((x) => typeof x === 'string')
      : [],
    place: typeof data.place === 'string' ? data.place.trim() : '',
    mood: Number.isFinite(mood) ? Math.min(1, Math.max(0, mood)) : 0.5,
    timeStart,
    timeEnd,
  }
}

// Normalizza/valida una nota estratta da Gemini (schermata di import).
function normalizeExtractedNote(n) {
  if (!n || typeof n !== 'object') return null
  const dateOk = typeof n.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(n.date)
  const mood = Number(n.mood)
  const asName = (x) => (typeof x === 'string' ? x.trim() : '')
  return {
    date: dateOk ? n.date : '',
    title: asName(n.title),
    content: asName(n.content),
    mood: Number.isFinite(mood) ? Math.min(1, Math.max(0, mood)) : 0.5,
    timeStart: TIME_RE.test(n.timeStart) ? n.timeStart : '',
    timeEnd: TIME_RE.test(n.timeEnd) ? n.timeEnd : '',
    people: Array.isArray(n.people) ? n.people.map(asName).filter(Boolean) : [],
    place: asName(n.place),
    tags: Array.isArray(n.tags) ? n.tags.map(asName).filter(Boolean) : [],
  }
}

// Estrae una o più note da uno screenshot di un vecchio diario tenuto su un
// foglio di calcolo (una riga = un giorno; nella cella di testo più attività
// con orari; un voto di umore 0–100 per riga). Ogni blocco coerente di
// attività diventa una nota separata, da rivedere prima di salvare.
export async function extractNotesFromImage(
  apiKey,
  { imageBase64, mimeType, year, month, peopleNames = [], tagNames = [] },
) {
  const ref = `${MONTHS_IT[month]} ${year}`
  const instruction =
    "L'immagine è lo screenshot di un vecchio diario tenuto su un foglio di calcolo. " +
    'Ogni RIGA è un giorno e contiene: la lettera del giorno della settimana, il numero del giorno del mese, ' +
    'una cella di testo con righe che iniziano con un orario tipo "04.30" o "17.00 ~", ' +
    'a volte un titolo in una colonna a parte, un voto di umore da 0 a 100, a volte una foto. ' +
    `Il mese di riferimento è ${ref}. ` +
    'Converti OGNI giornata in UNA O PIÙ note separate: raggruppa le righe della cella di testo per attività/blocco ' +
    'coerente (per argomento e continuità di orario) e crea una nota per ciascun blocco. ' +
    'Rispondi SOLO con un array JSON valido, senza testo prima o dopo. Ogni elemento con ESATTAMENTE questi campi: ' +
    '{"date": "YYYY-MM-DD" (mese e anno di riferimento + il numero del giorno della riga), ' +
    '"title": stringa breve (se la riga ha un titolo usalo per il blocco principale, altrimenti sintetizzane uno), ' +
    '"content": stringa col testo del blocco, ripulito ma mantenendo la sequenza oraria (righe "HH.MM ~ ..."), ' +
    '"mood": numero tra 0 e 1 = voto della riga diviso 100; se manca usa 0.5, ' +
    '"timeStart": "HH:MM" dal primo orario del blocco, o "" se assente, ' +
    '"timeEnd": "HH:MM" dall\'ultimo orario del blocco, o "" se assente, ' +
    `"people": array di nomi di persona citati nel blocco; usa ESATTAMENTE i nomi dell'elenco ${JSON.stringify(peopleNames)} quando corrispondono, aggiungi gli altri nomi propri chiaramente citati, ` +
    '"place": stringa col nome del luogo se chiaro dal testo, altrimenti "", ' +
    `"tags": array preso ESATTAMENTE dall'elenco ${JSON.stringify(tagNames)} se pertinente, altrimenti []}. ` +
    'Se una giornata non ha testo, restituisci comunque una nota con "content" vuoto e il mood della riga. ' +
    'Ordina le note per data e orario.'
  const raw = await callGeminiParts(apiKey, [
    { text: instruction },
    { inlineData: { mimeType, data: imageBase64 } },
  ])
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Gemini non ha restituito un risultato valido.')
  let arr
  try {
    arr = JSON.parse(match[0])
  } catch {
    throw new Error('Gemini non ha restituito un risultato valido.')
  }
  if (!Array.isArray(arr)) return []
  return arr.map(normalizeExtractedNote).filter(Boolean)
}

// Recap di un periodo: poche frasi che riassumono un insieme di note.
export async function recapNotes(apiKey, notes, { label = '' } = {}) {
  if (!notes || !notes.length) throw new Error('Nessuna nota nel periodo.')
  const rows = [...notes]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((n) => {
      const d = dayKey(n.date)
      const mood = Math.round(Number(n.mood) * 100)
      const title = (n.title || '').trim()
      const body = plainText(n.content).replace(/\s+/g, ' ').slice(0, 240)
      return `${d} [${mood}] ${title}${body ? ' — ' + body : ''}`
    })
  const prompt =
    `Queste sono le note di diario ${label ? 'del ' + label : 'di un periodo'} ` +
    '(formato: data [mood 0-100] titolo — estratto). ' +
    'Scrivi un recap personale in italiano, rivolto a chi le ha scritte ("hai…", "ti…"), ' +
    "di 4-6 frasi: temi ricorrenti, persone e luoghi che tornano, andamento dell'umore nel " +
    'tempo, due o tre momenti salienti. Tono caldo e sintetico. Rispondi SOLO con il recap, ' +
    'senza titolo né elenchi puntati.\n\n' +
    rows.join('\n')
  return callGemini(apiKey, prompt)
}

// Bozza di nota a partire da un gruppo di foto (thumbnail in base64) di un
// dato giorno. Come draftNoteFromPrompt, ritorna un oggetto da rivedere.
export async function draftNoteFromPhotos(
  apiKey,
  images,
  { dateLabel = '', peopleNames = [], tagNames = [], customInstructions = '' } = {},
) {
  if (!images || !images.length) throw new Error('Nessuna foto selezionata.')
  const instruction =
    `Queste sono le foto scattate ${dateLabel ? 'il ' + dateLabel : 'in un giorno'}. ` +
    'Prepara la bozza di una nota di diario personale in italiano, in prima persona, che ' +
    'racconti quella giornata a partire da ciò che si vede. Rispondi SOLO con un oggetto JSON ' +
    'valido, senza testo prima o dopo, con esattamente questa forma:\n' +
    '{"title": string breve, ' +
    '"content": string (il racconto, scorrevole, qualche frase), ' +
    `"tags": array preso ESATTAMENTE dall'elenco ${JSON.stringify(tagNames)} se pertinente, altrimenti [], ` +
    `"people": array preso ESATTAMENTE dall'elenco ${JSON.stringify(peopleNames)} se riconosci qualcuno, altrimenti [], ` +
    '"place": string col nome del luogo se deducibile dalle foto, altrimenti "", ' +
    '"mood": numero tra 0 e 1 che stima l\'umore della giornata dalle foto, ' +
    '"timeStart": "HH:MM" plausibile, "timeEnd": "HH:MM" plausibile}' +
    (customInstructions.trim()
      ? `\n\nIstruzioni fisse dell'utente su come scrivere le note (rispettale sempre, a meno che non contraddicano il formato JSON richiesto sopra): ${customInstructions.trim()}`
      : '')
  const parts = [
    { text: instruction },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
  ]
  const raw = await callGeminiParts(apiKey, parts)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Gemini non ha restituito un risultato valido.')
  let data
  try {
    data = JSON.parse(match[0])
  } catch {
    throw new Error('Gemini non ha restituito un risultato valido.')
  }
  const mood = Number(data.mood)
  let timeStart = TIME_RE.test(data.timeStart) ? data.timeStart : '09:00'
  let timeEnd = TIME_RE.test(data.timeEnd) ? data.timeEnd : '10:00'
  if (toMinutes(timeEnd) <= toMinutes(timeStart)) {
    timeStart = '09:00'
    timeEnd = '10:00'
  }
  return {
    title: typeof data.title === 'string' ? data.title.trim() : '',
    content: typeof data.content === 'string' ? data.content.trim() : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((x) => typeof x === 'string') : [],
    people: Array.isArray(data.people)
      ? data.people.filter((x) => typeof x === 'string')
      : [],
    place: typeof data.place === 'string' ? data.place.trim() : '',
    mood: Number.isFinite(mood) ? Math.min(1, Math.max(0, mood)) : 0.5,
    timeStart,
    timeEnd,
  }
}

export function describeGeminiError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.status === 400 || err.status === 403) return 'Chiave API Gemini non valida.'
  if (err.status === 429) {
    const s = err.retryDelaySeconds
    if (s != null) {
      const label =
        s >= 60
          ? `${Math.ceil(s / 60)} minut${Math.ceil(s / 60) === 1 ? 'o' : 'i'}`
          : `${s} second${s === 1 ? 'o' : 'i'}`
      return `Limite di richieste Gemini raggiunto, riprova tra circa ${label}.`
    }
    return 'Limite di richieste Gemini raggiunto, riprova tra poco (di solito entro un minuto).'
  }
  if (err.status) return `Errore Gemini (${err.status}): ${err.message}`
  if (err.name === 'TypeError') return 'Impossibile raggiungere Gemini (rete).'
  return err.message || String(err)
}
