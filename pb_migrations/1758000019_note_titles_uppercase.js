/// <reference path="../pb_data/types.d.ts" />

// Da v0.75.0 i titoli delle note sono sempre in MAIUSCOLO (l'app li salva così).
// Questa migration porta in maiuscolo anche tutti i titoli già esistenti.
// Non tocca altro: contenuto e mood restano uguali, quindi non si segnano
// recap da rifare.
migrate(
  (app) => {
    const notes = app.findAllRecords('note')
    for (const rec of notes) {
      const title = rec.getString('title')
      const upper = title.toUpperCase()
      if (upper !== title) {
        rec.set('title', upper)
        app.saveNoValidate(rec)
      }
    }
  },
  () => {
    // Non c'è modo di ripristinare le maiuscole/minuscole originali.
  },
)
