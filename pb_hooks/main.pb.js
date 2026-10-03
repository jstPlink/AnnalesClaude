/// <reference path="../pb_data/types.d.ts" />

// Recap automatici (giorno/mese/anno) scritti con Gemini, lato server: non
// serve aprire l'app perché restino aggiornati. Tre trigger:
//  - un cron per ciascun livello, poco dopo la mezzanotte di quando il
//    periodo finisce (giorno: ogni notte; mese: il giorno 1; anno: il 1
//    gennaio);
//  - una coda quando si crea/modifica/cancella una nota di un giorno che
//    NON è oggi: il giorno viene messo in coda e un cron al minuto ne evade
//    uno per volta (richieste a Gemini distanziate, salvare non aspetta mai).
//    Finito un giorno, se non è nel mese corrente si accoda il suo mese; finito
//    il mese, se non è nell'anno corrente, il suo anno. Una nota di oggi non
//    fa nulla: ci pensa il cron di stanotte, a giornata davvero chiusa.
//
// Questo file registra SOLO gli handler — tutta la logica vive in
// recap_lib.js, caricato con require() dentro ciascun handler. È un vincolo
// del JSVM di PocketBase, non una scelta di stile: ogni handler di
// hook/cron gira "serializzato" in un proprio contesto isolato e non vede
// funzioni definite altrove nello stesso file (fallisce con "X is not
// defined" al primo utilizzo — capitato qui il 2026-09-30, note che non si
// salvavano più). require() invece carica il modulo da un registro
// condiviso, quindi funziona da qualunque handler — vedi
// https://pocketbase.io/docs/js-overview/.
//
// I periodi CHIUSI PRIMA che questa funzione esistesse (o mai più toccati da
// allora) non hanno un recap: il cron guarda solo avanti, non recupera il
// passato da solo (richiederebbe centinaia di chiamate a Gemini in un colpo
// solo, con la chiave personale di ciascun utente — troppo fragile per un
// cron). Per quelli l'utente genera a mano dall'app col tasto
// "Genera"/"Rigenera" (src/lib/recaps.js), che scrive qui con lo stesso
// schema.

// I tre hook sulle note NON generano niente: mettono in coda (recap_jobs) il
// giorno toccato e basta, così salvare una nota resta istantaneo anche se
// Gemini è lento. Chi lavora la coda è il cron "recapQueue" qui sotto.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/recap_lib.js`).queueFromNote($app, e.record, null)
  e.next()
}, 'note')

onRecordAfterUpdateSuccess((e) => {
  let original = null
  try {
    original = e.record.original()
  } catch {
    original = null // se non disponibile si accoda solo la data attuale
  }
  require(`${__hooks}/recap_lib.js`).queueFromNote($app, e.record, original)
  e.next()
}, 'note')

onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/recap_lib.js`).queueFromNote($app, e.record, null)
  e.next()
}, 'note')

// Evade UN lavoro di coda al minuto (richieste a Gemini distanziate nel tempo).
cronAdd('recapQueue', '* * * * *', () => {
  require(`${__hooks}/recap_lib.js`).processRecapQueue($app)
})

cronAdd('dailyRecap', '30 0 * * *', () => {
  require(`${__hooks}/recap_lib.js`).runDailyRecapCron($app)
})

cronAdd('monthlyRecap', '50 0 1 * *', () => {
  require(`${__hooks}/recap_lib.js`).runMonthlyRecapCron($app)
})

cronAdd('yearlyRecap', '10 1 1 1 *', () => {
  require(`${__hooks}/recap_lib.js`).runYearlyRecapCron($app)
})
