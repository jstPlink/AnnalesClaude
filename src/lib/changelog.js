// Changelog dell'app, mostrato in Impostazioni -> Novità.
// Voci dalla più recente alla più vecchia. Ad ogni bump di versione in
// package.json aggiungere qui la voce corrispondente.

export const CHANGELOG = [
  {
    version: '0.9.1',
    date: '2026-09-07',
    changes: ['Sezione "Novità" nelle Impostazioni con il changelog per versione.'],
  },
  {
    version: '0.9.0',
    date: '2026-09-07',
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
    date: '2026-09-07',
    changes: [
      'Vista mese: nelle righe del giorno si vedono i titoli di tutte le note, non solo quelle con umore estremo.',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-09-07',
    changes: [
      'Schermata "Importa da immagine": selettori completi (persone con foto, tag esistenti, luogo su mappa, canzoni) e aggiunta immagini da dispositivo o Immich.',
      'Impostazioni web raggruppate in sezioni collassabili, con "Integrazioni" per Immich/Gemini/Spotify.',
      'Guide scaricabili su come ottenere i token di Gemini, Spotify e Immich.',
      'Pulsante "Importa" con estetica da funzione provvisoria (giallo di avviso).',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-07',
    changes: [
      'Impostazioni mobile: sezione unica "Integrazioni" e icone su tutte le voci.',
      'Aggiunta di una persona locale (solo nome) dalle impostazioni.',
      'Pagina Cerca: filtro persone collassabile, con foto profilo sulle targhette.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-07',
    changes: [
      'Nuova schermata web "Importa da immagine": Gemini estrae le note da uno screenshot del vecchio diario.',
      'Cancellare una persona collegata a delle note chiede se sostituirla o rimuoverla ovunque.',
      'Nel selettore persone le più usate compaiono in cima.',
      'Vista nota mobile: divisori tra le sezioni, persone e tag su due colonne, riga Spotify più alta, mappa più bassa.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-07',
    changes: [
      'Prime modifiche: fix del salvataggio immagini in modifica nota, ritocchi al layout di giorno e nota, versione dell’app in Impostazioni.',
      'Sezioni "Supporto" e "Offrimi un caffè".',
      'Vista giorno: carosello per le note con più foto; dialog Gemini centrato.',
      'Vista nota mobile: contenuto sempre visibile e non comprimibile; aggiunta persone al volo.',
    ],
  },
]
