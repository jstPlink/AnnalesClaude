// Integrazione Gemini (Google AI Studio): pulizia/riassunto del testo di una
// nota, analisi delle persone citate, generazione di nuovo contenuto.
// Serve solo una API key (Profilo) — nessun OAuth, chiamata REST diretta,
// nessuna libreria necessaria.

// gemini-2.5-flash è stato ritirato per i nuovi utenti (l'API risponde 404
// indicando questo modello come sostituto): vedi errore riportato dall'utente
// il 2026-09-06.
const MODEL = 'gemini-3.6-flash'

async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error?.message || ''
    } catch {
      // risposta non JSON, ignora
    }
    const err = new Error(detail || 'Richiesta a Gemini non riuscita.')
    err.status = res.status
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
export async function draftNoteFromPrompt(apiKey, prompt, { peopleNames = [], tagNames = [] } = {}) {
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

export function describeGeminiError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.status === 400 || err.status === 403) return 'Chiave API Gemini non valida.'
  if (err.status === 429) return 'Limite di richieste Gemini raggiunto, riprova tra poco.'
  if (err.status) return `Errore Gemini (${err.status}): ${err.message}`
  if (err.name === 'TypeError') return 'Impossibile raggiungere Gemini (rete).'
  return err.message || String(err)
}
