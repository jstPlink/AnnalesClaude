/// <reference path="../pb_data/types.d.ts" />

// Recap automatici (giorno/mese/anno), generati lato server con Gemini —
// vedi pb_hooks/main.pb.js per chi li scrive (cron notturno + aggiornamento
// a cascata quando si tocca una nota di un periodo già chiuso) e
// src/lib/recaps.js per chi li legge/rigenera a mano dall'app.
//
// Una sola collection per i tre livelli invece di tre separate: stessa forma
// dei dati, query identiche, un solo indice da mantenere. `period` distingue
// "day"/"month"/"year", `key` è la chiave del periodo nello stesso formato
// già usato in giro per l'app ("YYYY-MM-DD", "YYYY-MM", "YYYY").
migrate(
  (app) => {
    try {
      if (app.findCollectionByNameOrId('recaps')) return
    } catch {
      // non esiste ancora: procede a crearla
    }

    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'recaps',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      // Creazione/aggiornamento anche dal client: serve al tasto "Rigenera"
      // in app (src/lib/recaps.js), per i periodi che il cron notturno non
      // ha ancora coperto (es. quelli passati, prima che questa funzione
      // esistesse) o quando l'utente vuole un testo diverso subito. Il cron
      // e gli hook sulle note (pb_hooks/main.pb.js) scrivono invece passando
      // da $app: bypassano queste regole, quindi non ne dipendono.
      createRule:
        '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
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
        { type: 'text', name: 'text', required: true, max: 8000 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_recaps_user_period_key ON recaps (user, period, key)',
      ],
    })

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('recaps')
    return app.delete(collection)
  },
)
