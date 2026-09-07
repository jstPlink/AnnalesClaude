// Changelog dell'app, mostrato in Impostazioni -> Novità.
// Voci dalla più recente alla più vecchia. La versione in package.json e la
// voce qui sotto si aggiornano AL MOMENTO DEL COMMIT (non durante lo
// sviluppo); `date` è data + ora del commit ("YYYY-MM-DD HH:MM").

export const CHANGELOG = [
  {
    version: '0.10.7',
    date: '2026-09-07 21:42',
    changes: [
      'Vista mese (mobile e web): divario di opacità dei titoli in base al mood più marcato (0.2 a mood neutro invece di 0.3), per notare la differenza più a colpo d\'occhio.',
    ],
  },
  {
    version: '0.10.6',
    date: '2026-09-07 21:39',
    changes: [
      'Vista mese/giorno (web): righe centrate (non più appiccicate a sinistra) e ridotte di un altro 20% (dal 75% al 60% della larghezza).',
      'Vista giorno (web e mobile): sfondo del pannello cambiato, righe orarie estese a tutta larghezza (anche dietro alle note) invece dei trattini corti.',
      'Vista giorno (web): pulsante "Torna al mese" ingrandito, era troppo piccolo.',
    ],
  },
  {
    version: '0.10.5',
    date: '2026-09-07 21:17',
    changes: [
      'Vista mese (web): risolto il menu a tendina di anno/mese che non compariva più (era tagliato via dagli angoli arrotondati della placchetta).',
      'Vista giorno (web): ridisegnata come su mobile — la giornata sta sempre tutta a schermo senza dover scorrere, e la colonna è più stretta (stessa larghezza delle righe della vista mese, ridotta del 25%) invece di essere dispersiva a piena larghezza.',
      'Vista mese (mobile e web): i titoli delle note non compaiono più a tutto o niente in base al mood — sfumano gradualmente più il mood è vicino al centro scala (0.5) e sono a piena opacità quando è marcato (≤0.2 o ≥0.8).',
    ],
  },
  {
    version: '0.10.4',
    date: '2026-09-07 20:48',
    changes: [
      'Scegli da Immich: se l\'originale di una foto non è più disponibile sul server (libreria spostata/cancellata), non fallisce più tutto l\'import — viene scaricata una versione ridotta al suo posto, con un avviso prima di aggiungerla.',
    ],
  },
  {
    version: '0.10.3',
    date: '2026-09-07 20:45',
    changes: [
      'Vista mese (web): anno e mese ora sono un\'unica placchetta con le frecce inglobate agli estremi; cliccando nel mezzo si apre un menu per saltare a un anno o mese non adiacente. Anche "Oggi" è diventato una placchetta.',
    ],
  },
  {
    version: '0.10.2',
    date: '2026-09-07 20:35',
    changes: [
      'Selettore persone: le più frequenti sono separate visivamente ("Frequenti" / "Altre persone") invece di mischiarsi al resto.',
      'Scegli da Immich: campo "Vai al giorno" con calendario per saltare direttamente alle foto di una data precisa.',
    ],
  },
  {
    version: '0.10.1',
    date: '2026-09-07 18:03',
    changes: [
      'CI: le build Docker superate vengono annullate (`:latest` non regredisce più, coda smaltita subito). Sblocca la pubblicazione della v0.10.0.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-09-07 16:41',
    changes: [
      'Eliminazione account dalle Impostazioni, con doppia conferma (avviso + digitare ELIMINA). Cancella anche note, persone e tag dell’utente.',
    ],
  },
  {
    version: '0.9.6',
    date: '2026-09-07 16:33',
    changes: ['Versione dell’app mostrata nella pagina di login (mobile e web).'],
  },
  {
    version: '0.9.5',
    date: '2026-09-07 16:32',
    changes: [
      'Migration dedicata che tiene la registrazione aperta lato database: creare un account dal login resta possibile.',
    ],
  },
  {
    version: '0.9.4',
    date: '2026-09-07 16:30',
    changes: [
      'Fix migration PocketBase che bloccava l’avvio (`@request.data` → `@request.body`, sintassi v0.23+).',
      'Anche persone e tag diventano per-utente (regole per-proprietario).',
    ],
  },
  {
    version: '0.9.3',
    date: '2026-09-07 16:23',
    changes: [
      'Registrazione riaperta; la privacy passa alle regole per-proprietario delle note (ogni utente vede solo le sue).',
      'Impostazioni web → Persone: pulsanti in alto e creazione di una persona locale.',
    ],
  },
  {
    version: '0.9.2',
    date: '2026-09-07 15:56',
    changes: ['Changelog con data e ora per ogni versione.'],
  },
  {
    version: '0.9.1',
    date: '2026-09-07 15:48',
    changes: ['Sezione "Novità" nelle Impostazioni con il changelog per versione.'],
  },
  {
    version: '0.9.0',
    date: '2026-09-07 15:39',
    changes: [
      '"In questo giorno": in vista mese le note della stessa data degli anni scorsi.',
      'Ricerca per testo (titolo e contenuto) nella pagina Cerca.',
      'Swipe tra giorni in vista giorno (frecce su web).',
      'Tema chiaro/scuro/sistema e scelta del font in Impostazioni → Aspetto.',
      'Sezione "Import ed export": esporta tutto in JSON o Markdown.',
      'Coda offline: le note salvate senza rete si sincronizzano al ritorno online.',
      'Recap con Gemini: riassunto dell’anno in Statistiche.',
      '"Nota dalle foto di ieri": bozza generata dalle foto Immich, allegate alla nota.',
      'Sicurezza: registrazione pubblica chiusa; ogni nota assegnata al tuo utente.',
    ],
  },
  {
    version: '0.4.2',
    date: '2026-09-07 14:28',
    changes: [
      'Vista mese: nelle righe del giorno si vedono i titoli di tutte le note, non solo quelle con umore estremo.',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-09-07 14:26',
    changes: [
      'Schermata "Importa da immagine": selettori completi (persone con foto, tag esistenti, luogo su mappa, canzoni) e aggiunta immagini da dispositivo o Immich.',
      'Impostazioni web raggruppate in sezioni collassabili, con "Integrazioni" per Immich/Gemini/Spotify.',
      'Guide scaricabili su come ottenere i token di Gemini, Spotify e Immich.',
      'Pulsante "Importa" con estetica da funzione provvisoria (giallo di avviso).',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-07 13:58',
    changes: [
      'Impostazioni mobile: sezione unica "Integrazioni" e icone su tutte le voci.',
      'Aggiunta di una persona locale (solo nome) dalle impostazioni.',
      'Pagina Cerca: filtro persone collassabile, con foto profilo sulle targhette.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-07 13:45',
    changes: [
      'Nuova schermata web "Importa da immagine": Gemini estrae le note da uno screenshot del vecchio diario.',
      'Cancellare una persona collegata a delle note chiede se sostituirla o rimuoverla ovunque.',
      'Nel selettore persone le più usate compaiono in cima.',
      'Vista nota mobile: divisori tra le sezioni, persone e tag su due colonne, riga Spotify più alta, mappa più bassa.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-07 11:06',
    changes: [
      'Prime modifiche: fix del salvataggio immagini in modifica nota, ritocchi al layout di giorno e nota, versione dell’app in Impostazioni.',
      'Sezioni "Supporto" e "Offrimi un caffè".',
      'Vista giorno: carosello per le note con più foto; dialog Gemini centrato.',
      'Vista nota mobile: contenuto sempre visibile e non comprimibile; aggiunta persone al volo.',
    ],
  },
]
