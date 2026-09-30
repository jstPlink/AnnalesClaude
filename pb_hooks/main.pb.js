/// <reference path="../pb_data/types.d.ts" />

// Recap automatici (giorno/mese/anno) scritti con Gemini, lato server: non
// serve aprire l'app perché restino aggiornati. Salvati nella collection
// `recaps` (pb_migrations/1758000016_recaps_collection.js). Tre trigger:
//  - un cron per ciascun livello, poco dopo la mezzanotte di quando il
//    periodo finisce (giorno: ogni notte; mese: il giorno 1; anno: il 1
//    gennaio) — vedi i cronAdd in fondo al file;
//  - una cascata quando si crea/modifica/cancella una nota di un giorno che
//    NON è oggi: si rigenera il recap di quel giorno; se il giorno non è
//    nel mese corrente si rigenera anche quello del mese; se il mese non è
//    nell'anno corrente anche quello dell'anno (cascadeFromNote più sotto).
//    Una nota di oggi non fa nulla: ci pensa il cron di stanotte, una volta
//    che la giornata è davvero chiusa.
//
// I periodi CHIUSI PRIMA che questa funzione esistesse (o mai più toccati da
// allora) non hanno un recap: il cron guarda solo avanti, non recupera il
// passato da solo (richiederebbe centinaia di chiamate a Gemini in un colpo
// solo, con la chiave personale di ciascun utente — troppo fragile per una
// migrazione, che deve restare veloce e affidabile). Per quelli l'utente
// genera a mano dall'app col tasto "Genera"/"Rigenera" (src/lib/recaps.js),
// che scrive qui con lo stesso schema — lato client, quindi passa dalle
// regole della collection invece che da $app, ma il risultato è identico.
//
// Errori transitori (server Gemini sovraccarico, rete assente, risposta
// vuota): si riprova da soli ogni 10 secondi finché non arriva un risultato,
// senza bisogno di nessuna revisione — gira in background (hook
// "*AfterSuccess*", quindi DOPO che la richiesta che ha attivato tutto ha
// già avuto risposta: anche se Gemini è giù per un pezzo, salvare una nota
// non resta mai in attesa). Una chiave non valida (400/401/403) non è
// transitoria: lì ci si ferma subito, non ha senso riprovare all'infinito.

const GEMINI_MODEL = 'gemini-3.6-flash' // in sync con MODEL in src/lib/gemini.js
const RETRY_DELAY_MS = 10000

function isRetryableStatus(status) {
  return status === 0 || status === 429 || (status >= 500 && status < 600)
}

// Una singola chiamata testuale a Gemini, con riprovi automatici sugli
// intoppi transitori (vedi commento in cima al file).
function callGeminiText(apiKey, promptText) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    GEMINI_MODEL +
    ':generateContent?key=' +
    encodeURIComponent(apiKey)
  let attempt = 0
  for (;;) {
    attempt++
    let res
    try {
      res = $http.send({
        method: 'POST',
        url: url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
      })
    } catch (err) {
      console.log('[recap] rete non raggiungibile (tentativo ' + attempt + '), riprovo tra 10s: ' + err)
      sleep(RETRY_DELAY_MS)
      continue
    }
    if (res.statusCode === 200) {
      const candidates = (res.json && res.json.candidates) || []
      const parts = (candidates[0] && candidates[0].content && candidates[0].content.parts) || []
      let text = ''
      for (const p of parts) text += p.text || ''
      text = text.trim()
      if (text) return text
      console.log('[recap] risposta vuota da Gemini (tentativo ' + attempt + '), riprovo tra 10s')
      sleep(RETRY_DELAY_MS)
      continue
    }
    if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
      throw new Error('Chiave API Gemini non valida (status ' + res.statusCode + ')')
    }
    if (isRetryableStatus(res.statusCode)) {
      console.log('[recap] Gemini ' + res.statusCode + ' (tentativo ' + attempt + '), riprovo tra 10s')
      sleep(RETRY_DELAY_MS)
      continue
    }
    throw new Error('Errore Gemini ' + res.statusCode + ': ' + res.raw)
  }
}

// ---- date "a orologio da muro", come src/lib/dates.js: niente fuso, si
// leggono/scrivono le cifre così come sono. ----

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}
function dayKeyOf(value) {
  return String(value || '').slice(0, 10)
}
function monthKeyOf(dKey) {
  return dKey.slice(0, 7)
}
function yearOf(mKey) {
  return mKey.slice(0, 4)
}
// L'unico punto che guarda l'orologio vero (del container: vedi TZ=Europe/Rome
// nel Dockerfile) invece di leggere una data salvata — serve a sapere cosa è
// "oggi"/"il mese corrente"/"l'anno corrente" adesso.
function todayKeyLocal() {
  const d = new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}
function currentMonthKeyLocal() {
  return todayKeyLocal().slice(0, 7)
}
function currentYearLocal() {
  return '' + new Date().getFullYear()
}
function addDaysToKey(dKey, n) {
  const p = dKey.split('-')
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}
function prevMonthKey(mKey) {
  const p = mKey.split('-')
  const total = Number(p[0]) * 12 + (Number(p[1]) - 1) - 1
  const y = Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  return y + '-' + pad2(m + 1)
}
function dayRangeFilter(dKey) {
  return { start: dKey + ' 00:00:00.000Z', end: dKey + ' 23:59:59.999Z' }
}
function monthRangeFilter(mKey) {
  const p = mKey.split('-')
  const lastDay = new Date(Number(p[0]), Number(p[1]), 0).getDate()
  return { start: mKey + '-01 00:00:00.000Z', end: mKey + '-' + pad2(lastDay) + ' 23:59:59.999Z' }
}
function yearRangeFilter(year) {
  return { start: year + '-01-01 00:00:00.000Z', end: year + '-12-31 23:59:59.999Z' }
}

// ---- lettura/scrittura recap + note ----

function geminiApiKeyFor(app, userId) {
  try {
    const key = (app.findRecordById('users', userId).get('geminiApiKey') || '').trim()
    return key || null
  } catch {
    return null
  }
}

function usersWithGeminiKey(app) {
  try {
    return app.findRecordsByFilter('users', "geminiApiKey != ''", '', 500, 0, {})
  } catch {
    return []
  }
}

function findRecap(app, userId, period, key) {
  try {
    return app.findFirstRecordByFilter(
      'recaps',
      'user = {:user} && period = {:period} && key = {:key}',
      { user: userId, period: period, key: key },
    )
  } catch {
    return null
  }
}

function saveRecap(app, userId, period, key, text) {
  let record = findRecap(app, userId, period, key)
  if (!record) {
    record = new Record(app.findCollectionByNameOrId('recaps'))
    record.set('user', userId)
    record.set('period', period)
    record.set('key', key)
  }
  record.set('text', text)
  app.save(record)
  return record
}

function deleteRecapIfExists(app, userId, period, key) {
  const rec = findRecap(app, userId, period, key)
  if (rec) app.delete(rec)
}

function notesForUserInRange(app, userId, range) {
  try {
    return app.findRecordsByFilter(
      'note',
      'user = {:user} && date >= {:start} && date <= {:end}',
      'timeStart',
      500,
      0,
      { user: userId, start: range.start, end: range.end },
    )
  } catch {
    return []
  }
}

// Il contenuto è HTML dall'editor rich text: via i tag, resta solo il testo.
function plainExcerpt(html, max) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function noteLine(rec) {
  const mood = Math.round(Number(rec.get('mood')) * 100)
  const title = (rec.get('title') || '').trim()
  const excerpt = plainExcerpt(rec.get('content'), 240)
  return '[' + (isFinite(mood) ? mood : 50) + '] ' + title + (excerpt ? ' — ' + excerpt : '')
}

// ---- generazione dei tre livelli ----

function generateDayRecap(app, userId, dateKey) {
  const notes = notesForUserInRange(app, userId, dayRangeFilter(dateKey))
  if (!notes.length) {
    deleteRecapIfExists(app, userId, 'day', dateKey)
    return null
  }
  const apiKey = geminiApiKeyFor(app, userId)
  if (!apiKey) return null
  const rows = notes.map(noteLine).join('\n')
  const prompt =
    'Queste sono le note di diario scritte in un solo giorno (formato: [mood 0-100] titolo — estratto). ' +
    'Scrivi un breve recap personale in italiano, rivolto a chi le ha scritte ("hai…", "ti…"), di 2-4 frasi: ' +
    'cosa è successo, persone e luoghi citati, il tono della giornata. Tono caldo, diretto. ' +
    'Rispondi SOLO col testo del recap, senza titolo né elenchi puntati.\n\n' +
    rows
  return saveRecap(app, userId, 'day', dateKey, callGeminiText(apiKey, prompt))
}

function dayRecapsForMonth(app, userId, monthKey) {
  try {
    return app.findRecordsByFilter(
      'recaps',
      "user = {:user} && period = 'day' && key >= {:start} && key <= {:end}",
      'key',
      31,
      0,
      { user: userId, start: monthKey + '-01', end: monthKey + '-31' },
    )
  } catch {
    return []
  }
}

function generateMonthRecap(app, userId, monthKey) {
  const apiKey = geminiApiKeyFor(app, userId)
  if (!apiKey) return null
  const days = dayRecapsForMonth(app, userId, monthKey)
  let rows
  let intro
  if (days.length) {
    rows = days.map((r) => r.get('key') + ': ' + r.get('text')).join('\n')
    intro = 'Questi sono i recap giornalieri di un mese di diario (un giorno per riga). '
  } else {
    const notes = notesForUserInRange(app, userId, monthRangeFilter(monthKey))
    if (!notes.length) {
      deleteRecapIfExists(app, userId, 'month', monthKey)
      return null
    }
    rows = notes.map((r) => dayKeyOf(r.get('date')) + ' ' + noteLine(r)).join('\n')
    intro = 'Queste sono le note di diario di un mese (formato: data [mood 0-100] titolo — estratto). '
  }
  const prompt =
    intro +
    'Scrivi un recap personale del mese in italiano, rivolto a chi le ha scritte ("hai…", "ti…"), di 4-6 frasi: ' +
    "temi ricorrenti, persone e luoghi che tornano, andamento dell'umore nel tempo, due o tre momenti salienti. " +
    'Tono caldo e sintetico. Rispondi SOLO col recap, senza titolo né elenchi puntati.\n\n' +
    rows
  return saveRecap(app, userId, 'month', monthKey, callGeminiText(apiKey, prompt))
}

function monthRecapsForYear(app, userId, year) {
  try {
    return app.findRecordsByFilter(
      'recaps',
      "user = {:user} && period = 'month' && key >= {:start} && key <= {:end}",
      'key',
      12,
      0,
      { user: userId, start: year + '-01', end: year + '-12' },
    )
  } catch {
    return []
  }
}

function generateYearRecap(app, userId, year) {
  const apiKey = geminiApiKeyFor(app, userId)
  if (!apiKey) return null
  const months = monthRecapsForYear(app, userId, year)
  let rows
  let intro
  if (months.length) {
    rows = months.map((r) => r.get('key') + ': ' + r.get('text')).join('\n')
    intro = 'Questi sono i recap mensili di un anno di diario (un mese per riga). '
  } else {
    const notes = notesForUserInRange(app, userId, yearRangeFilter(year))
    if (!notes.length) {
      deleteRecapIfExists(app, userId, 'year', year)
      return null
    }
    rows = notes.map((r) => dayKeyOf(r.get('date')) + ' ' + noteLine(r)).join('\n')
    intro = 'Queste sono le note di diario di un anno (formato: data [mood 0-100] titolo — estratto). '
  }
  const prompt =
    intro +
    "Scrivi un recap personale dell'anno in italiano, rivolto a chi le ha scritte (\"hai…\", \"ti…\"), di 5-8 frasi: " +
    "come si è evoluto l'anno, temi ricorrenti, persone e luoghi importanti, l'andamento dell'umore, i momenti più salienti. " +
    'Tono caldo, come un ricordo personale. Rispondi SOLO col recap, senza titolo né elenchi puntati.\n\n' +
    rows
  return saveRecap(app, userId, 'year', year, callGeminiText(apiKey, prompt))
}

// ---- cascata dalle note (creazione/modifica/cancellazione) ----

function cascadeFromNote(app, record) {
  const userId = record.get('user')
  const dKey = dayKeyOf(record.get('date'))
  if (!userId || !dKey || dKey === todayKeyLocal()) return // oggi: ci pensa il cron di stanotte

  let dayRec
  try {
    dayRec = generateDayRecap(app, userId, dKey)
  } catch (err) {
    console.log('[recap] cascata giorno ' + dKey + ' utente ' + userId + ': ' + err)
    return
  }
  if (!dayRec) return // nessuna nota rimasta quel giorno: niente da propagare

  const mKey = monthKeyOf(dKey)
  if (mKey === currentMonthKeyLocal()) return

  let monthRec
  try {
    monthRec = generateMonthRecap(app, userId, mKey)
  } catch (err) {
    console.log('[recap] cascata mese ' + mKey + ' utente ' + userId + ': ' + err)
    return
  }
  if (!monthRec) return

  const year = yearOf(mKey)
  if (year === currentYearLocal()) return

  try {
    generateYearRecap(app, userId, year)
  } catch (err) {
    console.log('[recap] cascata anno ' + year + ' utente ' + userId + ': ' + err)
  }
}

function onNoteChange(e) {
  cascadeFromNote($app, e.record)
  e.next()
}

onRecordAfterCreateSuccess(onNoteChange, 'note')
onRecordAfterUpdateSuccess(onNoteChange, 'note')
onRecordAfterDeleteSuccess(onNoteChange, 'note')

// ---- cron notturni: creano il recap del periodo appena chiuso, per ogni
// utente che ha una chiave Gemini impostata ----

cronAdd('dailyRecap', '30 0 * * *', () => {
  const targetDay = addDaysToKey(todayKeyLocal(), -1)
  for (const u of usersWithGeminiKey($app)) {
    try {
      generateDayRecap($app, u.id, targetDay)
    } catch (err) {
      console.log('[recap] cron giorno ' + targetDay + ' utente ' + u.id + ': ' + err)
    }
  }
})

cronAdd('monthlyRecap', '50 0 1 * *', () => {
  const targetMonth = prevMonthKey(currentMonthKeyLocal())
  for (const u of usersWithGeminiKey($app)) {
    try {
      generateMonthRecap($app, u.id, targetMonth)
    } catch (err) {
      console.log('[recap] cron mese ' + targetMonth + ' utente ' + u.id + ': ' + err)
    }
  }
})

cronAdd('yearlyRecap', '10 1 1 1 *', () => {
  const targetYear = '' + (Number(currentYearLocal()) - 1)
  for (const u of usersWithGeminiKey($app)) {
    try {
      generateYearRecap($app, u.id, targetYear)
    } catch (err) {
      console.log('[recap] cron anno ' + targetYear + ' utente ' + u.id + ': ' + err)
    }
  }
})
