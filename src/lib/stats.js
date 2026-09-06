import { dayMood } from './mood'
import { groupByDay, parsePlace } from './notes'

// Trova il valore col conteggio più alto in una Map id->count, e lo
// traduce in nome tramite nameFn. null se la mappa è vuota.
function topEntry(counts, nameFn) {
  let bestId = null
  let bestCount = 0
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id
      bestCount = count
    }
  }
  return bestId != null ? { name: nameFn(bestId), count: bestCount } : null
}

// Statistiche aggregate sulle note di un anno: giorni migliori/peggiori,
// giorno più pieno, persona/tag/luogo più ricorrenti, mood medio.
export function computeYearStats(yearNotes, { allPeople = [], allTags = [] } = {}) {
  const byDay = groupByDay(yearNotes)
  const dayEntries = [...byDay.entries()].map(([key, notes]) => ({
    key,
    mood: dayMood(notes),
    count: notes.length,
  }))

  const topDays = [...dayEntries].sort((a, b) => b.mood - a.mood).slice(0, 2)
  const bottomDays = [...dayEntries].sort((a, b) => a.mood - b.mood).slice(0, 2)
  const busiestDay = dayEntries.reduce(
    (best, d) => (!best || d.count > best.count ? d : best),
    null,
  )

  const peopleName = new Map(allPeople.map((p) => [p.id, p.name]))
  const tagName = new Map(allTags.map((t) => [t.id, t.name]))

  const personCount = new Map()
  const tagCount = new Map()
  const placeCount = new Map()
  let moodSum = 0
  let moodN = 0

  for (const n of yearNotes) {
    const m = Number(n.mood)
    if (!Number.isNaN(m)) {
      moodSum += m
      moodN += 1
    }
    for (const id of n.people || []) {
      personCount.set(id, (personCount.get(id) || 0) + 1)
    }
    for (const id of n.tags || []) {
      tagCount.set(id, (tagCount.get(id) || 0) + 1)
    }
    const place = parsePlace(n.place)
    if (place?.name) {
      placeCount.set(place.name, (placeCount.get(place.name) || 0) + 1)
    }
  }

  return {
    noteCount: yearNotes.length,
    dayCount: dayEntries.length,
    avgMood: moodN ? moodSum / moodN : null,
    topDays,
    bottomDays,
    busiestDay,
    topPerson: topEntry(personCount, (id) => peopleName.get(id) || '—'),
    topTag: topEntry(tagCount, (id) => tagName.get(id) || '—'),
    topPlace: topEntry(placeCount, (name) => name),
  }
}
