// Changelog dell'app, mostrato in Impostazioni -> Novità.
// Voci dalla più recente alla più vecchia. La versione in package.json e la
// voce qui sotto si aggiornano AL MOMENTO DEL COMMIT (non durante lo
// sviluppo); `date` è data + ora del commit ("YYYY-MM-DD HH:MM").
//
// Le versioni minori/di sola rifinitura vengono accorpate qui in un'unica
// voce (invece di una per ogni commit) per tenere l'elenco leggibile — il
// numero di versione riportato è quello dell'ultimo commit del gruppo.

export const CHANGELOG = [
  {
    version: '0.58.0',
    date: '2026-09-24 22:10',
    changes: [
      "Uso offline o con poca connessione: all'apertura l'app scarica in locale note, persone, tag, luoghi e miniature delle immagini; con rete assente o lenta mostra subito i dati salvati e li aggiorna in background appena arriva la risposta.",
      'Una pillola in alto avvisa quando la connessione è debole o assente (i dati potrebbero non essere aggiornati, con ora dell\'ultimo aggiornamento); toccandola si riprova ad aggiornare.',
      'Salvando una nota con connessione debole compare un avviso: il caricamento può richiedere tempo, e se non riesce subito la nota resta in coda e si sincronizza da sola.',
      'Nuova icona dell\'app: fogli a quadretti sfalsati con linguette colorate e una piccola polaroid del mare.',
    ],
  },
  {
    version: '0.57.0',
    date: '2026-09-24 20:40',
    changes: [
      'Selettore orario (mobile e web): ora e minuti in due colonne separate, con i minuti a multipli di 5, invece di un\'unica lista con tutte le combinazioni ogni 5 minuti; resta aperto finché non si clicca fuori.',
      'Barra del mood: ora è un righello di legno con tacche (e numeri 0–10 nell\'editor nota), leggermente inclinato, il cui colore segue il mood; il cursore è una placca di metallo che lo avvolge. Tolti etichetta e valore numerico.',
    ],
  },
  {
    version: '0.56.0',
    date: '2026-09-18 21:50',
    changes: [
      'Import da foglio: "Spezza qui" ora ricalcola persone e tag su ciascuna metà del testo (invece di copiare lo stesso elenco su entrambi) e completa gli orari — il primo pezzo eredita l\'inizio del blocco originale, il secondo la fine.',
    ],
  },
  {
    version: '0.55.0',
    date: '2026-09-18 15:38',
    changes: [
      'Statistiche (mobile e web): nuova lista "Note per mese" e due targhette in evidenza, "Mese più felice" e "Mese più triste" — tocca per vedere le note di quel mese.',
      'Vista giorno (mobile): la data ora è lo stesso orologio LCD del resto dell\'app, non più la vecchia targhetta.',
      'Andamento (mobile): numeri dei giorni (multipli di 5) sotto le barrette di ogni mese, come da web; barre più basse (-30%).',
      'Rimossa "Genera dalle foto di ieri" da "Nuova nota con Gemini" e "Riconosci le persone citate" dal menu Gemini della nota (mobile) — restano scrittura da prompt e ripulisci/sintetizza testo.',
      'Impostazioni: sezione "Istruzioni personalizzate" (Gemini) non più a scomparsa, sempre visibile; ordine di Immich/Spotify/Gemini uniformato tra mobile e web.',
      'Ovunque si scrive un prompt per Gemini (nuova nota, scrivi con l\'IA) è ora presente anche un box "Istruzioni personalizzate" — richiudibile, chiuso di default — per modificarle al volo senza passare da Impostazioni; si applicano subito alla generazione in corso.',
      'Corretto un taglio del cartoncino della barra superiore mobile sotto la barra di stato del telefono, nella PWA installata.',
    ],
  },
  {
    version: '0.54.0',
    date: '2026-09-16 23:01',
    changes: [
      'Statistiche: aggiunta "Settimana peggiore" alla lista "In evidenza" (web e mobile), accanto a "Settimana migliore" — tocca per vedere le note di quella settimana.',
    ],
  },
  {
    version: '0.53.0',
    date: '2026-09-16 22:21',
    changes: [
      'Import da foglio, revisione nota: gli orari Inizio/Fine sono ora staccati dalla data (spinti a destra) invece di stare tutti appiccicati; il box "Contenuto" si allarga sempre quanto serve a mostrare tutto il testo, senza più bisogno di ridimensionarlo a mano.',
      'Selettore orario (vista nota): colonna più alta (+30%) per raggiungere più valori senza scorrere così tanto.',
      'Impostazioni: i sotto-cartoncini (Colori del mood, Persone, Tag...) erano rimasti troppo scuri — sfondo più chiaro e grana meno marcata.',
    ],
  },
  {
    version: '0.52.0',
    date: '2026-09-16 20:38',
    changes: [
      'Import da foglio: colonne di default aggiornate (mese C, giorno E, testo F, titolo G, voto H); il campo "Data" in revisione mostra la data per esteso ("lunedì 09 febbraio 2026") invece del solo input, più veloce da leggere scorrendo tante note di fila.',
      'Import da foglio: i file caricati restano in una libreria personale (non più solo nel browser) — un pulsante sotto il box per richiamare ciascun file caricato in precedenza, con una × per dimenticarlo, così si riprende anche da un altro dispositivo senza ricaricarlo da capo.',
      'Selettori di immagini, canzoni, persone, tag e luogo (mobile e web): risolto un bug di posizionamento per cui lo sfondo scuro non copriva tutto lo schermo e il pannello poteva finire fuori dai bordi visibili, rendendo alcuni pulsanti non raggiungibili.',
    ],
  },
  {
    version: '0.51.0',
    date: '2026-09-16 19:21',
    changes: [
      'Import da foglio (beta): niente più Gemini per leggere il testo — uno script locale prepara subito una nota per giorno (mese e giorno letti dalla colonna del CSV, non più scelti da un menu a parte), con persone e tag già a database riconosciuti automaticamente nel testo; ordine dei campi in revisione rivisto (titolo sopra al contenuto, orari sulla riga della data) e tolta la descrizione in alto alla pagina.',
      'Barra laterale web, "Nuova nota": in vista giorno prende la data del giorno che si sta guardando, invece di andare sempre a oggi.',
      'Aggiungere persone a una nota: ogni persona mostra ora in quante note è già usata.',
      'Vista mese: risolto un bug per cui i fogli e i titoli delle note di uno stesso mese finivano quasi tutti con la stessa inclinazione invece che sparsa; il foglio sotto al mouse si solleva di più e non salta più sopra a tutti gli altri fogli del mese.',
    ],
  },
  {
    version: '0.50.0',
    date: '2026-09-16 17:01',
    changes: [
      'Vista mese: all\'apertura dell\'app va subito al mese corrente, e ogni volta che si carica il mese lo scroll è già sul giorno di oggi (mobile e web).',
      'Andamento da web: le barrette di ogni mese sono ora cliccabili una per una, con il numero del giorno sotto ciascuna, per aprire subito quel giorno.',
      'Andamento e Statistiche da web: header con titolo e anno fisso in cima scorrendo la pagina.',
      'Impostazioni, sezione Gemini (IA): più contrasto e spazio fra i campi, meno tutto appiccicato; il campo delle istruzioni personalizzate è più grande.',
      'Pannello per generare una nota con Gemini (mobile e web): stessa estetica a foglietto di cartoncino del resto dell\'app invece del vecchio pannello bianco generico; da web appare a centro schermo invece che in basso.',
      'Corretto il dropdown di mese/anno da telefono, che poteva uscire dai bordi dello schermo o comparire scentrato rispetto al pulsante; il menu del mese è anche un po\' più largo per far stare nomi lunghi come "Settembre".',
    ],
  },
  {
    version: '0.49.0',
    date: '2026-09-16 15:53',
    changes: [
      'Vista nota da web: data e orario ora sono una sveglia LCD digitale (font a segmenti dedicato), come il resto dell\'app; il calendario e il selettore orario a comparsa hanno un\'estetica coerente (calendario da tavolo "strappabile", selettore orario a rotella); pulsanti indietro/salva/elimina tornano ad essere targhette con testo e contorno tratteggiato, coerenti con la barra laterale.',
      'Vista mese e vista giorno da web: anno/mese/data ora sono lo stesso orologio LCD (con menu a tendina in stile coerente per saltare a un valore non adiacente); un foglio a quadretti leggermente storto spunta dietro ai pulsanti dell\'header, che ora resta fisso in cima allo schermo scorrendo le note del mese. Rimosso il pulsante "Oggi" e il vecchio foglio col nome del giorno/mese.',
      'Vista giorno: la data resta un testo scritto a mano con evidenziatore (qui non si può modificare direttamente, solo di un giorno alla volta) invece dell\'orologio, per non trarre in inganno.',
      'Andamento e Statistiche da web: stesso foglio a quadretti e stesso orologio LCD per l\'anno; titolo con font a mano ed evidenziatore come nel resto dell\'app; anno centrato in pagina; grafico dell\'andamento più basso e con testi coerenti col resto della pagina.',
      'Vista nota (mobile e web): tag aggiunti ora hanno la stessa targhetta in legno degli altri elementi; targhetta della tab attiva (mobile e web) con lo stesso bordo e incisione delle altre targhette in legno.',
      'Impostazioni: rimosse le descrizioni sotto ogni categoria; "Esci" ed "Elimina account" ora sono un\'unica categoria "Account" anche da web (come già in mobile).',
      'Barra laterale web: "Calendario" resta evidenziato anche nella vista giorno e nell\'editor nota.',
      'Corretti alcuni bug: dropdown di mese/anno che a volte uscivano dallo schermo da telefono, dropdown scambiati fra loro nella vista mese da telefono, popup dell\'orario che si apriva sempre ancorato al primo orologio invece di quello cliccato.',
    ],
  },
  {
    version: '0.48.0',
    date: '2026-09-16 12:00',
    changes: [
      'Vista giorno da telefono: "nuova nota" ora offre la scelta fra Gemini e manuale, come nelle altre viste. Il cartoncino della nota non copre più gli orari né la riga rossa del margine, le foto sono più grandi e il bordo strappato è meno caotico (esteso anche alla vista web).',
      'Vista giorno da web: risolto un bug per cui le targhette con i nomi delle persone potevano sovrapporsi al cartoncino della nota; ora hanno anche la stessa leggera rotazione della vista mese.',
      'Vista nota da telefono: risolto il calendario che si "schiacciava" dentro il pulsante invece di aprirsi sopra il resto; pulsanti indietro/elimina più grandi; orari e data non si troncano più; font più leggibile; foto in stile polaroid come in vista mese.',
      'Vista nota da web: il foglio ha i forellini di un raccoglitore ad anelli; i pulsanti per aggiungere foto/persone/tag/canzoni/luogo sono ora targhette rettangolari in colonna che diventano una targhetta in legno una volta aggiunto un contenuto; il contenuto aggiunto compare sotto il foglio in colonne separate, con la stessa estetica della vista mese (targhette persona, francobollo, disco, polaroid).',
      'Barra dell\'umore (mobile e web): ridisegnata più volte nel corso della giornata, ora è un bastoncino colorato semplice, senza bagliore eccessivo, uguale su entrambe le viste.',
      'Pulsanti "aggiungi" da telefono (persone/tag/canzoni/luogo/foto): una volta aggiunto un elemento diventano un dischetto in legno leggermente sfasato (non più un indicatore piccolo), con icona e conteggio.',
      'Sfondo delle viste nota (telefono e web) leggermente più scuro del foglio, per distinguerli meglio.',
    ],
  },
  {
    version: '0.47.0',
    date: '2026-09-15 19:10',
    changes: [
      'Impostazioni → Aspetto: il cursore a matitina ora è facoltativo ("Cursore del mouse: Windows / Matitina"), spento di default — resta quello di Windows finché non lo si attiva.',
      'Statistiche: meno grana di cartone sulle targhette, etichette di sezione ("Persone più presenti", "Giorni migliori"...) più leggibili, numeri di riepilogo meno marcati, recap dell\'anno spostato in fondo e colorato di giallo per segnalarlo provvisorio. Da telefono, le liste di persone/giorni/note mostrano solo le prime voci con un pulsante "Mostra altri".',
      'Ricerca da web allineata a quella da telefono: sezione "Canzoni" con filtro dedicato, "Note con luoghi" spostato dentro "Luogo", Tag ora collassabile, "Ordina per" in verticale, tolta la sezione "Contenuto" e la barra del mood.',
    ],
  },
  {
    version: '0.46.0',
    date: '2026-09-15 18:20',
    changes: [
      'Cursore del mouse a forma di matitina in tutta l\'app, con varianti diverse a seconda di cosa c\'è sotto: normale, un piccolo scintillio quando si passa su un elemento cliccabile, in verticale con la punta in basso sui campi di testo, e con un anello tratteggiato attorno alla punta sui pulsanti mentre un\'operazione è in corso.',
      'Barra laterale web: il colore della targhetta in legno della voce selezionata è più chiaro.',
    ],
  },
  {
    version: '0.45.0',
    date: '2026-09-15 15:45',
    changes: [
      'Skin "Pagine" ora è l\'unica in tutta l\'app: tolti gli stili alternativi (Disegnata, Bacheca, Elenco) sia da Impostazioni → Aspetto che dal codice — meno codice morto, un solo linguaggio visivo.',
      'Vista giorno: il colore del cartoncino di ogni nota ora segue il gradiente del mood in modo continuo, non più a scatti di 4 fasce colore.',
      'Colori del mood (Impostazioni → Dati utente): anche gli estremi ("Pessimo"/"Ottimo") si possono spostare, trascinando i pallini direttamente sul gradiente invece di scrivere un numero.',
      'Impostazioni: "Esci" ed "Elimina account" ora in un\'unica sezione "Account"; i sotto-pannelli (Persone, Tag, Luoghi...) hanno la stessa carta/grana del resto dell\'app invece del vecchio bordo colorato; tessera profilo con foto quadrata e un solo pulsante "Modifica dati" per tutti i campi insieme.',
      'Ricerca da telefono: nuovo blocco "Canzoni" con tutte le canzoni salvate come filtro, "Note con luoghi" spostato dentro "Luogo", sezioni Tag e Ordina per collassabili, contenitori più leggibili, tolti il pulsante Calendario e la barra del mood ridondanti.',
      'Pulsante "indietro" ingrandito nelle viste giorno, ricerca, nota e Impostazioni; corretto un bug grafico per cui le targhette persone/luogo/canzone in vista mese (telefono) potevano restare invisibili su alcuni schermi reali.',
      'Barra laterale web: la voce di menu attiva ora è un vetrino con cornice di legno chiaro (venatura vera) al posto del semplice sfondo più chiaro.',
    ],
  },
  {
    version: '0.44.0',
    date: '2026-09-15 13:37',
    changes: [
      'Indirizzo del server PocketBase modificabile senza ricompilare: visibile e cambiabile dalla pagina di accesso (web e mobile) e da Impostazioni → tessera profilo. Cambiarlo da Impostazioni disconnette (il token vale solo per il server precedente): si rimanda al login. Non compare nella tessera della barra laterale.',
    ],
  },
  {
    version: '0.43.0',
    date: '2026-09-15 13:29',
    changes: [
      'Vista mese da telefono, skin "Pagine": contatori persone/luogo/canzone più leggibili (testo e sfondo più marcati), numero dell\'umore spostato di un filo a sinistra così le targhette a punta non lo tagliano più, barra superiore e inferiore non sembrano più "staccate" dal cartoncino sotto (mancava l\'ombra a terra).',
      'Barra inferiore da telefono: il pulsante "nuova nota" è ora centrato con una texture di cartone chiaro e un bordo tratteggiato bianco, la lente di ricerca è tutta a sinistra e il profilo tutto a destra. Il pulsante Gemini separato è sparito: "nuova nota" ora apre una scelta fra Gemini e manuale.',
    ],
  },
  {
    version: '0.42.0',
    date: '2026-09-15 11:44',
    changes: [
      'Pagina di accesso (mobile): stesso modulo della versione web — cartoncino tenuto da nastro adesivo e una puntina, schede Accedi/Registrati "a matita" che diventano inchiostro pieno da selezionate — con un\'intestazione di carta strappata più corta al posto del pannello a due fogli, pensata per lo schermo stretto.',
    ],
  },
  {
    version: '0.41.0',
    date: '2026-09-15 11:23',
    changes: [
      'Pagina di accesso (web): rifatta in stile "Pagine" — pannello sinistro di cartoncino strappato con un assaggio di nota/foto/persone, modulo a destra tenuto da nastro adesivo e una puntina, schede Accedi/Registrati "a matita" che diventano inchiostro pieno da selezionate.',
    ],
  },
  {
    version: '0.40.0',
    date: '2026-09-14 23:55',
    changes: [
      'Statistiche (web e mobile): rifatta in stile "Pagine" — le 3 metriche in cima sono scontrini con foro e riga tratteggiata, il recap IA è un sotto-cartoncino con bordo colorato, "Persone più presenti" e le liste di giorni/note migliori e peggiori sono strisce di biglietti come in Cerca.',
      'Editor nota (web e mobile): rifatto in stile "Pagine" — la colonna con data/orario/mood/immagini/persone/tag/canzoni/luogo è una pila di sotto-cartoncini, e dove si scrive è un vero foglio con margine e righe come in vista giorno, con due nastri adesivi in alto. Da telefono, orario e data sono targhette dorate e la barra in basso riusa lo stesso materiale delle altre barre mobile.',
    ],
  },
  {
    version: '0.39.1',
    date: '2026-09-14 22:52',
    changes: [
      'Fix: rimosso il filtro decorativo rimasto su altri elementi delle note (contatori compatti persone/luogo/canzone e nastro della polaroid in vista mese e vista giorno da telefono, striscia dietro il numero del giorno, sfondo del cartoncino in vista giorno) — i due interventi precedenti (v0.35.1 e v0.37.1) avevano coperto solo bordo-cella, sfondo-nota ed etichetta-mood della vista mese, non bastava: il glitch grafico su alcune note in WebView Android dovrebbe ora sparire del tutto.',
    ],
  },
  {
    version: '0.39.0',
    date: '2026-09-14 22:36',
    changes: [
      'Cerca (vista mobile): rifatta in stile "Pagine" — stessi sotto-cartoncini per ogni filtro (Periodo, Mood, Testo, Luogo, Persone, Tag, Contenuto, Ordina per, Numero massimo) e le stesse pillole già portate sul web, con contorno a matita che diventa inchiostro nero pieno da selezionate; "Luogo" ora è un accordion chiudibile come "Persone"; i risultati sono una striscia di biglietti invece di card sciolte.',
    ],
  },
  {
    version: '0.38.0',
    date: '2026-09-14 21:24',
    changes: [
      'Impostazioni (vista mobile): rifatta in stile "Pagine" — tessera profilo identica a quella web (con nome, email e password modificabili sul posto, prima non c\'era), sezioni a cartoncino a quadretti apri/chiudi, sotto-cartoncini colorati per Persone/Tag/Luoghi/Canzoni/Immich/Gemini/Spotify, "Elimina account" ora è un cartoncino rosso sempre visibile invece di un semplice link.',
    ],
  },
  {
    version: '0.37.1',
    date: '2026-09-14 20:06',
    changes: [
      'Vista mese da telefono (skin "Pagine"): rimosso il filtro decorativo dai tre elementi che si ripetono più spesso a schermo (bordo cella, sfondo nota, etichetta mood) — il precedente intervento (v0.35.1) ne aveva tolti solo 4 sulla barra, non bastava: con fino a 25-30 note visibili insieme il numero di filtri SVG attivi contemporaneamente restava troppo alto e causava il glitch grafico su alcuni telefoni Android.',
      'Vista mese: la larghezza dell\'etichetta del mood ora tiene conto del numero di cifre, per evitare che un punteggio "100" venga tagliato dal ritaglio decorativo dell\'etichetta.',
    ],
  },
  {
    version: '0.37.0',
    date: '2026-09-14 19:44',
    changes: [
      'Cerca (vista web): rifatta in stile "Pagine" — ogni gruppo di filtri (Periodo, Mood, Testo, Luogo, Persone, Tag, Contenuto, Ordina per, Numero massimo) è un sotto-cartoncino invece di un riquadro grigio anonimo.',
      'Cerca: le pillole (luoghi/persone/tag/mood/ordinamento) sono ritagli di carta col contorno a matita, che diventano inchiostro nero pieno quando selezionate; "Applica filtri" è lo stesso cartoncino nero degli altri pulsanti principali.',
      'Cerca: i risultati sono un\'unica striscia di biglietti invece di card sciolte una sotto l\'altra.',
    ],
  },
  {
    version: '0.36.0',
    date: '2026-09-14 19:32',
    changes: [
      'Andamento (vista mobile): stessi materiali già portati sul web — foglietto a quadretti scuro sovrapposto per "Umore nell\'anno" e "Mese per mese", grafico su carta millimetrata, ogni mese come biglietto — scalati per il telefono (grafico più alto, mesi alterni, niente numeri sull\'asse, come già faceva il grafico).',
    ],
  },
  {
    version: '0.35.1',
    date: '2026-09-14 19:14',
    changes: [
      'Barre mobile: risolti due bug della v0.35.0 — i pulsanti del footer (profilo/cerca/Gemini/nuova nota) erano impilati uno sopra l\'altro invece che in riga (mancava una regola CSS), e il pulsante della lente ora è un cerchio pulito in ogni caso.',
      'Vista mese/giorno da telefono: tolto un filtro decorativo dalle nuove barre superiore e inferiore (restavano comunque un filo irregolari) — troppi filtri SVG attivi insieme causavano un artefatto grafico ("glitch") sulle note in alcuni telefoni Android.',
    ],
  },
  {
    version: '0.35.0',
    date: '2026-09-14 18:56',
    changes: [
      'Barre mobile (superiore e inferiore): rifatte in stile "Pagine" — due fogli di cartoncino sovrapposti, come la barra laterale web, con un bordo seghettato irregolare sul foglio dietro invece di un\'ombra piatta.',
      'Mese, anno e la data in vista giorno sono ora targhette uniche di plastica giallo ocra con le frecce incorporate (tocca per aprire il selettore come prima, oppure usa le frecce per spostarti di un mese/anno/giorno alla volta).',
      'Vista giorno: l\'icona per cambiare aspetto della pagina non è più una matita (sembrava "scrivi qui") — ora due foglietti sovrapposti.',
      'Selettore Calendario/Andamento/Statistiche: un\'unica striscia di cartoncino bianco, con una targhetta in metallo dorato che inquadra la scheda attiva invece di uno sfondo scuro che trasla.',
      'Footer: "Opzioni" è ora la tua foto profilo (come la tessera in barra laterale), "Filtri" una lente d\'ingrandimento in ottone; "Nuova nota"/Gemini restano cartoncino nero pieno.',
    ],
  },
  {
    version: '0.34.0',
    date: '2026-09-14 12:22',
    changes: [
      'Andamento (vista web): rifatta in stile "Pagine" — il grafico dell\'umore e l\'elenco mese-per-mese sono ora due fogli con un\'etichetta a quadretti sovrapposta (come l\'intestazione della vista giorno), non più un riquadro semplice.',
      'Andamento: il grafico ha uno sfondo a quadretti da carta millimetrata e 3 nuovi colori per le linee (grafite/penna blu/evidenziatore corallo); ogni mese nell\'elenco è un biglietto col nome per esteso e una mini-barra per ogni giorno.',
    ],
  },
  {
    version: '0.33.0',
    date: '2026-09-11 17:33',
    changes: [
      'Skin "Pagine" (vista giorno): il foglio è largo quanto la vista mese, senza più un tetto in pixel proprio; da telefono le 24h si comprimono per stare tutte nello schermo (come da web), invece di scorrere.',
      'Impostazioni: la data di iscrizione nella tessera profilo ora è completa (giorno e mese, non solo l\'anno); la foto profilo si allunga fino alla riga "Password" e ha due nastri adesivi decorativi; nome ed email sono in grassetto invece che a mano libera, per leggerli meglio; le strisce diagonali di sfondo sono più tenui; gli header delle sezioni si sollevano leggermente al passaggio del mouse.',
      'Barra laterale web: nome ed email nella tessera un po\' più piccoli (erano cresciuti troppo con gli ultimi ritocchi).',
      'Pagina di ricerca: "Luogo" ora si può richiudere come già "Persone".',
    ],
  },
  {
    version: '0.32.0',
    date: '2026-09-11 15:44',
    changes: [
      'Impostazioni (vista web): rifatte in stile "Pagine" — l\'intestazione di ogni sezione è ora un cartoncino a quadretti a tutta larghezza (icona, titolo e descrizione insieme), e ogni gruppo di parametri (Tema, Font, Persone, Luoghi...) ha il suo sotto-cartoncino con un bordo colorato.',
      'Impostazioni: la tessera del profilo in cima ora è la stessa finta carta d\'identità della barra laterale (timbro in filigrana, firma, striscia), con nome, email e una nuova password modificabili sul posto con una matitina.',
      'Impostazioni: "Elimina account" è ora una sezione vera (cartoncino rosso, sempre visibile) invece di un semplice link in fondo alla pagina.',
    ],
  },
  {
    version: '0.31.0',
    date: '2026-09-11 14:26',
    changes: [
      'Barra laterale web: animazioni al passaggio del mouse su card profilo, Calendario/Andamento/Statistiche e Gemini; "Nuova nota" solleva ed ingrandisce un po\' di più. Nome ed email nella tessera +50%, foto profilo con angoli arrotondati e un contorno.',
      'Skin "Pagine" (vista mese web): il cartoncino dei titoli si allarga in base a quanto testo contiene invece di una larghezza fissa uguale per ogni giorno.',
      'Skin "Pagine": rimosso il segnalino sulla mappa del francobollo (si confondeva con la puntina che lo tiene fermo), sia in vista mese che vista giorno.',
      'Skin "Pagine" (vista giorno web): foglio ancora +35%; testo del contenuto nota più chiaro (meno peso rispetto al titolo); rovinatura del cartoncino più varia (strappi profondi misti a sfilacciature).',
      'Skin "Pagine": le targhette con il nome delle persone ora hanno lo stesso colore in vista mese e vista giorno (prima la vista giorno perdeva sfondo e testo del colore, restava solo il bordo) — il colore è generato dal nome e salvato sulla persona.',
    ],
  },
  {
    version: '0.30.0',
    date: '2026-09-11 12:29',
    changes: [
      'Barra laterale web: rifatta nello stile "Pagine" — tutta la barra è un cartoncino strappato con un secondo foglio che intravede da dietro; "Nuova nota"/Gemini sono cartoncino nero pieno, i 3 link principali ritagli di carta col contorno a matita tratteggiato, "Cerca" una lente d\'ingrandimento, "Importa" un post-it giallo.',
      'Barra laterale web: i dati utente sono su una finta carta d\'identità in basso, con un numero di tessera e una firma disegnata generati da nome+email (sempre gli stessi per te); la versione dell\'app è accanto al nome "Annales" in alto.',
      'Impostazioni → Colori del mood: i 6 pallini colorati sopra il gradiente sono ora cliccabili (aprono il selettore colore) e si possono spostare le 4 soglie interne con un numero percento; rimossa la legenda separata sotto.',
      'Impostazioni → Dati utente: nuova sezione "Canzoni" con l\'elenco delle canzoni collegate alle note e quante note usa ciascuna.',
      'Skin "Pagine": il colore dei cartoncini del mood è ancora più saturo (altro +15%, ora +32% sul colore originale).',
      'Skin "Pagine" (vista mese mobile): la foto è ingrandita del 15% e il cartoncino delle note spostato ancora più a sinistra per compensare lo spazio.',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-09-11 09:03',
    changes: [
      'Skin "Pagine" (vista giorno web): il foglio è più largo del 35% e il cartoncino della nota più largo (40–55% invece di 32–45%), per dare più spazio a titolo e contenuti; il testo del contenuto è più scuro e leggibile, e sfuma più tardi verso il basso.',
      'Skin "Pagine" (vista giorno web): il foglio non si scorre più, sta tutto nella pagina — le 24h si comprimono nello spazio disponibile invece che in un\'altezza fissa (la vista giorno da telefono continua a scorrere).',
      'Skin "Pagine": il colore dei cartoncini del mood (vista mese e vista giorno, web e telefono) è il 15% più saturo — le fasce d\'umore si distinguono meglio.',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-09-11 08:46',
    changes: [
      'Skin "Pagine" (vista giorno mobile): stesso stile appena portato per il mese. Il cartoncino della nota è spostato verso l\'estremità sinistra del foglio (esce anche un filo dalla pagina) e sta sulla stessa riga di contatori e foto invece che sopra.',
      'Vista giorno mobile: persone, luogo e canzoni diventano semplici contatori (icona + numero) impilati in verticale fra cartoncino e foto, al posto delle targhette coi nomi, del francobollo/mappa e del dischetto CD — non c\'è spazio per i nomi. Luogo in rosso, canzone in verde.',
      'Vista giorno mobile: la foto di una nota diventa sempre una sola diapositiva; con più foto nella stessa nota scorrono a carosello nella stessa, con puntini che indicano quante sono.',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-09-11 08:37',
    changes: [
      'Skin "Pagine" (vista mese mobile): il cartoncino dei titoli è spostato verso l\'estremità sinistra del foglio (esce anche un filo dalla pagina) per recuperare spazio, e sta sulla stessa riga di targhette e foto invece che sopra.',
      'Vista mese mobile: le targhette di luogo e canzone diventano semplici contatori (icona + numero), come quella delle persone, invece di mostrare nome/titolo — occupavano troppo spazio; impilate in verticale fra cartoncino e foto. Luogo in rosso, canzone in verde.',
    ],
  },
  {
    version: '0.26.0',
    date: '2026-09-11 08:18',
    changes: [
      'Skin "Pagine" (vista mese mobile): il cartoncino dei titoli si estende a tutta larghezza invece di fermarsi all\'80%/60%.',
      'Vista mese mobile: persone, luogo e canzone diventano targhette compatte con icona (persone: numero; luogo: nome col segnaposto; canzone: titolo con una musicassetta), al posto di avatar, francobollo e dischetto — se un giorno ha più luoghi o canzoni, il nome scorre a turno nella stessa targhetta.',
      'Vista mese mobile: le foto diventano sempre una sola diapositiva (prima due polaroid affiancate); con più foto scorrono a carosello nella stessa, con puntini che indicano quante sono.',
    ],
  },
  {
    version: '0.25.0',
    date: '2026-09-11 08:02',
    changes: [
      'Skin "Pagine" anche per la vista giorno (web e telefono): il giorno diventa un foglio di diario con una timeline 24h a sinistra (l\'altezza del blocco segue la durata della nota) e le note come cartoncini strappati del colore del mood, titolo evidenziato in nero; a destra persone, luogo, canzone e foto come nella vista mese.',
      'La skin "Pagine" per la vista giorno scorre come una vera pagina, invece di schiacciarsi in una schermata come "Normale"/"Disegnata".',
      'Aspetto → Vista giorno: il pulsante dello stile ora cicla tra Normale, Disegnata e Pagine.',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-09-11 00:17',
    changes: [
      'Skin "Pagine" ora anche da telefono: se in Aspetto → "Vista mese" scegli "Pagine", la vista mese del telefono diventa pagine di diario impilate come sul web (carta, linguetta dell\'umore, nastro "· oggi ·", decori di sfondo).',
      'Su telefono l\'impaginato della skin "Pagine" passa in verticale: cartoncino della nota a tutta larghezza, poi persone, luogo e canzone in fila sotto, foto come piccola polaroid.',
      'Aspetto: il selettore "Vista mese" non è più marcato "(web)"; "Bacheca" resta solo da web.',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-09-11 00:00',
    changes: [
      'Skin "Pagine" (vista mese web): il cartoncino della nota segue i colori del mood personalizzati in Impostazioni (prima restava sui colori predefiniti).',
      'Skin "Pagine": giorno e cartoncino ancorati saldamente in alto a sinistra, senza più il vuoto sotto che li faceva sembrare centrati; tolto il segno rosso ai lati del giorno corrente (basta il nastro "oggi").',
      'Importa "Da foglio (testo)": ogni passata elabora al massimo 10 giorni per non saturare Gemini; i restanti si lavorano rilanciando con lo stesso file (i giorni già salvati vengono saltati).',
    ],
  },
  {
    version: '0.22.0',
    date: '2026-09-10 23:25',
    changes: [
      'Skin "Pagine" (vista mese web): giorno e cartoncino dei titoli ancorati in alto a sinistra; il giorno corrente è segnato da un nastro adesivo rosso ("· oggi ·") che attraversa il centro alto della pagina, dritta e sollevata.',
      'Skin "Pagine": decori di sfondo su tutta la pagina con animali e natura (uccelli, pesci, cervi, alberi, felci) sotto ai disegnini a tema umore; disegni più piccoli e più numerosi.',
      'Skin "Pagine": nomi delle persone in grassetto e più leggibili, con più colori (tinta stabile per persona); dischetto della canzone più grande con titolo e autore ingranditi.',
      'Skin "Pagine": i giorni futuri restano pagine vuote e semplici (niente linguetta dell\'umore né testo segnaposto); foglio e cartoncini un po\' più larghi.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-09-10 22:55',
    changes: [
      'Impostazioni: la sezione "Elenchi personali" diventa "Dati utente" e sale sopra le Integrazioni. Raccoglie i dati legati all\'account, sincronizzati su tutti i dispositivi.',
      'Dati utente → Colori del mood: si personalizzano i sei colori con cui l\'app rappresenta l\'umore delle note — dalla barra del mood alle pagine del mese alle statistiche — con anteprima e "Ripristina predefinito". La scelta è salvata sull\'account.',
      'Dati utente → Luoghi: si modificano nome e posizione di un luogo direttamente dall\'elenco (posizione scelta sulla mappa), senza doverne creare uno nuovo e sostituire il vecchio. La modifica si propaga a tutte le note collegate.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-09-10 22:30',
    changes: [
      'Skin "Pagine" (vista mese web) ridisegnata a colonne: giorno in alto a sinistra, titoli su un cartoncino strappato del colore dell’umore, poi le persone, poi luogo e canzone, infine le fotografie.',
      'Skin "Pagine": il luogo è un francobollo con dentini e puntina che, se la nota ha coordinate, mostra una vera mini-mappa; la canzone è un dischetto con la copertina dell’album e, sotto, titolo e autore.',
      'Skin "Pagine": giorni feriali scritti in nero (weekend in rosso), linguetta dell’umore come nastro adesivo dello stesso colore del cartoncino, segnalibro rosso "oggi" sul giorno corrente.',
      'Skin "Pagine": più disegnini e frammenti dei titoli sullo sfondo, più piccoli e "dipinti"; foglio più largo.',
    ],
  },
  {
    version: '0.19.1',
    date: '2026-09-10 22:05',
    changes: [
      'Importa (solo web): nuova modalità "Da foglio (testo)" per migrare il vecchio diario tenuto su Google Fogli — si incolla o si carica l\'export TSV/CSV e si indicano le colonne (giorno, testo, titolo, voto).',
      'Ogni giornata viene divisa in una o più note: Gemini sceglie solo dove tagliare, senza riscrivere il testo, così il contenuto originale è sempre coperto per intero. In revisione la suddivisione si corregge con "Fondi con precedente/successiva" e "Spezza qui", con avvisi per i casi dubbi (troppi blocchi, blocco senza orario, ecc.) e il testo grezzo del giorno sempre a vista.',
      'Colonna "mese" opzionale: indicandola si può incollare più mesi in una volta (anche l\'anno intero) e lavorarli uno alla volta cambiando il menu Mese.',
      'I giorni che hanno già note salvate nel diario vengono saltati in automatico: si può ridare in pasto lo stesso file senza ricreare quanto già importato.',
      'La schermata "Importa da immagine" diventa "Importa", con l\'interruttore Da foglio / Da immagine.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-09-10 21:10',
    changes: [
      'Impostazioni → Aspetto: nuovo sfondo "Immagine" — si carica una foto personale (resta solo sul dispositivo, ridimensionata).',
      'Skin "Pagine" (vista mese web): foglio più largo, testata del giorno in tonalità oro, niente più contatore di note, foto +15%.',
      'Skin "Pagine": nomi delle persone su più colonne a misura del nome; se il giorno ha un luogo compare un francobollo con mini-mappa, se ha una canzone un dischetto con la copertina.',
      'Skin "Pagine": più disegnini a tema umore e frammenti dei titoli delle note sbiaditi sullo sfondo, con qualche macchia di caffè; bordi del foglio e linguette leggermente irregolari.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-09-10 19:25',
    changes: [
      'Skin "Pagine" (vista mese web) rifinita: foglio più largo, carta con grana/screziatura e bordi appena irregolari, disegnini a tema umore appena accennati nella metà destra del foglio, rotazione delle pagine più contenuta.',
      'Linguetta dell’umore: solo il numero (senza scritta "umore") e forma diversa per fascia — gagliardetto, pillola, bordo ondulato o frastagliato.',
      'Giorni con foto: due polaroid affiancate quando ci sono almeno due fotografie, con nastro adesivo più visibile; angoli piegati o bordo strappato assegnati a caso ad alcune pagine.',
      'Nomi delle persone del giorno su etichette di nastro (con foto del volto se disponibile da Immich), in colonna nello spazio tra le note e le fotografie.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-09-10 17:07',
    changes: [
      'Vista mese (web): nuova skin "Pagine" — i giorni come pagine di diario impilate, con linguetta dell’umore a lato, testata rossa nei weekend, titoli in grafie diverse e polaroid attaccate col nastro per i giorni con foto.',
      'Vista mese (web): l’interruttore nell’header è ora a tre — Elenco / Bacheca / Pagine.',
      'Impostazioni → Aspetto: tre nuovi sfondi — Filigrana (carta vergata), Sughero e Legno (assi irregolari).',
    ],
  },
  {
    version: '0.15.1',
    date: '2026-09-09 15:11',
    changes: [
      'Statistiche (web): settimana migliore, giorno più su di morale, tag più usato e luogo più frequente affiancati alla lista "Persone più presenti" invece che in fondo alla pagina.',
      'Changelog ripulito: le versioni minori sono state accorpate in voci più ampie, per un elenco più corto da scorrere.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-09-09 11:26',
    changes: [
      'Statistiche: nuove voci "Note migliori" e "Note peggiori" (le 5 note singole con mood più alto/basso); "Persone più presenti" affiancata a settimana/giorno/tag/luogo migliori (web).',
      'Impostazioni: Persone, Tag e Luoghi raggruppati sotto "Elenchi personali", come già le Integrazioni.',
      'Ricerca: il filtro Luogo mostra i luoghi salvati come targhette da scegliere, non più una barra di testo.',
      'Luoghi già scritti in note esistenti vengono importati automaticamente nell\'elenco alla prima apertura di Impostazioni.',
    ],
  },
  {
    version: '0.14.1',
    date: '2026-09-09 10:59',
    changes: [
      'Nuova nota con Gemini: prompt salvato in automatico se la generazione fallisce (recuperato riaprendo il dialog), istruzioni personalizzate impostabili in Impostazioni, placeholder vario invece di un unico esempio fisso.',
      'Impostazioni: nuova sezione "Luoghi" (creazione, cancella/sostituisci se collegato a note); "Luoghi salvati" riproposti quando ne aggiungi uno a una nota.',
      'Statistiche: rimosso "Giorno più pieno"; giorni migliori/difficili mostrano tutte le note del giorno; "Giorno più su di morale" e "Settimana migliore" cliccabili (aprono le note corrispondenti).',
      'Impostazioni → Novità: changelog collassabile per versione.',
      'Web: "Esci"/"Elimina account" spostati in fondo alle Impostazioni come su mobile; sidebar senza più il pulsante di logout nella riga profilo, avatar più grande.',
      'Nuovi default per chi non ha ancora personalizzato l\'aspetto: tema chiaro, font tondeggiante, animazioni attive, sfondo rigato.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-09-08 17:01',
    changes: [
      'Impostazioni → Aspetto: stili grafici alternativi per una singola vista (interruttore rapido anche dentro la vista).',
      'Vista giorno "Disegnata" (web + mobile): sfondo carta, font a mano, righe/cornici tracciate a mano.',
      'Vista mese "Bacheca" (solo web): i giorni con contenuti diventano cartoncini su una bacheca di sughero, uniti da filo rosso se condividono persona/tag.',
      'Statistiche: le persone più presenti mostrano l\'avatar su targhette con bordo.',
      'Impostazioni (web): si possono cambiare nome utente ed email dell\'account; versione dell\'app spostata nella colonna di sinistra.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-09-08 15:20',
    changes: [
      'Micro-animazioni in tutta l\'app (transizioni, liste a cascata, contatori che salgono, skeleton di caricamento); interruttore "Animazioni" e scelta dello sfondo (8 texture stile diario) in Impostazioni → Aspetto.',
      'Selezione persone (nota e ricerca) limitata alle 10 più frequenti con "Mostra tutte"; conteggio note accanto a ogni persona in Impostazioni.',
      'Statistiche: classifica delle 10 persone più presenti, giorni migliori/difficili estesi a 5+5 con i titoli, nuove voci "Settimana migliore" e "Giorno più su di morale".',
    ],
  },
  {
    version: '0.10.9',
    date: '2026-09-07 22:41',
    changes: [
      'Vista mese (web) ridisegnata: anno/mese in un\'unica placchetta con frecce inglobate e menu a tendina per saltare a un valore lontano, righe centrate e più strette; titoli delle note sfumano gradualmente in base al mood invece di comparire a tutto o niente.',
      'Vista giorno ridisegnata (web come mobile): giornata sempre tutta a schermo senza scorrere, sfondo e righe orarie a tutta larghezza.',
      'Selettore persone: le più frequenti separate visivamente dal resto; Scegli da Immich con calendario "Vai al giorno" e fallback ad anteprima se l\'originale di una foto non è più disponibile.',
      'Ricerca (web): filtro persone collassabile con foto, risultati su una sola colonna.',
      'Eliminazione account dalle Impostazioni con doppia conferma (cancella anche note, persone e tag).',
    ],
  },
  {
    version: '0.9.6',
    date: '2026-09-07 16:33',
    changes: [
      '"In questo giorno" in vista mese, ricerca per testo, swipe tra giorni, tema chiaro/scuro/sistema e scelta del font, import/export in JSON o Markdown, coda offline, recap dell\'anno con Gemini, "nota dalle foto di ieri".',
      'Sicurezza: note, persone e tag diventano per-utente; registrazione pubblica gestita dalle regole del database.',
      'Changelog con data/ora per versione; versione dell\'app nella pagina di login.',
    ],
  },
  {
    version: '0.4.2',
    date: '2026-09-07 14:28',
    changes: [
      'Prime versioni dell\'app: importazione note da screenshot con Gemini (selettori completi per persone/tag/luogo/canzoni), Impostazioni raggruppate in sezioni collassabili con guide per i token delle integrazioni.',
      'Selettore persone con le più usate in cima; cancellare una persona collegata a note chiede se sostituirla o rimuoverla ovunque.',
      'Vista giorno: carosello per le note con più foto. Vista mese: titoli di tutte le note del giorno, non solo quelle con umore estremo.',
    ],
  },
]
