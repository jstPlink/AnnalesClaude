/// <reference path="../pb_data/types.d.ts" />

// Gradiente del mood personalizzato: array JSON di 6 colori esadecimali
// (posizioni fisse 0 / .2 / .4 / .6 / .8 / 1 — vedi src/lib/mood.js).
// Salvato sull'utente come geminiApiKey/geminiCustomInstructions, così il
// gradiente segue l'account su tutti i dispositivi. Vuoto/assente = usa il
// gradiente predefinito dell'app.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new Field({ type: 'json', name: 'moodGradient', maxSize: 2000 }))
    return app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('moodGradient')
    return app.save(users)
  },
)
