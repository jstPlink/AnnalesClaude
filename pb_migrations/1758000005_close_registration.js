/// <reference path="../pb_data/types.d.ts" />

// Chiude la registrazione pubblica: gli account della collection `users` si
// creano solo dal pannello admin di PocketBase. Prima chiunque raggiungesse
// il link poteva iscriversi e, non essendoci un proprietario sui record,
// vedere tutte le note.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  users.createRule = null
  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId('users')
  users.createRule = ''
  return app.save(users)
})
