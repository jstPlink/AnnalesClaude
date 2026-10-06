/// <reference path="../pb_data/types.d.ts" />

// Formula del mood personalizzata (Mood Lab): JSON con la curva a 7 punti del peso
// delle note, i fattori durata/persone e la curva del mese (vedi src/lib/mood.js).
// Salvata sull'utente come moodGradient, così segue l'account su tutti i dispositivi.
// Vuoto/assente = formula originale dell'app.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new Field({ type: 'json', name: 'moodFormula', maxSize: 4000 }))
    return app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('moodFormula')
    return app.save(users)
  },
)
