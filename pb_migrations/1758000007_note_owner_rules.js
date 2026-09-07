/// <reference path="../pb_data/types.d.ts" />

// La privacy passa dal "chiudere la registrazione" all'"ogni nota è del suo
// utente":
//  - la registrazione pubblica resta aperta (users.createRule = "");
//  - la collection `note` ha il campo `user` (aggiunto qui se manca) e regole
//    per-proprietario, così un nuovo account NON vede le note altrui.
//
// Nota: da PocketBase v0.23 il segnaposto del corpo richiesta è
// `@request.body.*` (non più `@request.data.*`).
function fieldExists(collection, name) {
  if (collection.fields && typeof collection.fields.getByName === 'function') {
    return Boolean(collection.fields.getByName(name))
  }
  for (let i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === name) return true
  }
  return false
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)

    const note = app.findCollectionByNameOrId('note')
    if (!fieldExists(note, 'user')) {
      note.fields.add(
        new Field({
          type: 'relation',
          name: 'user',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    note.listRule = 'user = @request.auth.id'
    note.viewRule = 'user = @request.auth.id'
    note.createRule =
      '@request.auth.id != "" && @request.body.user = @request.auth.id'
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
