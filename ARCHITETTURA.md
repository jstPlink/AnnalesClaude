# Annales – Architettura (v0.63.1)

Panoramica tecnica e guida per rispondere alle domande sul progetto. Per l'uso dell'app vedi [docs/GUIDA.md](docs/GUIDA.md); per la
cronologia, `src/lib/changelog.js`; per il deploy, [deploy/README.md](deploy/README.md).

## 1. Cos'è e dove gira

Diario personale come **PWA**: frontend React + backend **PocketBase**. Online su **`annales.fplinio.it`** (un solo hostname, via
Cloudflare Tunnel verso la porta 8973 del NAS). Il database è **interno**: il browser chiama `/api/...` sulla stessa origin dell'app e
nginx inoltra a PocketBase solo gli endpoint che servono all'app.

```
Browser (PWA)  ──/api/──►  nginx (container annales-diario)  ──►  PocketBase 0.28 (container annales-pocketbase)
   React + SDK              serve dist/ + filtra /api/                SQLite nel volume pb_data
                                                                      pb_migrations/ (schema)  pb_hooks/ (recap, cron)
```

## 2. Stack

Vite 8 + React 19 (JavaScript, niente TypeScript) · Tailwind CSS v4 · `vite-plugin-pwa` (service worker, installabile) · SDK
`pocketbase` ^0.28 · React Router 7 · `react-markdown` + `remark-gfm` · lint con `oxlint`. Leaflet è caricato da CDN solo nel selettore
luoghi (`src/lib/leaflet.js`).

## 3. Struttura del codice (`src/`)

| Cartella | Contenuto |
|---|---|
| `App.jsx` | Rotte. `Screen` sceglie la variante **mobile** (`pages/*.jsx`) o **web** (`pages/web/Web*.jsx`) con `useIsWide`; la web ha `DesktopShell` con barra laterale. Tutte le rotte tranne `/login` sono dietro `RequireAuth`. |
| `pages/` | Mobile: `MonthView`, `DayView`, `NoteView`, `DataView` (Andamento), `StatsView`, `FilterView` (Cerca), `Profile` (Impostazioni), `Login`. `pages/web/`: le stesse in versione desktop, più `WebImport`; `MonthPages`/`DayPages` = skin "Pagine" (l'unica rimasta). |
| `components/` | UI condivisa: selettori (`PlacePickerSheet`, `PeoplePickerSheet`, `TagPickerSheet`, `AddSongSheet`, `AddImagesSheet`, `Immich*Picker`), Gemini (`GeminiSheet`, `NewNoteWithGeminiSheet`, `VoiceRecordButton`), `MymapIntegration`, `SettingsSection`, `StatusPills`/`PendingSync`/`OfflineStorage` (offline), `PeriodRecapCard`, `OnThisDay`… `components/web/` = `Sidebar`, `ProfileCard`. |
| `lib/` | Logica senza UI (sotto). |
| `context/` | `AuthContext` (utente corrente = `pb.authStore`, applica il gradiente mood), `NavContext` (mese/anno visibili). |
| `hooks/` | `useIsWide`, `useConnection`. |
| `index.css` | Tutto lo stile "Pagine" (carta, cartoncini, nastri) e i token del tema. |

### `src/lib/`

| File | Ruolo |
|---|---|
| `pocketbase.js` | Istanza `pb`. URL = `VITE_PB_URL` oppure **`window.location.origin`**. Autocancellazione richieste disattivata. |
| `notes.js` | Tutto sulla collection `note` (liste per intervallo, create/update/delete, coda offline, ricerche, `parsePlace`, riassegnazioni di persone/luoghi, conteggi d'uso). |
| `people.js`, `tags.js`, `places.js`, `importCsvs.js`, `recaps.js` | Accesso alle rispettive collection (sempre per-utente: `user` va valorizzato in creazione). |
| `dates.js` | Date "da orologio" (nessun fuso). `toPbTime`, `parseWall`, `dayKey`, `addDaysKey`, etichette italiane. |
| `mood.js` | Mood 0–1, gradiente di colori (personalizzabile, campo `moodGradient` dell'utente). |
| `cache.js`, `prefetch.js`, `offlineQueue.js` | Lettura da cache IndexedDB con aggiornamento in background; precaricamento all'apertura; coda delle scritture offline (`flushQueue` in `notes.js`). |
| `gemini.js` | REST diretta a Gemini con la chiave dell'utente (modello in `MODEL`). Pulizia testo, bozze, estrazione da screenshot, trascrizione vocale, retry su sovraccarico. |
| `immich.js`, `spotify.js`, `mymap.js` | Integrazioni esterne (vedi §5). |
| `integrationDocs.js` | Guide `.md` scaricabili per Immich, Spotify, Gemini, MyMap. |
| `importSheet.js` | Parser dell'export TSV/CSV per Importa → "Da foglio". |
| `stats.js`, `exportData.js`, `prefs.js` (aspetto, per-dispositivo in localStorage), `pagesSkin.js`, `idCard.js`, `haptics.js`, `leaflet.js`, `changelog.js` | Supporto. |

## 4. Backend

Lo schema è **codice**: `pb_migrations/` (fonte di verità), applicato da PocketBase all'avvio del container. Dettagli di versione e
sintassi: PocketBase **0.28.x** (`@request.body.*`, non `@request.data.*`). Gli handler JS dei hook non vedono funzioni dello stesso
file: la logica sta in `pb_hooks/recap_lib.js`, caricata con `require()` dentro ogni handler.

| Collection | Campi principali | Note |
|---|---|---|
| `users` | email, name, avatar + `immichUrl`, `immichApiKey`, `spotifyClientId`, `spotifyClientSecret`, `geminiApiKey`, `geminiCustomInstructions`, `moodGradient` (JSON), `mymapUrl`, `mymapEmail`, `mymapPassword` | Registrazione pubblica aperta; la privacy sta nelle regole per-proprietario. L'utente può eliminare il proprio account. |
| `note` | `title`, `content` (Markdown), `mood` (0–1), `date`, `timeStart`/`timeEnd`, `place` (testo JSON `{name,lat,lon}` o stringa), `songs` (JSON), `images` (file multipli), `people`/`tags` (relation multiple), `user` | **Niente `created`/`updated`**: ordinare per `timeStart` o `date`. |
| `people` | `name`, `immichPersonId`, `tapeColor`, `user` | |
| `tags` | `name`, `user` | |
| `places` | `name`, `lat`, `lon`, `user` | Elenco curato; il campo `place` delle note è un JSON indipendente (non una relazione). |
| `import_csvs` | `label`, `content`, `user` | Libreria dei file caricati in Importa. |
| `recaps` | `period` (`day`/`month`/`year`), `key` (`AAAA-MM-GG`/`AAAA-MM`/`AAAA`), `text`, `user` | Scritti dal server di notte o dal tasto "Genera". |

Regole: tutte le collection sono **per-proprietario** (`user = @request.auth.id`; in creazione il client deve inviare `user`).

**Formati dei campi note (trappole note):**
- `date` = datetime a mezzanotte UTC (`"2026-06-01 00:00:00.000Z"`): si usa solo il prefisso `AAAA-MM-GG`. Per "stessa data ogni anno" il
  filtro è `date ~ "-MM-DD "` (lo spazio finale evita falsi positivi con l'orario).
- `timeStart`/`timeEnd` = solo l'orario, con **data segnaposto `2000-01-01`** (`toPbTime`). Altrimenti l'ordinamento per stringa si rompe.
- In **update** le nuove immagini vanno con la chiave `images+` (senza `+` sostituisce tutta la lista); rimozione con `images-`.

### Hook e cron (`pb_hooks/`)

`main.pb.js` registra: hook su create/update/delete di `note` (cascata sul recap del giorno, e di mese/anno se chiusi) e tre cron —
`dailyRecap` (00:30 ogni notte), `monthlyRecap` (00:50 del giorno 1), `yearlyRecap` (01:10 del 1° gennaio). Usano la chiave Gemini
dell'utente. **Non** recuperano il passato: i periodi chiusi prima della funzione si generano a mano dall'app.

## 5. Integrazioni

| Integrazione | Dove vive la configurazione | Come parla |
|---|---|---|
| **Immich** | `users.immichUrl` / `immichApiKey` | Dal browser verso il server Immich (header `x-api-key`): ricerca foto, miniature, originali, persone. Richiede rete/CORS raggiungibili. |
| **Spotify** | `users.spotifyClientId` / `spotifyClientSecret` | Client Credentials, solo ricerca nel catalogo; fallback oEmbed da link. |
| **Gemini** | `users.geminiApiKey`, `geminiCustomInstructions` | REST diretta dal browser (e dal server per i recap). |
| **MyMap** | `users.mymapUrl` / `mymapEmail` / `mymapPassword` | Il browser fa login sul **PocketBase di MyMap** con un client separato (auth store **in memoria**, per non sovrascrivere la sessione di Annales in localStorage) e legge `points` del giorno. |

### MyMap in dettaglio (`src/lib/mymap.js`, `PlacePickerSheet.jsx`, `MymapIntegration.jsx`)

- MyMap (repo `Github/MyMap`) salva sul server solo **punti grezzi**: collection `points` con `ts` (epoch ms), `lat`, `lon`,
  `accuracy`, regole solo-proprietario. I "posti visitati" li calcola il suo client; `mymap.js` **riporta lo stesso algoritmo**
  (`clean` + `visitPlaces`: sosta ≥ 20 min con punti entro 150 m dal primo, buchi fino a 3 h, soste entro 150 m unite).
- `listMymapVisits(cfg, 'AAAA-MM-GG')` legge i punti del giorno (ora locale del browser), li pulisce e ritorna i posti in ordine
  cronologico. I nomi dati a mano in MyMap sono in `users.settings.names.list` (`[{lat,lon,name}]`, valgono entro 120 m); gli altri si
  cercano su Nominatim (`lookupPlaceName`, una richiesta ogni 1,1 s, cache in memoria). Il centro di un posto è calcolato sul solo
  giorno, quindi il confronto col nome usa 150 m (in MyMap 120 m sul centro globale); a ogni uso si fa `authRefresh` per rileggere
  i nomi aggiornati. Se i nomi non compaiono: "Testa connessione" dice quanti ne trova; con zero, MyMap non li ha sincronizzati nel
  profilo (serve account sul server e impostazioni "Salvate nel profilo").
- Il selettore mostra la scelta Annales/MyMap solo se `mymapConfigFromUser(user)` è completo e non si sta modificando un luogo; la
  sorgente è ricordata in `localStorage` (`annales.placeSource`). I call site passano `mymap` e `dateKey` (NoteView, WebNote, WebImport).
- Perché funzioni il server MyMap deve essere in **HTTPS** e raggiungibile dal browser (CORS di PocketBase è permissivo di default).
- Se manca la migration `1758000017_users_mymap.js` sul server Annales, i campi `mymap*` non esistono: PocketBase ignora in silenzio i
  campi sconosciuti e il salvataggio sembra riuscire senza persistere.

## 6. Sviluppo

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build
```

**Backend in sviluppo.** Il dev server di Vite inoltra `/api/` (proxy in `vite.config.js`) a `VITE_DEV_API`, altrimenti a
`http://localhost:8973` (stack Docker locale: `docker compose up -d --build`). Per sviluppare **contro il database di produzione**
crea `.env.local` (ignorato da git) con:

```
VITE_DEV_API=https://annales.fplinio.it
```

e riavvia `npm run dev` (le variabili si leggono all'avvio). Il browser parla solo con `localhost:5173`, quindi non c'è CORS. **Attenzione:**
in questa modalità si lavora sui **dati veri**: ogni nota creata o modificata dal localhost è in produzione. Lo schema di produzione è
quello dell'ultimo deploy: una nuova migration non esiste finché non pubblichi.

Altre variabili: `VITE_PB_URL` (build time) punta direttamente a un PocketBase esterno invece della stessa origin (vedi `.env.example`).

## 7. Rilascio e deploy

1. **Versione e changelog (solo al commit):** alzare `version` in `package.json` (alimenta `__APP_VERSION__`, mostrato in Impostazioni) e
   aggiungere la voce in testa a `src/lib/changelog.js` (`{ version, date: 'AAAA-MM-GG HH:MM', changes: [...] }`). Patch per fix, minor
   per funzioni, major per rotture. Durante lo sviluppo non si tocca.
2. **Push su `main`** → GitHub Actions (`.github/workflows/docker-publish.yml`) builda e pubblica su GHCR le due immagini
   (`ghcr.io/jstplink/annalesclaude` e `…-pocketbase`, multi-arch).
3. **Sul NAS:** `docker compose pull && docker compose up -d` (o "Ricostruisci" in Container Manager). Le **migration partono
   all'avvio** del container PocketBase.
4. I dati stanno nel volume `pb_data`: sopravvivono ad aggiornamenti e riavvii (si perdono solo con `down -v`).

## 8. Domande frequenti: dove guardare

| Domanda | Dove |
|---|---|
| "Failed to create record" salvando una nota | Hook in `pb_hooks/` (un errore lì blocca il salvataggio: successo con la v0.62.0, corretto nella 0.62.1) e log del container PocketBase. |
| "Something went wrong" al login in locale | Il proxy non raggiunge un backend: `VITE_DEV_API` assente e niente stack su `localhost:8973`. Vedi §6. |
| Una nota non compare / ordine sbagliato | Formato di `date`/`timeStart` (§4); nessun campo `created`. |
| Una nota offline non è partita | Coda in `offlineQueue.js` + linguetta `PendingSync`; `flushQueue` in `notes.js`. |
| Un recap non si genera | Chiave Gemini dell'utente; log `[recap]` del container; il cron non copre il passato. |
| Immich/MyMap "non raggiungibile" | Rete/CORS/HTTPS dal browser; per MyMap anche email/password e che il server abbia la collection `points`. |
| MyMap non propone posti | Nel giorno servono soste ≥ 20 minuti; controlla tracking attivo in MyMap, giorno scelto e il test di connessione (conta i punti). |
| I campi di un'integrazione non si salvano | Migration non ancora deployata sul server (campi assenti su `users`). |
| Aggiornamento non visibile | Service worker: `sw.js`/`index.html` sono `no-cache`; ricarica due volte o svuota la cache; verifica che l'Action sia finita e il NAS abbia fatto `pull`. |
| Build CI bloccata | Il commit `179bd98` ha ritriggerato una build ferma (timeout 6 h su `build-and-push`); rilanciare da Actions → "Run workflow". |
| Come cambio schema | Nuovo file in `pb_migrations/` (prefisso numerico crescente, API jsvm 0.28), poi deploy. Mai modificare i campi a mano dall'admin. |
| Admin UI / superuser | Chiusa da nginx. `docker compose exec pocketbase /pb/pocketbase superuser upsert email password`, oppure pubblica temporaneamente la porta 8090. |

## 9. Punti aperti

- Le credenziali delle integrazioni (API key Immich, Gemini, password MyMap) sono **in chiaro** nel record utente: protette solo dalle
  regole per-proprietario.
- Registrazione pubblica aperta: chiunque raggiunga il sito può creare un account (i dati restano isolati per utente).
- Nessun test automatico: la verifica è manuale + `npm run lint` + `npm run build`.
- Il bundle supera i 500 kB (warning di Vite): nessun code-splitting.
- Leaflet è caricato da CDN (`unpkg.com`): senza internet il selettore luoghi non mostra la mappa.
