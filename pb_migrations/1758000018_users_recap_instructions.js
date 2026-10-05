/// <reference path="../pb_data/types.d.ts" />

// Istruzioni fisse (tono, cosa evidenziare...) aggiunte a TUTTI i riassunti
// di Gemini (recap di giorno/mese/anno), sia quelli scritti dal server di
// notte sia quelli generati a mano dall'app. Sono distinte da
// `geminiCustomInstructions`, che riguardano solo la scrittura delle note.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.add(
    new Field({ type: 'text', name: 'recapCustomInstructions', max: 4000 }),
  )

  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.removeByName('recapCustomInstructions')

  return app.save(users)
})
