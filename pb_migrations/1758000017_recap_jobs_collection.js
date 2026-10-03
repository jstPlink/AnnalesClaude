/// <reference path="../pb_data/types.d.ts" />

// Coda dei recap da (ri)generare — vedi pb_hooks/main.pb.js e recap_lib.js.
//
// Prima, modificare una nota di un giorno passato faceva chiamare Gemini
// DENTRO l'hook della nota, con riprovi ogni 10 secondi: se Gemini era
// lento o sovraccarico il salvataggio restava appeso (l'app sembrava
// bloccata). Ora l'hook si limita a scrivere qui una riga (giorno da
// aggiornare) e un cron, una volta al minuto, ne evade UNA alla volta:
// le richieste a Gemini si distanziano nel tempo, le modifiche ravvicinate
// alla stessa nota si accorpano, e l'app può mostrare cosa sta succedendo
// (src/components/RecapQueueTab.jsx) leggendo questa collection.
//
// Regole: l'utente può solo LEGGERE le proprie righe; creare/modificare/
// cancellare le fa solo il server (passando da $app, che salta le regole).
migrate(
  (app) => {
    try {
      if (app.findCollectionByNameOrId('recap_jobs')) return
    } catch {
      // non esiste ancora: procede a crearla
    }

    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'recap_jobs',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      fields: [
        {
          type: 'relation',
          name: 'user',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
          required: true,
        },
        { type: 'text', name: 'period', required: true, max: 5 }, // "day" | "month" | "year"
        { type: 'text', name: 'key', required: true, max: 10 }, // YYYY-MM-DD | YYYY-MM | YYYY
        // millisecondi (epoch) da cui il lavoro è pronto: ogni nuova modifica lo
        // sposta in avanti (accorpa), un errore transitorio lo rimanda a dopo
        { type: 'number', name: 'queuedAt', required: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_recap_jobs_user_period_key ON recap_jobs (user, period, key)',
      ],
    })

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('recap_jobs')
    return app.delete(collection)
  },
)
