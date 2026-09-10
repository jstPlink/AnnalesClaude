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
