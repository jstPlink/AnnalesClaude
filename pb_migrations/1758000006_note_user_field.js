/// <reference path="../pb_data/types.d.ts" />

// Aggiunge il campo `user` (relazione singola -> users) alla collection `note`.
// (Una versione precedente assegnava anche le note orfane a un account fisso:
// il backfill è stato tolto, non serve su istanze nuove.)

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
    const note = app.findCollectionByNameOrId('note')
    const users = app.findCollectionByNameOrId('users')

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
      app.save(note)
    }
  },
  (app) => {
    const note = app.findCollectionByNameOrId('note')
    if (fieldExists(note, 'user')) {
      note.fields.removeByName('user')
      app.save(note)
    }
  },
)
