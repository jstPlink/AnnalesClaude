import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createNote, describeError } from '../../lib/notes'
import { listPeople, createPerson } from '../../lib/people'
import { listTags, createTag } from '../../lib/tags'
import { extractNotesFromImage, describeGeminiError } from '../../lib/gemini'
import { MONTHS_IT } from '../../lib/dates'
import MoodSlider from '../../components/MoodSlider'
import Icon from '../../components/Icon'

// Schermata PROVVISORIA (solo web) per migrare il vecchio diario tenuto su
// Google Fogli: si incolla lo screenshot di una o più giornate, Gemini ne
// estrae le singole attività come note, che si rivedono e salvano una a una.

const now = new Date()

function toDraft(n) {
  return {
    date: n.date || '',
    title: n.title || '',
    content: n.content || '',
    mood: typeof n.mood === 'number' ? n.mood : 0.5,
    timeStart: n.timeStart || '',
    timeEnd: n.timeEnd || '',
    people: [...(n.people || [])],
    place: n.place || '',
    tags: [...(n.tags || [])],
  }
}

function ChipEditor({ label, values, onChange, placeholder }) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (!v) return
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      onChange([...values, v])
    }
    setInput('')
  }
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-cream py-1 pl-2.5 pr-1.5 text-sm font-medium text-ink"
          >
            {v}
            <button
              type="button"
              title="Rimuovi"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-ink-soft transition hover:text-delete-dark"
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
          className="min-w-[8rem] flex-1 rounded-lg border border-line bg-cream px-2.5 py-1 text-sm text-ink outline-none focus:border-ink-soft"
        />
      </div>
    </div>
  )
}

export default function WebImport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const apiKey = user?.geminiApiKey?.trim()

  const [image, setImage] = useState(null) // { dataUrl, base64, mimeType }
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [allPeople, setAllPeople] = useState([])
  const [allTags, setAllTags] = useState([])

  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  const [notes, setNotes] = useState(null) // array estratto (null = non ancora)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState([]) // [{ title, date, status }]
  const [done, setDone] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    listPeople().then(setAllPeople).catch(() => {})
    listTags().then(setAllTags).catch(() => {})
  }, [])

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const comma = dataUrl.indexOf(',')
      const base64 = dataUrl.slice(comma + 1)
      const mimeType =
        dataUrl.slice(5, dataUrl.indexOf(';')) || file.type || 'image/png'
      setImage({ dataUrl, base64, mimeType })
      setNotes(null)
      setDone(false)
      setResults([])
      setError('')
    }
    reader.readAsDataURL(file)
  }, [])

  // Incolla dagli appunti (Ctrl/Cmd+V) — solo nella fase di scelta immagine,
  // per non sovrascrivere una revisione in corso.
  const pasteEnabled = !notes && !done
  useEffect(() => {
    if (!pasteEnabled) return
    function onPaste(e) {
      const item = [...(e.clipboardData?.items || [])].find((i) =>
        i.type.startsWith('image/'),
      )
      if (item) loadFile(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pasteEnabled, loadFile])

  const years = useMemo(() => {
    const y = now.getFullYear()
    return Array.from({ length: 12 }, (_, i) => y + 1 - i)
  }, [])

  async function runExtract() {
    if (!apiKey || !image || extracting) return
    setExtracting(true)
    setError('')
    try {
      const result = await extractNotesFromImage(apiKey, {
        imageBase64: image.base64,
        mimeType: image.mimeType,
        year,
        month,
        peopleNames: allPeople.map((p) => p.name),
        tagNames: allTags.map((t) => t.name),
      })
      if (!result.length) {
        setError("Nessuna nota estratta dall'immagine.")
        return
      }
      setNotes(result)
      setIndex(0)
      setDraft(toDraft(result[0]))
      setResults([])
      setDone(false)
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setExtracting(false)
    }
  }

  function advance(entry) {
    setResults((r) => [...r, entry])
    const next = index + 1
    if (next >= notes.length) {
      setDone(true)
      setDraft(null)
    } else {
      setIndex(next)
      setDraft(toDraft(notes[next]))
    }
  }

  async function resolveNames(names, list, setList, create) {
    const ids = []
    let current = list
    for (const nm of names) {
      let hit = current.find(
        (x) => x.name.trim().toLowerCase() === nm.trim().toLowerCase(),
      )
      if (!hit) {
        hit = await create(nm)
        current = [...current, hit]
      }
      ids.push(hit.id)
    }
    if (current !== list) setList(current)
    return ids
  }

  async function saveCurrent() {
    if (!draft || saving || !draft.date) return
    setSaving(true)
    setError('')
    try {
      const peopleIds = await resolveNames(
        draft.people,
        allPeople,
        setAllPeople,
        createPerson,
      )
      const tagIds = await resolveNames(draft.tags, allTags, setAllTags, createTag)
      await createNote(
        {
          dateKey: draft.date,
          title: draft.title,
          content: draft.content,
          mood: draft.mood,
          place: draft.place
            ? { name: draft.place, lat: null, lon: null }
            : null,
          songs: [],
          timeStart: draft.timeStart || '09:00',
          timeEnd: draft.timeEnd || '10:00',
        },
        { peopleIds, tagIds },
      )
      advance({
        title: draft.title || '(senza titolo)',
        date: draft.date,
        status: 'saved',
      })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  function skipCurrent() {
    if (!draft) return
    advance({
      title: draft.title || '(senza titolo)',
      date: draft.date,
      status: 'skipped',
    })
  }

  function reset() {
    setImage(null)
    setNotes(null)
    setDraft(null)
    setResults([])
    setDone(false)
    setError('')
  }

  const setField = (patch) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Importa da immagine
        </h1>
        <span className="rounded-full border border-line bg-tag px-2.5 py-1 text-xs font-semibold text-ink-soft">
          provvisorio
        </span>
      </div>
      <p className="mb-6 text-sm text-ink-soft">
        Incolla (Ctrl/Cmd+V) o carica lo screenshot di una o più giornate del
        vecchio diario. Gemini ne estrae le singole attività come note separate,
        da rivedere e salvare una alla volta.
      </p>

      {!apiKey && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          Configura una chiave API Gemini in Profilo per usare questa schermata.
        </p>
      )}

      {/* ---- 1. Immagine + periodo ---- */}
      {!notes && !done && (
        <div className="space-y-4 rounded-3xl border border-line bg-tag p-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              loadFile(e.dataTransfer.files?.[0])
            }}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-cream p-4 text-center transition hover:border-ink-soft"
          >
            {image ? (
              <img
                src={image.dataUrl}
                alt="Anteprima"
                className="max-h-[420px] w-auto rounded-lg"
              />
            ) : (
              <>
                <Icon name="image-plus" size={28} className="text-ink-soft" />
                <span className="text-sm font-semibold text-ink">
                  Incolla, trascina o clicca per scegliere un'immagine
                </span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              loadFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Mese di riferimento
              </span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              >
                {MONTHS_IT.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Anno
              </span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!apiKey || !image || extracting}
              onClick={runExtract}
              className="ml-auto rounded-full border border-save-dark bg-save px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
            >
              {extracting ? 'Estraggo…' : 'Estrai note'}
            </button>
          </div>

          {error && <p className="text-sm text-delete-dark">{error}</p>}
        </div>
      )}

      {/* ---- 2. Revisione nota per nota ---- */}
      {notes && !done && draft && (
        <div className="space-y-4 rounded-3xl border border-line bg-tag p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">
              Nota {index + 1} di {notes.length}
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Ricomincia
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Data
              </span>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setField({ date: e.target.value })}
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Titolo
              </span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setField({ title: e.target.value })}
                placeholder="Titolo della nota"
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
              />
            </label>
          </div>

          <MoodSlider value={draft.mood} onChange={(mood) => setField({ mood })} />

          <div className="flex gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Inizio
              </span>
              <input
                type="time"
                value={draft.timeStart}
                onChange={(e) => setField({ timeStart: e.target.value })}
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Fine
              </span>
              <input
                type="time"
                value={draft.timeEnd}
                onChange={(e) => setField({ timeEnd: e.target.value })}
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Contenuto
            </span>
            <textarea
              rows={9}
              value={draft.content}
              onChange={(e) => setField({ content: e.target.value })}
              className="w-full resize-y rounded-xl border border-line bg-cream px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-ink-soft"
            />
          </label>

          <ChipEditor
            label="Persone"
            values={draft.people}
            onChange={(people) => setField({ people })}
            placeholder="aggiungi…"
          />
          <ChipEditor
            label="Tag"
            values={draft.tags}
            onChange={(tags) => setField({ tags })}
            placeholder="aggiungi…"
          />

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Luogo
            </span>
            <input
              type="text"
              value={draft.place}
              onChange={(e) => setField({ place: e.target.value })}
              placeholder="Nome del luogo"
              className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
            />
          </label>

          {error && <p className="text-sm text-delete-dark">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={skipCurrent}
              disabled={saving}
              className="rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-tag disabled:opacity-50"
            >
              Salta
            </button>
            <button
              type="button"
              onClick={saveCurrent}
              disabled={saving || !draft.date}
              title={draft.date ? undefined : 'Manca la data'}
              className="ml-auto rounded-full border border-save-dark bg-save px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
            >
              {saving
                ? 'Salvo…'
                : index + 1 < notes.length
                  ? 'Salva e continua'
                  : 'Salva e chiudi'}
            </button>
          </div>
        </div>
      )}

      {/* ---- 3. Riepilogo ---- */}
      {done && (
        <div className="space-y-4 rounded-3xl border border-line bg-tag p-6">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Fatto
          </h2>
          <p className="text-sm text-ink-soft">
            {results.filter((r) => r.status === 'saved').length} salvate,{' '}
            {results.filter((r) => r.status === 'skipped').length} saltate.
          </p>
          <ul className="divide-y divide-line-soft border-y border-line-soft text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="min-w-0 truncate text-ink">
                  {r.date} · {r.title}
                </span>
                <span
                  className={
                    'ml-3 shrink-0 text-xs font-semibold ' +
                    (r.status === 'saved' ? 'text-save-dark' : 'text-ink-soft')
                  }
                >
                  {r.status === 'saved' ? 'salvata' : 'saltata'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-tag"
            >
              Importa un'altra immagine
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full border border-save-dark bg-save px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-105"
            >
              Vai al calendario
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
