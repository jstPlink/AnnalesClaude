# Annales – Architettura (v0.66.0)

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
| `components/` | UI condivisa: selettori (`PlacePickerSheet`, `PeoplePickerSheet`, `TagPickerSheet`, `AddSongSheet`, `AddImagesSheet`, `Immich*Picker`), Gemini (`GeminiSheet`, `NewNoteWithGeminiSheet`, `VoiceRecordButton`), `MymapIntegration`, `SettingsSection`, `StatusPills` + `SideTab` (linguette sul bordo destro: `PendingSync`, `RecapQueueTab`, `DraftsTab`, connessione), `OfflineStorage` (offline), `PeriodRecapCard`, `OnThisDay`… `components/web/` = `Sidebar`, `ProfileCard`. |
| `lib/` | Logica senza UI (sotto). |
| `context/` | `AuthContext` (utente corrente = `pb.authStore`, applica il gradiente mood), `NavContext` (mese/anno visibili). |
| `hooks/` | `useIsWide`, `useConnection`, `useAutoDraft` (salva da sola la bozza di una nuova nota). |
| `index.css` | Tutto lo stile "Pagine" (carta, cartoncini, nastri) e i token del tema. |

### `src/lib/`

| File | Ruolo |
|---|---|
| `pocketbase.js` | Istanza `pb`. URL = `VITE_PB_URL` oppure **`window.location.origin`**. Autocancellazione richieste disattivata. |
| `notes.js` | Tutto sulla collection `note` (liste per intervallo, create/update/delete, coda offline, ricerche, `parsePlace`, riassegnazioni di persone/luoghi, conteggi d'uso). |
| `people.js`, `tags.js`, `places.js`, `importCsvs.js`, `recaps.js` | Accesso alle rispettive collection (sempre per-utente: `user` va valorizzato in creazione). |
| `drafts.js` | Bozze delle note nuove lasciate a metà: `localStorage` per-utente (`annales.noteDrafts:<id>`), massimo 30. Le immagini non si conservano (solo il conteggio). Alimentano la linguetta `DraftsTab`; ripresa con `navigate('/note/new', { state: { aiDraft, draftId } })`. |
| `recapQueue.js` | Legge la coda `recap_jobs` (solo lettura) e `pokeRecapQueue()` (da chiamare dopo un salvataggio) per la linguetta `RecapQueueTab`. |
| `permissions.js` | Permessi per Impostazioni → Permessi (`PermissionsSettings.jsx`): nell'app Android legge lo stato vero dal plugin nativo `AppPermissions`; nel browser usa la Permissions API (sola lettura). |
| `widgetSync.js` | Riepilogo per il widget 3×1 della home (solo app Android): mood giornaliero degli ultimi 14 giorni + ultima nota + gradiente del mood, passati al plugin nativo `AnnalesWidget`. `refreshWidget()` all'avvio e al ritorno in primo piano (`WidgetSync.jsx`), `notifyNotesChanged()` dopo ogni salvataggio/eliminazione. |
| `audio.js` | `blobToWav`: ripiego per la dettatura, ricodifica la registrazione in WAV 16 kHz se Gemini rifiuta WebM/MP4. |
| `dates.js` | Date "da orologio" (nessun fuso). `toPbTime`, `parseWall`, `dayKey`, `addDaysKey`, etichette italiane. |
| `mood.js` | Mood 0–1, gradiente di colori (personalizzabile, campo `moodGradient` dell'utente). |
| `cache.js`, `prefetch.js`, `offlineQueue.js` | Lettura da cache IndexedDB con aggiornamento in background; precaricamento all'apertura; coda delle scritture offline (`flushQueue` in `notes.js`). |
| `gemini.js` | REST diretta a Gemini con la chiave dell'utente (modello in `MODEL`). Pulizia testo, bozze, estrazione da screenshot, trascrizione vocale, retry su sovraccarico. |
| `immich.js`, `spotify.js`, `mymap.js` | Integrazioni esterne (vedi §5). |
| `integrationDocs.js` | Guide `.md` scaricabili per Immich, Spotify, Gemini, MyMap. |
| `importSheet.js` | Parser dell'export TSV/CSV per Importa → "Da foglio". |
| `reminders.js` | Promemoria "nota del giorno" come notifiche locali Capacitor (solo app Android); elenco in `localStorage` (`annales.reminders`). |
| `stats.js`, `exportData.js`, `prefs.js` (aspetto, per-dispositivo in localStorage), `pagesSkin.js`, `idCard.js`, `haptics.js` (solo sui pulsanti d'azione, intensità dimezzata: 4 ms nel browser, 10 ms nell'app Android; si chiama `haptic()` a mano, **nessun listener globale**), `leaflet.js`, `changelog.js` | Supporto. |

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
| `recaps` | `period` (`day`/`month`/`year`), `key` (`AAAA-MM-GG`/`AAAA-MM`/`AAAA`), `text`, `user` | Scritti dal server di notte, dalla coda o dal tasto "Genera". |
| `recap_jobs` | `period`, `key`, `queuedAt` (ms), `user`; indice unico (user, period, key) | **Coda** dei recap da rigenerare. L'utente può solo leggerla; scrive solo il server (`$app` salta le regole). |

Regole: tutte le collection sono **per-proprietario** (`user = @request.auth.id`; in creazione il client deve inviare `user`).

**Formati dei campi note (trappole note):**
- `date` = datetime a mezzanotte UTC (`"2026-06-01 00:00:00.000Z"`): si usa solo il prefisso `AAAA-MM-GG`. Per "stessa data ogni anno" il
  filtro è `date ~ "-MM-DD "` (lo spazio finale evita falsi positivi con l'orario).
- `timeStart`/`timeEnd` = solo l'orario, con **data segnaposto `2000-01-01`** (`toPbTime`). Altrimenti l'ordinamento per stringa si rompe.
- In **update** le nuove immagini vanno con la chiave `images+` (senza `+` sostituisce tutta la lista); rimozione con `images-`.

### Hook e cron (`pb_hooks/`)

`main.pb.js` **registra soltanto**; la logica è in `recap_lib.js`, caricato con ``require(`${__hooks}/recap_lib.js`)`` dentro ogni handler
(vincolo del JSVM: ogni handler gira isolato e non vede funzioni definite altrove, nemmeno nello stesso file — è l'errore
`ReferenceError: X is not defined` che il 2026-09-30 bloccò il salvataggio delle note).

- **Hook su create/update/delete di `note`** (`*AfterSuccess`): NON chiamano Gemini. Mettono in coda (`recap_jobs`, con `queuedAt` = adesso + 60 s,
  che accorpa le modifiche ravvicinate) il giorno toccato — e quello di partenza se la data è cambiata — purché non sia oggi e l'utente abbia
  una chiave Gemini. Salvare resta istantaneo anche con Gemini lento (prima il salvataggio restava appeso).
- **Cron `recapQueue`** (ogni minuto): evade UN lavoro pronto per giro (richieste a Gemini distanziate), con al massimo 3 tentativi da 10 s.
  Errore transitorio → il lavoro resta in coda e riprova dopo 2 minuti; errore non recuperabile (chiave non valida) → scartato. A cascata: finito un
  giorno si accoda il suo mese (se non è il corrente), finito il mese il suo anno (se non è l'anno corrente). Un solo giro alla volta
  (`$app.store()`).
- **Cron notturni** `dailyRecap` (00:30), `monthlyRecap` (00:50 del giorno 1), `yearlyRecap` (01:10 del 1° gennaio): creano il recap del periodo appena
  chiuso, riprovando ogni 10 s finché Gemini risponde. Usano la chiave dell'utente. Il fuso è `Europe/Rome` (`TZ` + `tzdata` in `pocketbase.Dockerfile`).
- **Non** recuperano il passato: i periodi chiusi prima della funzione si generano a mano dall'app (tasto "Genera/Rigenera").
- In app, `RecapQueueTab` legge `recap_jobs` (ogni 15 s finché c'è coda, e subito dopo un salvataggio) e mostra cosa sta aggiornando il server.

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

## 8. App Android (Capacitor)

La stessa PWA è impacchettata in un APK con **Capacitor 8** (`capacitor.config.json`: id `it.fplinio.annales`, `webDir: dist`). L'app
gira su `https://localhost`, quindi non può usare la "propria origin": la build Android legge **`.env.android`** (`VITE_PB_URL=https://annales.fplinio.it`).

| Cosa | Dove |
|---|---|
| Progetto nativo | `android/` (Gradle). `android/app/src/main/assets/public` e `build/` sono generati e ignorati da git. |
| Permessi | `android/app/src/main/AndroidManifest.xml`: `INTERNET`, **`RECORD_AUDIO`** e `MODIFY_AUDIO_SETTINGS` (dettatura Gemini: la WebView di Capacitor chiede il microfono solo se è dichiarato nel manifest). Notifiche (`POST_NOTIFICATIONS`, allarmi esatti, riavvio) arrivano dal manifest del plugin `local-notifications`. |
| Plugin nativi locali | In `android/.../` e registrati in `MainActivity.java` **prima** di `super.onCreate`: `AppPermissionsPlugin` (stato di microfono, notifiche, allarmi precisi, risparmio batteria; apre le schermate di sistema) e `AnnalesWidgetPlugin` (riceve il riepilogo per il widget 3×1 e lo salva in SharedPreferences `annales_widget`). |
| Widget 3×1 "Annales" | `AnnalesSummaryWidget.java` + `res/layout/widget_summary.xml`. **Tre blocchi concettuali, senza linee né riquadri**: a sinistra il mood dell'ultima settimana (media dei mood giornalieri degli ultimi 7 giorni, in centesimi (0–100), un quadratino di carta tinto col colore del gradiente dell'utente; tocco → `/dati`); al centro l'ultima nota con giorno ("oggi", "ieri", "28 set", "28 set ’25") e solo l'ora di fine (tocco → `/day/AAAA-MM-GG`; l'ultima nota è quella con data e ora di fine più recenti — le note non hanno un campo "salvata il"); a destra il pulsante in rilievo "Nuova nota", ruotato di 2° (apre `/note/new`). I due blocchi di testo hanno la stessa struttura e altezze fisse (didascalia / valore / riga sotto, stessa dimensione del valore) così le didascalie sono allineate; testi di valore e righe sotto ispessiti con un finto grassetto (ombra dello stesso colore, perché il font ha un solo peso); font di sistema `casual` (Coming Soon) per tutti i testi. `WidgetLinks.jsx` accetta solo `/note/new`, `/dati` e `/day/…`). I dati li manda l'app, quindi il widget è aggiornato all'ultima apertura/ritorno in primo piano/salvataggio (una nota scritta da un altro dispositivo compare alla prossima apertura); la finestra dei 7 giorni e "oggi/ieri" si calcolano al momento del disegno e il widget si ridisegna ogni ~30 min, quindi restano giusti a mezzanotte anche senza aprire l'app. |
| Widget "Nuova nota" | `NewNoteWidget.java`, `NewNoteSmallWidget.java` + layout/drawable in `res/`. Aprono `https://localhost/note/new`; `src/components/WidgetLinks.jsx` lo intercetta (anche il tocco sulla notifica) e porta alla vista mese con la scelta Gemini / a mano. |
| Promemoria | `src/lib/reminders.js` + `ReminderSettings.jsx` (Impostazioni → Promemoria, visibile solo se `Capacitor.isNativePlatform()`). |
| Differenze nel frontend | `main.jsx` non registra il service worker nell'app; `haptics.js` usa il plugin nativo (vibrazione di 10 ms) solo sui pulsanti d'azione, senza listener globale; `usePullToRefresh` nella vista mese (`listNotesInRange(..., { fresh: true })`). |
| Download | `public/download/annales.apk` (copiato in `dist/download` dalla build web e servito da nginx), con link in Impostazioni → App Android (solo web). |

**Compilare l'APK (sul PC):** servono **JDK 21** e l'Android SDK con piattaforma **36** (Capacitor 8). Sul PC `plink`: JDK 21 Temurin estratto in `C:\Users\plink\jdks\jdk-21.0.12.1+1` (zip da adoptium.net, nessun admin) e SDK in `C:\Users\plink\AppData\Local\Android\Sdk` (piattaforma 36 e build-tools 36.0.0 installati con `sdkmanager`); serve anche `android/local.properties` con `sdk.dir=…` (ignorato da git). Sull'altro PC (`franc`) i percorsi sono quelli sotto.

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:ANDROID_HOME='C:\Users\franc\Android\Sdk'
npm run android:build                      # build web in modalità android + cap sync
cd android; .\gradlew.bat assembleDebug    # android/app/build/outputs/apk/debug/app-debug.apk
copy app\build\outputs\apk\debug\app-debug.apk ..\public\download\annales.apk
```

Poi commit e push: il Dockerfile includerà l'APK nell'immagine web e dopo `pull`/`up -d` sul NAS sarà scaricabile da
`https://annales.fplinio.it/download/annales.apk`. Alza `versionCode`/`versionName` in `android/app/build.gradle` a ogni APK nuovo.
`android:build` toglie `dist/download` per non mettere l'APK dentro l'APK.

**Firma:** l'APK è di **debug**, firmato con `~/.android/debug.keystore` del PC (ogni PC ha la sua: passare da un PC all'altro richiede `adb uninstall it.fplinio.annales` e rifare l'accesso, i dati sono sul server).

**Installare sul telefono (debug wireless):** `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`; con firma diversa `INSTALL_FAILED_UPDATE_INCOMPATIBLE` → disinstalla e reinstalla. Versione attuale: versionCode 7 / versionName 1.6 (frontend v0.66.0).

**Regola di aggiornamento dell'app Android (vale ogni volta che si chiede un aggiornamento dell'app):** dopo le modifiche si alza la versione (`package.json`, voce in `changelog.js`, `versionCode`/`versionName` in `android/app/build.gradle`), si compila l'APK (`npm run android:build` + `gradlew assembleDebug`) e, **se il telefono è collegato** (`adb devices` mostra `device`; con più voci usare `adb -s IP:porta`), lo si **invia subito** con `adb install -r app-debug.apk`, verificando `versionCode`/`versionName` con `dumpsys package it.fplinio.annales`. Se il telefono non è collegato lo si dice e l'APK resta in `android/app/build/outputs/apk/debug/`. Il debug wireless cade spesso: `adb mdns services` e `adb connect IP:porta` (vedi sotto per MyMap, stessa procedura). Un APK compilato altrove (es. dal workflow manuale
`.github/workflows/android-apk.yml`, artifact `annales-debug-apk`) ha un'altra firma e Android non lo installa sopra quello vecchio: va
prima disinstallata l'app.

## 9. Domande frequenti: dove guardare

| Domanda | Dove |
|---|---|
| "Failed to create record" salvando una nota | Hook in `pb_hooks/` (un errore lì blocca il salvataggio: successo con la v0.62.0, corretto nella 0.62.1) e log del container PocketBase. I dettagli sono nella tabella `_logs` di `pb_data/auxiliary.db` (campo `details`): copia il file fuori dal container e interrogalo con `sqlite3`. |
| Salvare una nota si blocca / lentezza dopo il salvataggio | Dalla v0.65.0 gli hook non chiamano più Gemini: guarda la coda `recap_jobs` e la linguetta `RecapQueueTab`. Prima (≤ 0.62) la chiamata stava dentro l'hook. |
| Il widget 3×1 mostra "—" o dati vecchi | Il widget non interroga il server: mostra l'ultimo riepilogo mandato dall'app (apertura, ritorno in primo piano, salvataggio). Aprire l'app lo aggiorna; se mostra "apri l'app" non ha mai ricevuto dati (APK senza plugin `AnnalesWidget` o app mai aperta dopo l'installazione). Controllo: `adb shell run-as it.fplinio.annales cat shared_prefs/annales_widget.xml`. |
| Ho chiuso una nota nuova senza salvare | Linguetta "Bozze" sul bordo destro (`DraftsTab`): `localStorage` del dispositivo, per-utente, immagini escluse. |
| "Something went wrong" al login in locale | Il proxy non raggiunge un backend: `VITE_DEV_API` assente e niente stack su `localhost:8973`. Vedi §6. |
| Una nota non compare / ordine sbagliato | Formato di `date`/`timeStart` (§4); nessun campo `created`. |
| Una nota offline non è partita | Coda in `offlineQueue.js` + linguetta `PendingSync`; `flushQueue` in `notes.js`. |
| Un recap non si genera | Chiave Gemini dell'utente; log `[recap]` del container; il cron non copre il passato. |
| Immich/MyMap "non raggiungibile" | Rete/CORS/HTTPS dal browser; per MyMap anche email/password e che il server abbia la collection `points`. |
| MyMap non propone posti | Nel giorno servono soste ≥ 20 minuti; controlla tracking attivo in MyMap, giorno scelto e il test di connessione (conta i punti). |
| MyMap: nel selettore compaiono i nomi OpenStreetMap, non i miei | "Testa connessione" mostra i nomi trovati in `users.settings.names.list` del server MyMap. Zero = MyMap non ha sincronizzato il profilo (account sul server + "Salvate nel profilo"). Altrimenti il nome è oltre 150 m dal centro del posto del giorno (`customName` in `lib/mymap.js`). |
| MyMap: "Impossibile raggiungere il server" | Quasi sempre URL errato (DNS inesistente) o non HTTPS. L'URL è quello usato dall'app MyMap (`https://pocketbase.fplinio.it`); il suo CORS è aperto a qualsiasi origine. |
| I campi di un'integrazione non si salvano / si svuotano | Migration non ancora deployata sul server (campi assenti su `users`). `MymapIntegration` lo rileva (`rec.mymapUrl === undefined`) e mostra un errore. Dopo la pubblicazione: `pull` + `up -d` sul NAS. |
| App Android: "Detta un vocale" non registra / nessun permesso Microfono | `RECORD_AUDIO` mancava nel manifest (APK ≤ versionCode 1): senza dichiarazione Android non mostra la richiesta e il permesso non compare nelle impostazioni. Dalla v0.64.0 (versionCode 2) è dichiarato: installare il nuovo APK; se negato, Impostazioni telefono → App → Annales → Autorizzazioni. |
| App Android: l'aggiornamento dell'APK non si installa | Firma diversa (debug keystore di un altro PC o della CI): disinstallare e reinstallare. Stessa firma = aggiornamento sopra. |
| Aggiornamento non visibile | Service worker: `sw.js`/`index.html` sono `no-cache`; ricarica due volte o svuota la cache; verifica che l'Action sia finita e il NAS abbia fatto `pull`. |
| Build CI bloccata | Il commit `179bd98` ha ritriggerato una build ferma (timeout 6 h su `build-and-push`); rilanciare da Actions → "Run workflow". |
| Come cambio schema | Nuovo file in `pb_migrations/` (prefisso numerico crescente, API jsvm 0.28), poi deploy. Mai modificare i campi a mano dall'admin. |
| Admin UI / superuser | Chiusa da nginx. `docker compose exec pocketbase /pb/pocketbase superuser upsert email password`, oppure pubblica temporaneamente la porta 8090. |

## 10. Punti aperti

- Le credenziali delle integrazioni (API key Immich, Gemini, password MyMap) sono **in chiaro** nel record utente: protette solo dalle
  regole per-proprietario.
- Registrazione pubblica aperta: chiunque raggiunga il sito può creare un account (i dati restano isolati per utente).
- Nessun test automatico: la verifica è manuale + `npm run lint` + `npm run build`.
- Il bundle supera i 500 kB (warning di Vite): nessun code-splitting.
- L'APK è di debug e committato in `public/download/` (circa 5 MB per versione, resta nella storia di git); non c'è firma di release
  né pubblicazione su Play Store. Il workflow `android-apk.yml` è manuale e produce un APK con firma diversa.
- Leaflet è caricato da CDN (`unpkg.com`): senza internet il selettore luoghi non mostra la mappa.
