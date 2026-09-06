/// <reference path="../pb_data/types.d.ts" />

// Elenco delle persone selezionabili nelle note (lib/people.js): curato
// dall'utente in Profilo, popolato scegliendo volti riconosciuti su Immich.
// Un'istanza self-hosted è pensata per una persona/famiglia sola: le regole
// restano aperte a chiunque sia autenticato su QUESTA istanza.
migrate((app) => {
  const collection = new Collection({
    type: 'base',
    name: 'people',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { type: 'text', name: 'name', required: true, max: 200 },
      { type: 'text', name: 'immichPersonId', max: 200 },
    ],
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('people')
  return app.delete(collection)
})
