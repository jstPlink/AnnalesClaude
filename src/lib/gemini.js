// Integrazione Gemini (Google AI Studio): pulizia/riassunto del testo di una
// nota, analisi delle persone citate, generazione di nuovo contenuto.
// Serve solo una API key (Profilo) — nessun OAuth, chiamata REST diretta,
// nessuna libreria necessaria.

const MODEL = 'gemini-2.5-flash'

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

export function describeGeminiError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.status === 400 || err.status === 403) return 'Chiave API Gemini non valida.'
  if (err.status === 429) return 'Limite di richieste Gemini raggiunto, riprova tra poco.'
  if (err.status) return `Errore Gemini (${err.status}): ${err.message}`
  if (err.name === 'TypeError') return 'Impossibile raggiungere Gemini (rete).'
  return err.message || String(err)
}
