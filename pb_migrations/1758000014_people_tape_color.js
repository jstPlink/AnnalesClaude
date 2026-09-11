/// <reference path="../pb_data/types.d.ts" />

// Colore "targhetta" della persona: esadecimale, generato in modo
// deterministico dal nome (src/lib/pagesSkin.js: colorForName) al momento
// della creazione. Serve a far combaciare il colore delle targhette con
// nome nella skin "Pagine", identico in vista mese e vista giorno (prima
// la vista giorno non applicava lo stesso sfondo/testo della vista mese,
// solo il bordo — risultato: colori percepiti come diversi). Le persone
// create prima di questo campo restano senza: il codice ricade sullo
// stesso calcolo dal nome (personTapeColor), quindi funzionano comunque,
// solo non "fissato" in caso di rinomina.
migrate(
  (app) => {
    const people = app.findCollectionByNameOrId('people')
    people.fields.add(new Field({ type: 'text', name: 'tapeColor', max: 9 }))
    return app.save(people)
  },
  (app) => {
    const people = app.findCollectionByNameOrId('people')
    people.fields.removeByName('tapeColor')
    return app.save(people)
  },
)
