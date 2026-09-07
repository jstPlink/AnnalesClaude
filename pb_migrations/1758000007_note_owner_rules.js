/// <reference path="../pb_data/types.d.ts" />

// La privacy passa dal "chiudere la registrazione" all'"ogni nota è del suo
// utente":
//  - la registrazione pubblica resta aperta (users.createRule = "");
//  - le regole della collection `note` diventano per-proprietario, così un
//    nuovo account NON vede le note altrui (prima bastava essere loggati).
//
// Presuppone che ogni nota abbia il campo `user` valorizzato: lo fa la
// migration 1758000006 (aggiunta campo + backfill).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)

    const note = app.findCollectionByNameOrId('note')
    note.listRule = 'user = @request.auth.id'
    note.viewRule = 'user = @request.auth.id'
    note.createRule =
      '@request.auth.id != "" && @request.data.user = @request.auth.id'
    note.updateRule = 'user = @request.auth.id'
    note.deleteRule = 'user = @request.auth.id'
    app.save(note)
  },
  (app) => {
    const note = app.findCollectionByNameOrId('note')
    const authed = "@request.auth.id != ''"
    note.listRule = authed
    note.viewRule = authed
    note.createRule = authed
    note.updateRule = authed
    note.deleteRule = authed
    app.save(note)
  },
)
