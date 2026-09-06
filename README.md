# Annales — Diario personale (PWA)

Diario personale come Progressive Web App: funziona da browser desktop e si
installa su smartphone (manifest + service worker). Tre schermate principali —
**mese → giorno → nota** — collegate a un backend **PocketBase**.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) (JavaScript)
- [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) — installabile su mobile
- [PocketBase JS SDK](https://github.com/pocketbase/js-sdk) (`pocketbase`)
- [React Router](https://reactrouter.com/) per la navigazione
- [`react-markdown`](https://github.com/remarkjs/react-markdown) + `remark-gfm`
  per rendere il contenuto delle note (Markdown)

## Avvio in locale

Prerequisiti: **Node.js 20+** e npm.

```bash
npm install
npm run dev
```

L'app parte su `http://localhost:5173`. La prima schermata è il **login**
(autenticazione utenti PocketBase, collection `users`).

Altri comandi:

```bash
npm run build     # build di produzione in dist/
npm run preview   # serve la build (utile per testare la PWA installabile)
npm run lint      # oxlint
npm run icons     # rigenera le icone PWA da scripts/icon-source.svg
```

## Fai girare la TUA istanza (il tuo diario, il tuo database)

Chiunque può avere il proprio Annales privato, con dati suoi e non condivisi
con nessun altro: **un solo comando** avvia sia il backend PocketBase (con lo
schema — collection `note`/`people`/`tags` e i campi delle integrazioni su
`users` — creato automaticamente al primo avvio dalle migration in
[`pb_migrations/`](pb_migrations)) sia il frontend.

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

Poi apri `http://localhost:8973` e usa **"Crea il tuo diario personale"**
nella schermata di login: è una registrazione normale, non serve toccare
PocketBase a mano. Il primo account che crei è il tuo, isolato in questa
istanza (un'istanza = un database SQLite tutto suo, nel volume Docker
`pb_data`).

Per metterla online con un dominio tuo (Cloudflare Tunnel, reverse proxy...),
rifai la build puntando `VITE_PB_URL` all'indirizzo **pubblico** con cui si
raggiungerà PocketBase (il frontend gira nel browser di chi usa l'app, quindi
non può usare un nome host interno a Docker):

```bash
VITE_PB_URL=https://pb.tuodominio.it docker compose -f docker-compose.selfhost.yml up -d --build
```

> La versione di PocketBase è pinnata (`PB_VERSION` in
> [`pocketbase.Dockerfile`](pocketbase.Dockerfile)) alla stessa serie 0.28.x
> del pacchetto `pocketbase` in `package.json`. Aggiornandone uno, aggiorna
> anche l'altro.

Questo è distinto dal flusso sotto (`docker-compose.yml`): quello presume un
PocketBase **già esistente altrove** (com'è per l'istanza dell'autore, su
`pocketbase.fplinio.it`) e builda solo il frontend.

Per accedere all'**admin UI di PocketBase** (`http://localhost:8090/_/`, utile
per ispezionare i dati o intervenire a mano) serve un account superuser, che
l'app stessa non crea mai: va creato una volta sola da riga di comando:

```bash
docker compose -f docker-compose.selfhost.yml exec pocketbase \
  /pb/pocketbase superuser upsert admin@tuodominio.it "una-password-lunga"
```

## Docker

L'app è statica (build Vite servita da nginx con fallback SPA). Immagine
multi-stage: `node:22-alpine` per la build, `nginx:1.27-alpine` per servire.

### Build ed esecuzione con compose

```bash
docker compose up -d --build      # build immagine + avvio
# app su http://<host>:8973  (porta host modificabile in docker-compose.yml)
docker compose down               # stop
```

### Oppure con docker puro

```bash
docker build -t annales-diario:latest .
docker run -d --name annales-diario -p 8973:80 --restart unless-stopped annales-diario:latest
```

### Backend PocketBase

`VITE_PB_URL` viene **inlined a build time** (default
`https://pocketbase.fplinio.it`). Per puntare altrove va ricostruita l'immagine:

```bash
docker build --build-arg VITE_PB_URL=https://pocketbase.example.com -t annales-diario:latest .
# con compose:  VITE_PB_URL=https://pocketbase.example.com docker compose up -d --build
```

### Deploy sul NAS (immagine pre-buildata)

Modo consigliato: GitHub Actions builda e pubblica l'immagine su GHCR, il NAS
la scarica ed esegue — nessun sorgente né build sul NAS.

- Workflow: [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
  (push su `main` → `ghcr.io/jstplink/annalesclaude:latest`, multi-arch amd64/arm64).
- Compose per il NAS: [`deploy/docker-compose.yaml`](deploy/docker-compose.yaml).
- Istruzioni passo-passo: [`deploy/README.md`](deploy/README.md).

Il container espone solo HTTP sulla porta 80: metterlo dietro il reverse proxy
del NAS (o Cloudflare Tunnel) per HTTPS.

> Se la build su Alpine dovesse fallire per binari nativi (rollup/lightningcss),
> cambiare `node:22-alpine` in `node:22-slim` nel `Dockerfile`.

## Configurazione backend

Istanza PocketBase usata di default: `https://pocketbase.fplinio.it`
(endpoint note: `/api/collections/note/records`).

Per puntare a un'altra istanza in locale, copia `.env.example` in `.env` e
imposta `VITE_PB_URL`.

### Collection `note`

Schema definito come codice in [`pb_migrations/`](pb_migrations) — quella è la
fonte di verità; qui un riepilogo:

| Campo       | Tipo               | Note                                          |
| ----------- | ------------------ | ---------------------------------------------- |
| `title`     | testo               | titolo della nota                              |
| `content`   | testo               | corpo (HTML dall'editor rich text)             |
| `mood`      | numero (0–1)        | umore                                          |
| `date`      | data                | giorno a cui è assegnata la nota               |
| `timeStart` | data                | solo l'orario è significativo (vedi `lib/dates.js`) |
| `timeEnd`   | data                | solo l'orario è significativo                  |
| `place`     | testo               | JSON `{name, lat, lon}` (vedi `parsePlace`)     |
| `songs`     | json                | array `{url, title, thumbnailUrl}`             |
| `images`    | file (multipli)     | immagini allegate                              |
| `people`    | relation (multipla) | → collection `people`                          |
| `tags`      | relation (multipla) | → collection `tags`                            |

`people` e `tags` sono collection separate (`name`, più `immichPersonId` su
`people`); `users` ha in più `immichUrl`, `immichApiKey`, `spotifyClientId`,
`spotifyClientSecret`, `geminiApiKey` (tutte opzionali, impostabili da Profilo).

### CORS / Cloudflare Access

Il browser deve poter chiamare `https://pocketbase.fplinio.it` da
`http://localhost:5173`. Se in sviluppo compaiono errori di rete sulle chiamate
API (status 0, CORS, o challenge di Cloudflare Access), **è una configurazione
lato server** (CORS di PocketBase / policy Cloudflare), non un problema del
codice dell'app. L'app in quel caso mostra un messaggio d'errore esplicito.

## Comportamento delle schermate

- **Login** — email + password, `pb.collection('users').authWithPassword`.
  Sessione persistita in `localStorage`; le rotte sono protette.
- **Vista mensile** (`/`) — pillola anno (tap → cambio anno rapido), nome mese in
  italiano, **navigazione tra mesi via swipe** (o frecce ← → da tastiera). Una
  riga per ogni giorno con almeno una nota: numero + giorno abbreviato (rosso nei
  weekend), barra verticale con la **media dei mood** (gradiente rosso→bianco),
  titoli delle note con `mood > 0.675`, carosello automatico delle immagini del
  giorno. Tap su una riga → vista giornaliera. Footer: solo il pulsante in basso
  a destra è attivo (nuova nota con data odierna).
- **Vista giornaliera** (`/day/:date`) — note del giorno ordinate per orario;
  l'altezza di ogni blocco è **proporzionale alla durata** (`timeEnd - timeStart`)
  sulle 24 ore. Tap su una nota → vista nota in modifica. Footer: nuova nota in
  quel giorno.
- **Vista nota** (`/note/new?date=YYYY-MM-DD` o `/note/:id`) — orari inizio/fine
  editabili, pillola anno/data (anno modificabile), slider `mood`, titolo, editor
  Markdown con anteprima, persone, immagini. Pulsante in alto a destra:
  **verde** = salva (nota nuova o con modifiche), **rosso** = elimina (nota
  esistente non modificata). Footer: solo "aggiungi immagini" è attivo.

## Struttura

```
src/
  lib/         pocketbase.js, notes.js (API collection note), dates.js, mood.js
  context/     AuthContext.jsx
  components/  PhoneShell, Footer, YearPill, MoodBar, MoodSlider,
               ImageCarousel, CircleButton, Icon, RequireAuth
  pages/       Login, MonthView, DayView, NoteView
scripts/       generate-icons.js (+ icon-source.svg)
```

## Non incluso (fasi successive)

APK nativo; HTTPS/reverse proxy (demandato all'infrastruttura del NAS).
