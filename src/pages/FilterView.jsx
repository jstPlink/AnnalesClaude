import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import MarqueeText from '../components/MarqueeText'
import { listNotesFiltered, describeError } from '../lib/notes'
import { listPeople } from '../lib/people'
import { listTags } from '../lib/tags'
import { moodColor, moodTextColor } from '../lib/mood'
import { dateRangeBounds, dayKey, dayMonthLabel, timeLabel, todayKey } from '../lib/dates'
import { haptic } from '../lib/haptics'

const SORTS = [
  { key: 'mood-desc', label: 'Mood più alto' },
  { key: 'mood-asc', label: 'Mood più basso' },
  { key: 'date-desc', label: 'Più recenti' },
  { key: 'date-asc', label: 'Meno recenti' },
]

function sortNotes(list, sort) {
  const arr = [...list]
  switch (sort) {
    case 'mood-asc':
      arr.sort((a, b) => Number(a.mood) - Number(b.mood))
      break
    case 'date-asc':
      arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      break
    case 'date-desc':
      arr.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
      break
    case 'mood-desc':
    default:
      arr.sort((a, b) => Number(b.mood) - Number(a.mood))
  }
  return arr
}

function FilterField({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      {children}
    </div>
  )
}

export default function FilterView() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    moodMin: 0,
    moodMax: 100,
    sort: 'mood-desc',
    limit: '',
    place: '',
    personIds: [],
    tagIds: [],
  })
  const [results, setResults] = useState(null) // null = filtri non ancora applicati
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [people, setPeople] = useState([])
  const [peopleError, setPeopleError] = useState('')
  const [tags, setTags] = useState([])
  const [tagsError, setTagsError] = useState('')

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch((err) => setPeopleError(describeError(err)))
    listTags()
      .then(setTags)
      .catch((err) => setTagsError(describeError(err)))
  }, [])

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  function togglePerson(id) {
    haptic()
    set({
      personIds: filters.personIds.includes(id)
        ? filters.personIds.filter((x) => x !== id)
        : [...filters.personIds, id],
    })
  }

  function toggleTag(id) {
    haptic()
    set({
      tagIds: filters.tagIds.includes(id)
        ? filters.tagIds.filter((x) => x !== id)
        : [...filters.tagIds, id],
    })
  }

  async function applyFilters() {
    haptic()
    setLoading(true)
    setError('')
    try {
      const { start, end } = dateRangeBounds(filters.from, filters.to)
      const moodMin = filters.moodMin > 0 ? filters.moodMin / 100 : undefined
      const moodMax = filters.moodMax < 100 ? filters.moodMax / 100 : undefined
      const list = await listNotesFiltered({
        start,
        end,
        moodMin,
        moodMax,
        place: filters.place,
        personIds: filters.personIds,
        tagIds: filters.tagIds,
      })
      const sorted = sortNotes(list, filters.sort)
      const limit = Number(filters.limit)
      setResults(limit > 0 ? sorted.slice(0, limit) : sorted)
    } catch (err) {
      setError(describeError(err))
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-4 pb-3">
          <CircleButton size={40} onClick={() => navigate(-1)} title="Indietro">
            <Icon name="chevron-left" size={20} />
          </CircleButton>
          <h2 className="flex-1 text-center text-2xl font-extrabold text-ink">
            Filtri
          </h2>
          <span className="w-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="space-y-4 rounded-2xl bg-tag p-4">
          <FilterField label="Periodo">
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Da"
                value={filters.from}
                onChange={(e) => set({ from: e.target.value })}
                className="w-full rounded-xl border border-line bg-cream px-2 py-1.5 text-sm text-ink outline-none"
              />
              <span className="text-ink-soft">–</span>
              <input
                type="date"
                aria-label="A"
                value={filters.to}
                onChange={(e) => set({ to: e.target.value })}
                className="w-full rounded-xl border border-line bg-cream px-2 py-1.5 text-sm text-ink outline-none"
              />
            </div>
          </FilterField>

          <FilterField label="Mood (0–100)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                aria-label="Mood minimo"
                value={filters.moodMin}
                onChange={(e) => set({ moodMin: Number(e.target.value) })}
                className="w-full rounded-xl border border-line bg-cream px-2 py-1.5 text-sm text-ink outline-none"
              />
              <span className="text-ink-soft">–</span>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                aria-label="Mood massimo"
                value={filters.moodMax}
                onChange={(e) => set({ moodMax: Number(e.target.value) })}
                className="w-full rounded-xl border border-line bg-cream px-2 py-1.5 text-sm text-ink outline-none"
              />
            </div>
          </FilterField>

          <FilterField label="Luogo">
            <input
              type="text"
              placeholder="Cerca per luogo…"
              value={filters.place}
              onChange={(e) => set({ place: e.target.value })}
              className="w-full rounded-xl border border-line bg-cream px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </FilterField>

          {peopleError && (
            <FilterField label="Persone">
              <p className="text-xs text-delete-dark">{peopleError}</p>
            </FilterField>
          )}

          {people.length > 0 && (
            <FilterField label="Persone">
              <div className="flex flex-wrap gap-1.5">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePerson(p.id)}
                    className={
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
                      (filters.personIds.includes(p.id)
                        ? 'bg-ink text-cream'
                        : 'border border-line bg-cream text-ink')
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </FilterField>
          )}

          {tagsError && (
            <FilterField label="Tag">
              <p className="text-xs text-delete-dark">{tagsError}</p>
            </FilterField>
          )}

          {tags.length > 0 && (
            <FilterField label="Tag">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
                      (filters.tagIds.includes(t.id)
                        ? 'bg-ink text-cream'
                        : 'border border-line bg-cream text-ink')
                    }
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </FilterField>
          )}

          <FilterField label="Ordina per">
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    haptic()
                    set({ sort: s.key })
                  }}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
                    (filters.sort === s.key
                      ? 'bg-ink text-cream'
                      : 'border border-line bg-cream text-ink')
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FilterField>

          <FilterField label="Numero massimo di risultati (vuoto = tutte)">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              aria-label="Numero massimo di risultati"
              value={filters.limit}
              onChange={(e) => set({ limit: e.target.value })}
              placeholder="Tutte"
              className="w-full rounded-xl border border-line bg-cream px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </FilterField>

          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="w-full rounded-full bg-ink py-2.5 text-sm font-bold text-cream transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Cerco…' : 'Applica filtri'}
          </button>
        </div>

        <div className="mt-5">
          {error && (
            <p className="mb-3 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
              {error}
            </p>
          )}

          {results === null && !error && (
            <p className="py-6 text-center text-sm text-ink-soft">
              Imposta i filtri e premi "Applica filtri".
            </p>
          )}

          {results !== null && (
            <>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {results.length} nota{results.length === 1 ? '' : 'e'} trovat
                {results.length === 1 ? 'a' : 'e'}
              </p>
              <ul className="space-y-2">
                {results.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/note/${n.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line-soft bg-panel px-3 py-2.5 text-left transition active:brightness-95"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
                        style={{
                          backgroundColor: moodColor(n.mood),
                          color: moodTextColor(n.mood),
                        }}
                      >
                        {Math.round(Number(n.mood) * 100)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <MarqueeText className="text-sm font-semibold text-ink">
                          {n.title || (
                            <span className="italic text-ink-soft">
                              Senza titolo
                            </span>
                          )}
                        </MarqueeText>
                        <span className="block text-xs text-ink-soft">
                          {dayMonthLabel(dayKey(n.date))} · {timeLabel(n.timeStart)}–
                          {timeLabel(n.timeEnd)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      <Footer
        items={[
          { icon: 'calendar', title: 'Calendario', onClick: () => navigate('/') },
          {
            icon: 'chart',
            title: 'Andamento anno',
            onClick: () => navigate('/dati'),
          },
          { icon: 'search', title: 'Filtri', active: true },
        ]}
        primaryIcon="plus"
        primaryTitle="Nuova nota (oggi)"
        onPrimary={() => navigate(`/note/new?date=${todayKey()}`)}
      />
    </PhoneShell>
  )
}
