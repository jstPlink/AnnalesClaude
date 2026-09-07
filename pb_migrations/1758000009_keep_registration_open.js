/// <reference path="../pb_data/types.d.ts" />

// La registrazione dalla pagina di login del diario deve restare possibile:
// `users.createRule = ""` (creazione consentita senza autenticazione).
// La privacy è garantita dalle regole per-proprietario di note/people/tags
// (migration 1758000007 / 1758000008), NON dal blocco della registrazione.
//
// Migration dedicata ed esplicita: se un deploy precedente aveva chiuso la
// registrazione (vecchia migration 1758000005, poi rimossa), questa la
// riapre in modo inequivocabile. Nessun rollback: lo stato voluto è "aperta".
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    return app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    return app.save(users)
  },
)
