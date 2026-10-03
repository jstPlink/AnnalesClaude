# Annales – Guida all'uso

Guida per chi usa l'app. Per com'è fatta dentro e per rispondere a domande tecniche vedi [ARCHITETTURA.md](../ARCHITETTURA.md);
la cronologia delle versioni è in `src/lib/changelog.js` (visibile in app: Impostazioni → Novità).

## 1. Cos'è

Annales è un **diario personale** (PWA: funziona dal browser e si installa su telefono). Ogni giorno può avere più **note**, ognuna con
titolo, testo, **umore** (mood), orario di inizio e fine, immagini, persone, tag, luogo e canzoni. L'app mostra le note per mese, per
giorno, in statistiche e in una ricerca. Non c'è nessuna parte social: i dati sono su un database **tuo** (online su
`annales.fplinio.it`, ospitato sul NAS).

Ogni schermata ha due versioni: **mobile** (schermo stretto) e **web/desktop** (con barra laterale). Il contenuto è lo stesso; il
passaggio è automatico in base alla larghezza della finestra.

## 2. Accesso

- Pagina di **Accedi / Registrati** con email e password. Ogni account vede solo i propri dati.
- Non c'è nessun campo "server": il database è lo stesso indirizzo dell'app.
- La sessione resta salvata; senza rete l'app si apre comunque con i dati in locale (vedi §9).

## 3. Le schermate

| Schermata | Percorso | Cosa fa |
|---|---|---|
| **Calendario** (mese) | `/` | Un foglio per ogni giorno con note: umore medio, titoli, persone, luogo, canzone, foto. Si cambia mese con le frecce o scorrendo; l'app apre sul mese corrente. In cima "In questo giorno" (note degli anni passati) e il recap del mese. |
| **Giorno** | `/day/AAAA-MM-GG` | Le note del giorno su una timeline di 24 ore (altezza del blocco = durata). Recap del giorno in cima. |
| **Nota** | `/note/new?date=…` e `/note/:id` | Editor: data, orari, mood, titolo, testo, e i pulsanti per immagini, persone, tag, canzoni, luogo. Salva (verde) o elimina (rosso). |
| **Andamento** | `/dati` | Grafico dell'umore nell'anno e mese per mese; da web ogni barretta apre quel giorno. |
| **Statistiche** | `/statistiche` | Persone più presenti, giorni/settimane/mesi migliori e peggiori, note migliori e peggiori, tag e luogo più usati, note per mese, recap dell'anno. Ogni voce cliccabile apre le note corrispondenti. |
| **Cerca** | `/filtri` | Filtri per periodo, mood, testo, luogo, persone, tag, canzoni; ordinamento e numero massimo di risultati. |
| **Importa** (solo web) | `/importa` | Migrazione di note da uno screenshot (Gemini) o da un foglio di calcolo esportato (TSV/CSV). |
| **Impostazioni** | `/profilo` | Aspetto, dati utente, integrazioni, uso offline, novità, account. |

## 4. Scrivere una nota

- **Data e orari:** la data si sceglie dal calendario; inizio e fine con il selettore a rotella (minuti a multipli di 5). Gli orari
  sono "da orologio", senza fusi.
- **Mood:** un righello da 0 a 10 (salvato come 0–1). Il colore della nota, nel mese e nel giorno, segue il gradiente del mood.
- **Testo:** editor con Markdown/anteprima. Dal menu Gemini si può ripulire/sintetizzare il testo o scriverlo da un prompt; si può
  anche **dettare a voce** (la registrazione la trascrive Gemini; se la trascrizione fallisce puoi ritentarla senza registrare di nuovo).
- **Immagini:** dal dispositivo oppure da **Immich** (se collegato), con un calendario per saltare al giorno delle foto.
- **Persone, tag, canzoni:** si scelgono da elenchi (le persone più usate sono in cima); persone e tag nuovi si creano al volo. Le
  canzoni si cercano su Spotify (se collegato) o si incolla un link.
- **Luogo:** vedi §6.
- **Nuova nota con Gemini:** dal pulsante "nuova nota" si può scegliere tra manuale e Gemini: scrivi un prompt e la bozza arriva già con
  titolo, testo, tag, persone e luogo, tutto da rivedere prima di salvare.
- **Bozze:** una nota nuova che chiudi senza salvare (ad esempio con Indietro per sbaglio) non va persa: si salva da sola mentre scrivi e compare nella
  linguetta **Bozze** sul bordo destro, da riprendere con un tocco o scartare col cestino. Sono sul dispositivo; le immagini non si conservano e vanno
  riaggiunte. Spariscono quando la nota viene salvata.
- **Senza rete:** il salvataggio va in coda e si sincronizza da solo (vedi §9).

## 5. Impostazioni

- **Aspetto:** tema (chiaro/scuro/sistema), font, sfondo (texture o una tua immagine, che resta solo sul dispositivo), animazioni,
  cursore a matitina (solo mouse). Sono preferenze **per dispositivo**.
- **Dati utente** (sincronizzati sull'account): **Colori del mood** (sei colori e le soglie), **Persone**, **Tag**, **Luoghi** (anche
  modifica di nome e posizione, che si propaga alle note), **Canzoni** (sola lettura, con quante note le usano). Cancellare una persona
  o un luogo collegato a delle note chiede se sostituirlo o toglierlo ovunque.
- **Integrazioni:** Immich, **MyMap**, Spotify, Gemini (vedi §6–§8).
- **Uso offline**, **Novità** (changelog), **Esporta** (JSON o Markdown di tutto il diario) e **Account** (cambio nome, email e password;
  esci; elimina account con doppia conferma, che cancella anche note, persone e tag).

## 6. Luoghi e integrazione MyMap

Il luogo di una nota è un nome con coordinate. Dal pulsante "Luogo" si apre il selettore:

- **Annales:** cerchi un posto per nome (OpenStreetMap), tocchi un punto sulla mappa (anche senza indirizzo, il nome lo scrivi tu) o
  riusi un **luogo salvato**. Il luogo scelto finisce anche nell'elenco in Impostazioni → Luoghi.
- **MyMap:** (compare solo se l'integrazione è configurata) propone i **posti visitati nel giorno della nota**, cioè le soste di almeno
  20 minuti registrate da MyMap, con orario e durata. Le frecce cambiano giorno. Tocchi un posto: compare sulla mappa col nome
  modificabile, poi "Aggiungi". Il nome è quello che hai dato a mano in MyMap, altrimenti viene cercato su OpenStreetMap.
  L'ultima sorgente usata viene ricordata.

**Collegare MyMap** (Impostazioni → Integrazioni → MyMap): servono **URL del server MyMap** (HTTPS, senza barra finale: è lo stesso
indirizzo che inserisci nell'accesso di MyMap, ad esempio `https://pocketbase.fplinio.it`), **email** e **password** dell'account
MyMap. Presuppone che MyMap sia usata con un account sul tuo server (non solo "su questo telefono"). C'è una guida scaricabile nella
sezione stessa.

- **Testa connessione** verifica l'accesso e mostra quanti **punti** ci sono sul server e quanti **nomi dati a mano** (i nomi dei posti
  che hai assegnato in MyMap). Funziona anche prima di salvare.
- **Salva** scrive i dati sul tuo profilo Annales. Se il server non ha ancora i campi MyMap (versione dell'app non ancora pubblicata),
  lo segnala e non svuota gli input.

**Problemi comuni**

| Sintomo | Causa e rimedio |
|---|---|
| "Impossibile raggiungere il server MyMap" | URL sbagliato o non raggiungibile (deve esistere nel DNS ed essere HTTPS). Usa l'indirizzo che hai in MyMap. |
| "Email o password di MyMap non valide" | Sono quelle dell'account **MyMap**, che può avere una password diversa da quella di Annales. |
| Salvando i campi si svuotano / errore sui campi | Il database di produzione non ha ancora la migration dei campi MyMap: pubblica la nuova versione (push su `main`, poi `docker compose pull && docker compose up -d` sul NAS). |
| Nel selettore vedo i nomi di OpenStreetMap e non i miei | I tuoi nomi non sono arrivati sul server: in MyMap devi essere collegato al server e le impostazioni risultare "Salvate nel profilo" (dare di nuovo un nome forza il salvataggio). "Testa connessione" dice quanti nomi trova. Il nome si abbina al posto entro 150 m. |
| "Nessun posto registrato" in un giorno | Servono soste di almeno 20 minuti con il tracking attivo; prova a cambiare giorno con le frecce. |

## 7. Immich e Spotify

- **Immich:** URL del server + API key (Immich → Account → API Keys). Serve per scegliere foto e importare le persone riconosciute.
- **Spotify:** Client ID e Client Secret di un'app creata su developer.spotify.com (solo ricerca nel catalogo).
Entrambe hanno una guida scaricabile nella rispettiva sezione.

## 8. Gemini (IA)

Serve una **chiave API** di Google AI Studio (Impostazioni → Integrazioni → Gemini). Abilita: ripulire/sintetizzare il testo, scrivere da
un prompt, "Nuova nota con Gemini", dettatura vocale, estrazione note da screenshot (Importa) e i **recap automatici**:

- Ogni notte il server prepara il recap del giorno appena finito; il 1° del mese quello del mese, il 1° gennaio quello dell'anno. Si
  rigenerano da soli se modifichi una nota di un periodo già chiuso (una nota di oggi non fa nulla: ci pensa la notte).
- I periodi chiusi **prima** che la funzione esistesse non hanno recap: si generano a mano col tasto "Genera/Rigenera" nelle viste.
- Se Gemini è sovraccarico l'app riprova da sola un paio di volte.
- Quando salvi una nota di un giorno già passato, il recap non si rigenera subito: viene messo in **coda** e il server lo aggiorna in background, uno
  per volta (giorno, poi mese, poi anno) e a distanza di tempo, così salvare resta veloce. Una linguetta sul bordo destro dice cosa sta aggiornando.
- Le "Istruzioni personalizzate" (tono, cosa evidenziare) valgono per tutte le richieste e si modificano anche al volo nei pannelli.

## 9. Uso offline e connessione debole

All'apertura l'app scarica in locale note, persone, tag, luoghi e miniature. Con rete assente o lenta mostra subito i dati salvati e li
aggiorna in background. Le **linguette** sul bordo destro avvisano di connessione debole/assente e di modifiche in coda (toccandole si
riprova), dei recap in aggiornamento e delle bozze. Le note salvate offline restano in coda e si inviano da sole al ritorno della rete. In Impostazioni → Uso offline: spazio
occupato, numero di note e miniature, "Aggiorna ora" e "Svuota cache".

## 10. App Android

Oltre alla PWA esiste un'app Android (file **APK**) con lo stesso account e gli stessi dati.

- **Installazione:** da web, Impostazioni → **App Android** → "Scarica l'app per Android". Apri il file dal telefono e, se richiesto,
  consenti l'installazione da questa fonte. L'APK è "di debug", firmato con la chiave di debug del PC su cui è compilato: per aggiornare
  l'app installa il nuovo APK sopra il vecchio. Se Android rifiuta l'aggiornamento (firma diversa) disinstalla prima l'app.
- **Permessi:**
  - **Microfono:** serve per "Detta un vocale" nelle note con Gemini. Android lo chiede alla prima registrazione; se l'hai negato:
    Impostazioni del telefono → App → Annales → Autorizzazioni → Microfono. Un APK vecchio, senza il permesso nel manifest, non lo
    chiede mai: va reinstallata la versione nuova.
  - **Notifiche:** servono per i promemoria (Android 13+ le chiede alla prima attivazione).
- **Widget "Nuova nota":** aggiungilo dalla schermata home (due formati). Un tocco apre l'app sulla scelta Gemini / a mano.
- **Promemoria:** Impostazioni → **Promemoria** (solo nell'app). Uno o più orari con i giorni della settimana; la notifica "scrivi la nota
  del giorno" arriva anche ad app chiusa e senza rete, e toccandola si apre la scelta Gemini / a mano. Sono salvati sul dispositivo.
- **Vibrazione:** un tocco leggero solo sui pulsanti d'azione (non su schede, filtri e selezioni).
- **Aggiorna tirando:** nella vista mese (telefono) tira verso il basso per rileggere le note dal server.
- Dentro l'app non c'è service worker: l'interfaccia è nell'APK e si aggiorna installando un nuovo APK; i dati arrivano sempre dal
  server `annales.fplinio.it`.

## 11. Importare vecchie note (solo web)

- **Da immagine:** screenshot di un vecchio diario; Gemini estrae le note, tu le rivedi e salvi.
- **Da foglio (testo):** export TSV/CSV di Google Fogli (una riga = un giorno). Si indicano le colonne (mese, giorno, testo, titolo,
  voto 0–100). Uno script locale prepara una nota per giorno, riconoscendo persone e tag già presenti. I giorni che hanno già note
  vengono saltati, quindi si può ridare lo stesso file. I file caricati restano in una libreria personale.
