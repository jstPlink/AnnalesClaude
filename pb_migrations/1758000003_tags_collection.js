/// <reference path="../pb_data/types.d.ts" />

// Elenco dei tag selezionabili nelle note (lib/tags.js): curato in Profilo o
// creato al volo dalla nota stessa.
migrate((app) => {
  const collection = new Collection({
    type: 'base',
    name: 'tags',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [{ type: 'text', name: 'name', required: true, max: 100 }],
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('tags')
  return app.delete(collection)
})
