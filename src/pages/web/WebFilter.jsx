import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listNotesFiltered, describeError } from '../../lib/notes'
import { listPeople } from '../../lib/people'
import { listTags } from '../../lib/tags'
import { moodColor, moodTextColor } from '../../lib/mood'
import Icon from '../../components/Icon'
import { dateRangeBounds, dayKey, dayMonthLabel, timeLabel } from '../../lib/dates'

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

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none transition focus:border-ink-soft'

function ChipButton({ active, onClick, icon, square, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ' +
        (square ? 'rounded-lg ' : 'rounded-full ') +
        (active
          ? 'bg-ink text-cream'
          : 'border border-line bg-cream text-ink hover:bg-cream/70')
      }
    >
      {icon && (
        <Icon name={icon} size={12} className={active ? 'text-cream' : 'text-ink-soft'} />
      )}
      {children}
    </button>
  )
}

export default function WebFilter() {
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
    hasSongs: false,
    hasPlace: false,
  })
  const [results, setResults] = useState(null)
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
    set({
      personIds: filters.personIds.includes(id)
        ? filters.personIds.filter((x) => x !== id)
        : [...filters.personIds, id],
    })
  }

  function toggleTag(id) {
    set({
      tagIds: filters.tagIds.includes(id)
        ? filters.tagIds.filter((x) => x !== id)
        : [...filters.tagIds, id],
    })
  }

  async function applyFilters() {
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
        hasSongs: filters.hasSongs,
        hasPlace: filters.hasPlace,
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
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Cerca
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Periodo
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Da"
                value={filters.from}
                onChange={(e) => set({ from: e.target.value })}
                className={inputCls}
              />
              <span className="text-ink-soft">–</span>
              <input
                type="date"
                aria-label="A"
                value={filters.to}
                onChange={(e) => set({ to: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Mood (0–100)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                aria-label="Mood minimo"
                value={filters.moodMin}
                onChange={(e) => set({ moodMin: Number(e.target.value) })}
                className={inputCls}
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
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Luogo
            </p>
            <input
              type="text"
              placeholder="Cerca per luogo…"
              value={filters.place}
              onChange={(e) => set({ place: e.target.value })}
              className={inputCls}
            />
          </div>

          {peopleError && (
            <div className="rounded-2xl border border-line bg-tag p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Persone
              </p>
              <p className="text-xs text-delete-dark">{peopleError}</p>
            </div>
          )}

          {people.length > 0 && (
            <div className="rounded-2xl border border-line bg-tag p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Persone
              </p>
              <div className="flex flex-wrap gap-1.5">
                {people.map((p) => (
                  <ChipButton
                    key={p.id}
                    active={filters.personIds.includes(p.id)}
                    onClick={() => togglePerson(p.id)}
                  >
                    {p.name}
                  </ChipButton>
                ))}
              </div>
            </div>
          )}

          {tagsError && (
            <div className="rounded-2xl border border-line bg-tag p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Tag
              </p>
              <p className="text-xs text-delete-dark">{tagsError}</p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="rounded-2xl border border-line bg-tag p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Tag
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <ChipButton
                    key={t.id}
                    square
                    icon="tag"
                    active={filters.tagIds.includes(t.id)}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </ChipButton>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Contenuto
            </p>
            <div className="flex flex-wrap gap-1.5">
              <ChipButton
                icon="music"
                active={filters.hasSongs}
                onClick={() => set({ hasSongs: !filters.hasSongs })}
              >
                Note con canzoni
              </ChipButton>
              <ChipButton
                icon="map-pin"
                active={filters.hasPlace}
                onClick={() => set({ hasPlace: !filters.hasPlace })}
              >
                Note con luoghi
              </ChipButton>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Ordina per
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <ChipButton
                  key={s.key}
                  active={filters.sort === s.key}
                  onClick={() => set({ sort: s.key })}
                >
                  {s.label}
                </ChipButton>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Numero massimo di risultati
            </p>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              aria-label="Numero massimo di risultati"
              value={filters.limit}
              onChange={(e) => set({ limit: e.target.value })}
              placeholder="Tutte"
              className={inputCls}
            />
          </div>

          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="w-full rounded-full bg-ink py-3 text-sm font-bold text-cream transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Cerco…' : 'Applica filtri'}
          </button>
        </div>

        <div>
          {error && (
            <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
              {error}
            </p>
          )}

          {results === null && !error && (
            <p className="py-16 text-center text-ink-soft">
              Imposta i filtri e premi "Applica filtri".
            </p>
          )}

          {results !== null && (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {results.length} nota{results.length === 1 ? '' : 'e'} trovat
                {results.length === 1 ? 'a' : 'e'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {results.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => navigate(`/note/${n.id}`)}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
                      style={{
                        backgroundColor: moodColor(n.mood),
                        color: moodTextColor(n.mood),
                      }}
                    >
                      {Math.round(Number(n.mood) * 100)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {n.title || (
                          <span className="italic text-ink-soft">Senza titolo</span>
                        )}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {dayMonthLabel(dayKey(n.date))} · {timeLabel(n.timeStart)}–
                        {timeLabel(n.timeEnd)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
