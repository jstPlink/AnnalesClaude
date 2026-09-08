import { dayMood } from './mood'
import { groupByDay, parsePlace } from './notes'
import { parseWall } from './dates'

const WEEKDAYS_IT = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
]

// Le `limit` voci col conteggio più alto in una Map id->count.
function topEntries(counts, nameFn, limit) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, name: nameFn(id), count }))
}

// Chiave (YYYY-MM-DD) del lunedì della settimana che contiene `dKey`.
function mondayKey(dKey) {
  const p = parseWall(dKey)
  if (!p) return dKey
  const dt = new Date(p.y, p.mo - 1, p.d)
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

// Statistiche aggregate sulle note di un anno.
export function computeYearStats(yearNotes, { allPeople = [], allTags = [] } = {}) {
  const byDay = groupByDay(yearNotes)
  const dayEntries = [...byDay.entries()].map(([key, notes]) => ({
    key,
    mood: dayMood(notes),
    count: notes.length,
    titles: notes
      .map((n) => n.title?.trim())
      .filter(Boolean)
      .slice(0, 3),
  }))

  const topDays = [...dayEntries].sort((a, b) => b.mood - a.mood).slice(0, 5)
  const bottomDays = [...dayEntries].sort((a, b) => a.mood - b.mood).slice(0, 5)
  const busiestDay = dayEntries.reduce(
    (best, d) => (!best || d.count > best.count ? d : best),
    null,
  )

  // Settimana con il mood medio più alto (almeno 2 giorni scritti, se
  // possibile: evita che un singolo giorno euforico "vinca" la settimana).
  const weekMap = new Map()
  for (const d of dayEntries) {
    const wk = mondayKey(d.key)
    const e = weekMap.get(wk) || {
      week: wk,
      moodSum: 0,
      days: 0,
      notes: 0,
      first: d.key,
      last: d.key,
    }
    e.moodSum += d.mood
    e.days += 1
    e.notes += d.count
    if (d.key < e.first) e.first = d.key
    if (d.key > e.last) e.last = d.key
    weekMap.set(wk, e)
  }
  const weeks = [...weekMap.values()].map((e) => ({ ...e, mood: e.moodSum / e.days }))
  const bestWeek =
    weeks.filter((w) => w.days >= 2).sort((a, b) => b.mood - a.mood)[0] ||
    weeks.sort((a, b) => b.mood - a.mood)[0] ||
    null

  // Giorno della settimana con il mood medio più alto.
  const wdSum = Array(7).fill(0)
  const wdN = Array(7).fill(0)
  for (const d of dayEntries) {
    const p = parseWall(d.key)
    if (!p) continue
    const wd = new Date(p.y, p.mo - 1, p.d).getDay()
    wdSum[wd] += d.mood
    wdN[wd] += 1
  }
  let bestWeekday = null
  for (let i = 0; i < 7; i += 1) {
    if (!wdN[i]) continue
    const m = wdSum[i] / wdN[i]
    if (!bestWeekday || m > bestWeekday.mood) {
      bestWeekday = { day: i, name: WEEKDAYS_IT[i], mood: m, count: wdN[i] }
    }
  }

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

  const peopleById = new Map(allPeople.map((p) => [p.id, p]))
  const topPeople = [...personCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      count,
      name: peopleById.get(id)?.name || '—',
      person: peopleById.get(id) || null,
    }))
  const topTags = topEntries(tagCount, (id) => tagName.get(id) || '—', 1)
  const topPlaces = topEntries(placeCount, (name) => name, 1)

  return {
    noteCount: yearNotes.length,
    dayCount: dayEntries.length,
    avgMood: moodN ? moodSum / moodN : null,
    topDays,
    bottomDays,
    busiestDay,
    bestWeek,
    bestWeekday,
    topPeople,
    topPerson: topPeople[0] || null,
    topTag: topTags[0] || null,
    topPlace: topPlaces[0] || null,
  }
}
