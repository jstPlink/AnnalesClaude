/// <reference path="../pb_data/types.d.ts" />

// Aggiunge il campo `user` (relazione singola -> users) alla collection `note`
// e assegna tutte le note esistenti senza proprietario all'utente indicato.
//
// L'id sotto è quello dell'account personale sull'istanza self-hosted di chi
// mantiene il diario. Su un'istanza diversa (clone fresco, altro utente)
// quell'id non esiste: in quel caso il campo viene comunque creato ma il
// backfill viene saltato senza errori.
const OWNER_ID = 'koactdxuy0e4ef0'

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

    let owner = null
    try {
      owner = app.findRecordById('users', OWNER_ID)
    } catch {
      owner = null
    }
    if (!owner) return

    const notes = app.findAllRecords('note')
    for (const rec of notes) {
      const cur = rec.get('user')
      const empty = !cur || (Array.isArray(cur) && cur.length === 0)
      if (empty) {
        rec.set('user', OWNER_ID)
        app.save(rec)
      }
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
