/// <reference path="../pb_data/types.d.ts" />

// Libreria di file CSV/TSV caricati nella schermata di import (beta,
// lib/importCsvs.js, usata da src/pages/web/WebImport.jsx): prima viveva
// solo in localStorage (per browser/dispositivo), qui invece resta
// disponibile anche cambiando computer. Per-utente fin dall'inizio, come
// people/tags/places. Non ha niente a che fare con le note già importate:
// qui sta solo il testo grezzo del file, in attesa di essere rimesso nel
// box per una nuova passata.
migrate(
  (app) => {
    // Idempotente: sulle istanze dove è già stata creata a mano dalla Admin
    // UI (per averla subito, prima che questa migrazione fosse pronta) non
    // la ricrea né fallisce per nome duplicato.
    try {
      if (app.findCollectionByNameOrId('import_csvs')) return
    } catch {
      // non esiste ancora: procede a crearla
    }

    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'import_csvs',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule:
        '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'text', name: 'label', required: true, max: 300 },
        { type: 'text', name: 'content', required: true, max: 1000000 },
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
    const collection = app.findCollectionByNameOrId('import_csvs')
    return app.delete(collection)
  },
)
