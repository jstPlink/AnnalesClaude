/// <reference path="../pb_data/types.d.ts" />

// Un utente può eliminare il proprio account dalla pagina Impostazioni:
// `users.deleteRule = "id = @request.auth.id"` (di solito è già il default
// della collection auth, questa migration lo rende esplicito).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.deleteRule = 'id = @request.auth.id'
    return app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.deleteRule = 'id = @request.auth.id'
    return app.save(users)
  },
)
