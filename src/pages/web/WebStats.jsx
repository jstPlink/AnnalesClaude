import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../../context/NavContext'
import { useAuth } from '../../context/AuthContext'
import RecapCard from '../../components/RecapCard'
import CountUp from '../../components/CountUp'
import PersonAvatar from '../../components/PersonAvatar'
import NotesListSheet from '../../components/NotesListSheet'
import { listNotesInRange, countAllNotes, describeError } from '../../lib/notes'
import { listPeople } from '../../lib/people'
import { listTags } from '../../lib/tags'
import { computeYearStats } from '../../lib/stats'
import { moodColor, moodTextColor } from '../../lib/mood'
import { MONTHS_IT, dayKey, dayMonthLabel, parseWall, timeLabel } from '../../lib/dates'

function shortDM(key) {
  const p = parseWall(key)
  return p ? `${p.d} ${MONTHS_IT[p.mo - 1].slice(0, 3).toLowerCase()}` : ''
}

function NavArrow({ dir, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-tag hover:text-ink"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

function StatCard({ label, value, sub, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={
        'rounded-2xl border border-line bg-tag p-5 text-left' +
        (onClick ? ' transition hover:-translate-y-0.5 hover:shadow-md' : '')
      }
    >
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-3xl font-semibold text-ink">
        <CountUp value={value} />
      </p>
      {sub && <p className="mt-0.5 truncate text-sm text-ink-soft">{sub}</p>}
    </Tag>
  )
}

function DayRow({ day, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="anim-row flex w-full items-start gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={{ backgroundColor: moodColor(day.mood), color: moodTextColor(day.mood) }}
      >
        {Math.round(day.mood * 100)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {dayMonthLabel(day.key)}
        </span>
        {day.titles?.length ? (
          <span className="mt-0.5 flex flex-col gap-0.5">
            {day.titles.map((t, i) => (
              <span key={i} className="block truncate text-xs text-ink-soft">
                {t}
              </span>
            ))}
          </span>
        ) : (
          <span className="block text-xs text-ink-soft">
            {day.count} {day.count === 1 ? 'nota' : 'note'}
          </span>
        )}
      </span>
    </button>
  )
}

function NoteRow({ note, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="anim-row flex w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={{
          backgroundColor: moodColor(note.mood),
          color: moodTextColor(note.mood),
        }}
      >
        {Math.round(Number(note.mood) * 100)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {note.title || <span className="italic text-ink-soft">Senza titolo</span>}
        </span>
        <span className="block truncate text-xs text-ink-soft">
          {dayMonthLabel(dayKey(note.date))} · {timeLabel(note.timeStart)}–
          {timeLabel(note.timeEnd)}
        </span>
      </span>
    </button>
  )
}

export default function WebStats() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const { user } = useAuth()
  const geminiApiKey = user?.geminiApiKey?.trim()
  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const year = cursor.year
  const [yearNotes, setYearNotes] = useState([])
  const [allTimeCount, setAllTimeCount] = useState(null)
  const [people, setPeople] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listSheet, setListSheet] = useState(null) // { title, subtitle, notes } | null

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [notes, total, ppl, tgs] = await Promise.all([
        listNotesInRange({
          start: `${year}-01-01 00:00:00.000Z`,
          end: `${year}-12-31 23:59:59.999Z`,
        }),
        countAllNotes(),
        listPeople(),
        listTags(),
      ])
      setYearNotes(notes)
      setAllTimeCount(total)
      setPeople(ppl)
      setTags(tgs)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(
    () => computeYearStats(yearNotes, { allPeople: people, allTags: tags }),
    [yearNotes, people, tags],
  )

  // Ordina per data/orario, per la lista note nel dialog.
  function sortByDateTime(list) {
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return (a.timeStart || '') < (b.timeStart || '') ? -1 : 1
    })
  }

  function openWeekdayNotes() {
    if (!stats.bestWeekday) return
    const notes = sortByDateTime(
      yearNotes.filter((n) => {
        const p = parseWall(n.date)
        return p && new Date(p.y, p.mo - 1, p.d).getDay() === stats.bestWeekday.day
      }),
    )
    setListSheet({
      title: stats.bestWeekday.name,
      subtitle: `${stats.bestWeekday.count} ${stats.bestWeekday.count === 1 ? 'giorno' : 'giorni'} nel ${year}`,
      notes,
    })
  }

  function openWeekNotes() {
    if (!stats.bestWeek) return
    const { first, last } = stats.bestWeek
    const notes = sortByDateTime(
      yearNotes.filter((n) => {
        const dk = dayKey(n.date)
        return dk >= first && dk <= last
      }),
    )
    setListSheet({
      title: 'Settimana migliore',
      subtitle: `${shortDM(first)} – ${shortDM(last)}`,
      notes,
    })
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            Statistiche
          </h1>
          <NavArrow
            dir="left"
            label="Anno precedente"
            onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))}
          />
          <span className="w-14 text-center font-serif text-2xl font-semibold text-ink-soft">
            {year}
          </span>
          <NavArrow
            dir="right"
            label="Anno successivo"
            onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))}
          />
        </div>
        {loading && <span className="text-sm text-ink-soft">Aggiorno…</span>}
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Note totali" value={allTimeCount ?? '—'} />
        <StatCard label={`Note nel ${year}`} value={stats.noteCount} />
        <StatCard
          label="Mood medio"
          value={stats.avgMood != null ? Math.round(stats.avgMood * 100) : '—'}
        />
      </div>

      <RecapCard
        label={String(year)}
        notes={yearNotes}
        apiKey={geminiApiKey}
        className="mt-6"
      />

      {stats.topPeople.length > 0 && (
        <section className="mt-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Persone più presenti
          </p>
          <ol className="space-y-2">
            {stats.topPeople.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2"
              >
                <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-ink-soft">
                  {i + 1}
                </span>
                <PersonAvatar
                  person={p.person || { name: p.name }}
                  immichUrl={immichUrl}
                  immichApiKey={immichApiKey}
                  size={28}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {p.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                  {p.count} {p.count === 1 ? 'nota' : 'note'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {stats.topDays.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Giorni migliori
            </p>
            <div className="space-y-2">
              {stats.topDays.map((d, i) => (
                <DayRow
                  key={d.key}
                  day={d}
                  style={{ '--i': i }}
                  onClick={() => navigate(`/day/${d.key}`)}
                />
              ))}
            </div>
          </section>
        )}

        {stats.bottomDays.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Giorni più difficili
            </p>
            <div className="space-y-2">
              {stats.bottomDays.map((d, i) => (
                <DayRow
                  key={d.key}
                  day={d}
                  style={{ '--i': i }}
                  onClick={() => navigate(`/day/${d.key}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {stats.topNotes.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Note migliori
            </p>
            <div className="space-y-2">
              {stats.topNotes.map((n, i) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  style={{ '--i': i }}
                  onClick={() => navigate(`/note/${n.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {stats.bottomNotes.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Note peggiori
            </p>
            <div className="space-y-2">
              {stats.bottomNotes.map((n, i) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  style={{ '--i': i }}
                  onClick={() => navigate(`/note/${n.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {(stats.bestWeek ||
        stats.bestWeekday ||
        stats.topTag ||
        stats.topPlace) && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.bestWeek && (
            <StatCard
              label="Settimana migliore"
              value={`${shortDM(stats.bestWeek.first)} – ${shortDM(stats.bestWeek.last)}`}
              sub={`mood ${Math.round(stats.bestWeek.mood * 100)} · ${stats.bestWeek.notes} note`}
              onClick={openWeekNotes}
            />
          )}
          {stats.bestWeekday && (
            <StatCard
              label="Giorno più su di morale"
              value={stats.bestWeekday.name}
              sub={`mood medio ${Math.round(stats.bestWeekday.mood * 100)} su ${stats.bestWeekday.count} ${stats.bestWeekday.count === 1 ? 'giorno' : 'giorni'}`}
              onClick={openWeekdayNotes}
            />
          )}
          {stats.topTag && (
            <StatCard
              label="Tag più usato"
              value={stats.topTag.name}
              sub={`in ${stats.topTag.count} note`}
            />
          )}
          {stats.topPlace && (
            <StatCard
              label="Luogo più frequente"
              value={stats.topPlace.name}
              sub={`in ${stats.topPlace.count} note`}
            />
          )}
        </div>
      )}

      {!loading && !stats.noteCount && (
        <p className="py-16 text-center text-ink-soft">Nessuna nota nel {year}.</p>
      )}

      <NotesListSheet
        open={Boolean(listSheet)}
        title={listSheet?.title}
        subtitle={listSheet?.subtitle}
        notes={listSheet?.notes || []}
        onClose={() => setListSheet(null)}
        onSelectNote={(id) => navigate(`/note/${id}`)}
      />
    </div>
  )
}
