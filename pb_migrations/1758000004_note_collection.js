/// <reference path="../pb_data/types.d.ts" />

// Collection principale del diario (lib/notes.js). Le date/orari sono
// trattati come "ora da calendario" senza fuso: vedi il commento in cima a
// src/lib/dates.js — non toccare il formato salvato lato client.
migrate((app) => {
  const people = app.findCollectionByNameOrId('people')
  const tags = app.findCollectionByNameOrId('tags')

  const collection = new Collection({
    type: 'base',
    name: 'note',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { type: 'text', name: 'title', max: 300 },
      { type: 'text', name: 'content', max: 200000 },
      { type: 'number', name: 'mood' },
      { type: 'date', name: 'date' },
      { type: 'date', name: 'timeStart' },
      { type: 'date', name: 'timeEnd' },
      // JSON { name, lat, lon } (o stringa semplice per le note più vecchie:
      // vedi parsePlace in src/lib/notes.js).
      { type: 'text', name: 'place', max: 2000 },
      // Array di { url, title, thumbnailUrl }.
      { type: 'json', name: 'songs', maxSize: 50000 },
      {
        type: 'file',
        name: 'images',
        maxSelect: 99,
        maxSize: 15728640, // 15MB per file
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
      },
      {
        type: 'relation',
        name: 'people',
        collectionId: people.id,
        maxSelect: 999,
      },
      {
        type: 'relation',
        name: 'tags',
        collectionId: tags.id,
        maxSelect: 999,
      },
    ],
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('note')
  return app.delete(collection)
})
