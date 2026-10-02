/// <reference path="../pb_data/types.d.ts" />

// Collegamento all'app MyMap (tracciamento spostamenti): URL del suo
// PocketBase + credenziali del suo account. Salvati sull'utente (come
// immichUrl/immichApiKey) così valgono su tutti i dispositivi.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.add(new Field({ type: 'text', name: 'mymapUrl', max: 500 }))
  users.fields.add(new Field({ type: 'text', name: 'mymapEmail', max: 255 }))
  users.fields.add(new Field({ type: 'text', name: 'mymapPassword', max: 255 }))

  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId('users')

  users.fields.removeByName('mymapUrl')
  users.fields.removeByName('mymapEmail')
  users.fields.removeByName('mymapPassword')

  return app.save(users)
})
