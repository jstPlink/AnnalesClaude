/// <reference path="../pb_data/types.d.ts" />

// Elenco dei luoghi selezionabili nelle note (lib/places.js): curato
// dall'utente in Impostazioni, oppure creato al volo scegliendo un punto
// sulla mappa mentre si scrive una nota (PlacePickerSheet). Per-utente fin
// dall'inizio, come già people/tags (vedi 1758000008_people_tags_owner.js).
//
// NB: il campo `place` di ogni nota (collection `note`) resta un JSON
// {name,lat,lon} indipendente, non una relazione a questa collection — vedi
// parsePlace in src/lib/notes.js. `places` è solo l'elenco curato che
// alimenta i suggerimenti e la gestione da Impostazioni; cancellare/
// sostituire un luogo qui riscrive comunque il campo `place` delle note
// collegate (lib/places.js + lib/notes.js: listNotesWithPlace/
// reassignPlaceInNotes), non una cascata automatica del database.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'places',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule:
        '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'text', name: 'name', required: true, max: 200 },
        { type: 'number', name: 'lat' },
        { type: 'number', name: 'lon' },
        {
          type: 'relation',
          name: 'user',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: true,
        },
      ],
    })

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('places')
    return app.delete(collection)
  },
)
