/// <reference path="../pb_data/types.d.ts" />

// Rende `people` e `tags` per-utente, come già fatto per `note`:
//  - aggiunge il campo `user` (relazione singola -> users) se manca;
//  - assegna i record esistenti senza proprietario all'account personale;
//  - regole per-proprietario (un nuovo account non vede persone/tag altrui).
//
// Su un'istanza dove OWNER_ID non esiste (clone fresco) il backfill è saltato.
const OWNER_ID = 'koactdxuy0e4ef0'
const TARGET = ['people', 'tags']

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

    let owner = null
    try {
      owner = app.findRecordById('users', OWNER_ID)
    } catch {
      owner = null
    }

    for (const name of TARGET) {
      const col = app.findCollectionByNameOrId(name)

      if (!fieldExists(col, 'user')) {
        col.fields.add(
          new Field({
            type: 'relation',
            name: 'user',
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: false,
          }),
        )
      }
      col.listRule = 'user = @request.auth.id'
      col.viewRule = 'user = @request.auth.id'
      // Da PocketBase v0.23 il corpo richiesta è `@request.body.*`.
      col.createRule =
        '@request.auth.id != "" && @request.body.user = @request.auth.id'
      col.updateRule = 'user = @request.auth.id'
      col.deleteRule = 'user = @request.auth.id'
      app.save(col)

      if (owner) {
        const recs = app.findAllRecords(name)
        for (const rec of recs) {
          const cur = rec.get('user')
          const empty = !cur || (Array.isArray(cur) && cur.length === 0)
          if (empty) {
            rec.set('user', OWNER_ID)
            app.save(rec)
          }
        }
      }
    }
  },
  (app) => {
    const authed = "@request.auth.id != ''"
    for (const name of TARGET) {
      const col = app.findCollectionByNameOrId(name)
      col.listRule = authed
      col.viewRule = authed
      col.createRule = authed
      col.updateRule = authed
      col.deleteRule = authed
      if (fieldExists(col, 'user')) col.fields.removeByName('user')
      app.save(col)
    }
  },
)
