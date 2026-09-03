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

## Configurazione backend

Istanza PocketBase usata di default: `https://pocketbase.fplinio.it`
(endpoint note: `/api/collections/note/records`).

Per puntare a un'altra istanza in locale, copia `.env.example` in `.env` e
imposta `VITE_PB_URL`.

### Collection `note`

| Campo       | Tipo              | Note                                  |
| ----------- | ----------------- | ------------------------------------- |
| `title`     | testo             | titolo della nota                     |
| `content`   | testo             | corpo in **Markdown**                 |
| `mood`      | numero (0–1)      | umore                                 |
| `date`      | data              | giorno a cui è assegnata la nota      |
| `timeStart` | data/ora          | inizio attività                       |
| `timeEnd`   | data/ora          | fine attività                         |
| `images`    | file (multipli)   | immagini allegate                     |
| `people`    | testo             | persone coinvolte (inviato come testo)|

> **Nota su `people`:** l'app lo tratta come campo **testo**. Se sul backend
> fosse una `relation`, il salvataggio va adattato.

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

Docker, deploy sul NAS, APK nativo.
