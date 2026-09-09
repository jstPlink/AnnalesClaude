/// <reference path="../pb_data/types.d.ts" />

// Istruzioni fisse (prompt personalizzato) da aggiungere a ogni richiesta
// a Gemini per "Nuova nota con Gemini" — es. tono da usare, cosa
// evidenziare, cosa evitare. Salvate sull'utente (come geminiApiKey) così
// restano le stesse su tutti i dispositivi, non solo in locale.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.add(
    new Field({ type: 'text', name: 'geminiCustomInstructions', max: 4000 }),
  )

  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.removeByName('geminiCustomInstructions')

  return app.save(users)
})
