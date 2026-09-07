// Piccole guide scaricabili su come ottenere i token/credenziali delle
// integrazioni. Il testo è Markdown; viene scaricato come file .md dal
// pulsante "Come ottenere il token" nelle Impostazioni (web e mobile).

const GEMINI = `# Chiave API Gemini (Google AI Studio)

A cosa serve in Annales: ripulire e sintetizzare il testo delle note,
riconoscere le persone citate, generare bozze di note, ed estrarre note da
uno screenshot nella schermata "Importa da immagine".

## Come ottenerla

1. Apri https://aistudio.google.com/app/apikey e accedi con un account Google.
2. Premi "Create API key" (o "Crea chiave API").
3. Scegli un progetto Google Cloud esistente oppure lascia che ne crei uno nuovo.
4. Copia la chiave: è una stringa che inizia con "AIza...".
5. In Annales: Impostazioni -> Integrazioni -> Gemini -> incolla la chiave e premi Salva.
   Usa "Testa connessione" per verificare che funzioni.

## Note

- L'uso di base dei modelli Gemini via API ha un piano gratuito con limiti di
  richieste al minuto/giorno; oltre quei limiti servono le fatturazioni Google Cloud.
- La chiave e' personale: chiunque la possieda puo' consumare la tua quota.
  Non condividerla e non pubblicarla.
- Per revocarla o crearne un'altra torna sulla stessa pagina di Google AI Studio.
`

const SPOTIFY = `# Credenziali Spotify (Client ID e Client Secret)

A cosa servono in Annales: cercare i brani per titolo/artista e recuperarne
copertina e link quando aggiungi una canzone a una nota. Vengono usate solo
per la ricerca pubblica del catalogo: nessun accesso al tuo account, ai tuoi
ascolti o alle tue playlist.

## Come ottenerle

1. Apri https://developer.spotify.com/dashboard e accedi con il tuo account Spotify.
2. Premi "Create app".
3. Compila nome e descrizione a piacere (es. "Annales diario").
4. Come "Redirect URI" puoi mettere un valore qualsiasi, ad esempio
   http://localhost:5173 : con il flusso "Client Credentials" non viene usato.
5. Accetta i termini e crea l'app.
6. Nella pagina dell'app apri "Settings": lì trovi il "Client ID" e, cliccando
   "View client secret", il "Client Secret".
7. In Annales: Impostazioni -> Integrazioni -> Spotify -> incolla entrambi i
   valori e premi Salva. Usa "Testa connessione" per verificare.

## Note

- Il Client Secret e' una password: tienilo privato.
- Se lo rigeneri dalla dashboard, ricordati di aggiornarlo anche in Annales.
`

const IMMICH = `# Collegamento a Immich (URL server + API key)

A cosa serve in Annales: scegliere le foto direttamente dal tuo Immich quando
aggiungi immagini a una nota, e usare i volti riconosciuti da Immich come
elenco di persone.

Prerequisito: devi gia' avere un'istanza Immich funzionante e raggiungibile
dal dispositivo su cui usi Annales (stessa rete, VPN, o esposta su internet).

## URL server

E' l'indirizzo con cui apri Immich nel browser, comprensivo di http:// o
https:// e, se presente, della porta. Esempi:
- https://immich.tuodominio.it
- http://192.168.1.20:2283

## API key

1. Apri Immich nel browser e accedi.
2. Clicca sul tuo avatar in alto a destra -> "Account Settings"
   (Impostazioni account).
3. Apri la sezione "API Keys".
4. Premi "New API Key", dai un nome (es. "Annales") e conferma.
5. Copia subito la chiave mostrata: non sara' piu' visibile per intero dopo.
6. In Annales: Impostazioni -> Integrazioni -> Immich -> incolla URL e API key
   e premi Salva. Usa "Testa connessione" per verificare.

## Note

- L'API key da' accesso in lettura alle tue foto tramite l'API di Immich:
  tienila privata.
- Puoi revocarla in qualsiasi momento dalla stessa pagina "API Keys" di Immich.
- Se Annales non raggiunge il server, il problema e' quasi sempre di rete
  (URL sbagliato, server non esposto, HTTPS con certificato non valido).
`

export const INTEGRATION_DOCS = {
  gemini: { filename: 'annales-gemini-token.md', body: GEMINI },
  spotify: { filename: 'annales-spotify-credenziali.md', body: SPOTIFY },
  immich: { filename: 'annales-immich-collegamento.md', body: IMMICH },
}

// Scarica una stringa come file di testo (client-side, nessun server).
export function downloadTextFile(
  filename,
  text,
  mime = 'text/markdown;charset=utf-8',
) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Comodo: scarica la guida di una specifica integrazione.
export function downloadIntegrationDoc(key) {
  const doc = INTEGRATION_DOCS[key]
  if (doc) downloadTextFile(doc.filename, doc.body)
}
