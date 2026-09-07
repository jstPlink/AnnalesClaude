import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  createNote,
  describeError,
  peopleUsageCounts,
} from '../../lib/notes'
import { listPeople, createPerson } from '../../lib/people'
import { listTags, createTag } from '../../lib/tags'
import { extractNotesFromImage, describeGeminiError } from '../../lib/gemini'
import { MONTHS_IT } from '../../lib/dates'
import MoodSlider from '../../components/MoodSlider'
import PersonAvatar from '../../components/PersonAvatar'
import PeoplePickerSheet from '../../components/PeoplePickerSheet'
import TagPickerSheet from '../../components/TagPickerSheet'
import AddSongSheet from '../../components/AddSongSheet'
import PlacePickerSheet from '../../components/PlacePickerSheet'
import PlaceCard from '../../components/PlaceCard'
import AddImagesSheet from '../../components/AddImagesSheet'
import ImmichPicker from '../../components/ImmichPicker'
import Icon from '../../components/Icon'

// Schermata PROVVISORIA (solo web) per migrare il vecchio diario tenuto su
// Google Fogli: si incolla lo screenshot di una o più giornate, Gemini ne
// estrae le singole attività come note, che si rivedono e salvano una a una.
// La revisione usa gli stessi selettori del telefono (persone con foto, tag
// esistenti, luogo su mappa, canzoni da Spotify).

const now = new Date()

// Costruisce la bozza modificabile abbinando i nomi estratti da Gemini alle
// persone/tag già in elenco (match sul nome, case-insensitive); quelli senza
// corrispondenza restano "in attesa" e verranno creati al salvataggio.
function toDraft(n, allPeople, allTags) {
  const peopleIds = []
  const pendingPeople = []
  for (const nm of n.people || []) {
    const hit = allPeople.find(
      (p) => p.name.trim().toLowerCase() === nm.trim().toLowerCase(),
    )
    if (hit) peopleIds.push(hit.id)
    else if (!pendingPeople.some((x) => x.toLowerCase() === nm.toLowerCase()))
      pendingPeople.push(nm)
  }
  const tagIds = []
  const pendingTags = []
  for (const nm of n.tags || []) {
    const hit = allTags.find(
      (t) => t.name.trim().toLowerCase() === nm.trim().toLowerCase(),
    )
    if (hit) tagIds.push(hit.id)
    else if (!pendingTags.some((x) => x.toLowerCase() === nm.toLowerCase()))
      pendingTags.push(nm)
  }
  return {
    date: n.date || '',
    title: n.title || '',
    content: n.content || '',
    mood: typeof n.mood === 'number' ? n.mood : 0.5,
    timeStart: n.timeStart || '',
    timeEnd: n.timeEnd || '',
    peopleIds,
    pendingPeople,
    tagIds,
    pendingTags,
    place: n.place ? { name: n.place, lat: null, lon: null } : null,
    songs: [],
    files: [], // immagini (File) da allegare, aggiunte in revisione
  }
}

// Abbina/crea per nome, restituendo gli id. Aggiorna la lista locale con gli
// eventuali nuovi record.
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

export default function WebImport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const apiKey = user?.geminiApiKey?.trim()
  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const immichReady = Boolean(immichUrl && immichApiKey)
  const spotifyClientId = user?.spotifyClientId?.trim()
  const spotifyClientSecret = user?.spotifyClientSecret?.trim()

  const [image, setImage] = useState(null) // { dataUrl, base64, mimeType }
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [allPeople, setAllPeople] = useState([])
  const [allTags, setAllTags] = useState([])
  const [peopleUsage, setPeopleUsage] = useState(null)

  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  const [notes, setNotes] = useState(null) // array estratto (null = non ancora)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState([]) // [{ title, date, status }]
  const [done, setDone] = useState(false)

  const [peopleSheetOpen, setPeopleSheetOpen] = useState(false)
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [songSheetOpen, setSongSheetOpen] = useState(false)
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false)
  const [addImagesOpen, setAddImagesOpen] = useState(false)
  const [immichOpen, setImmichOpen] = useState(false)

  const fileInputRef = useRef(null) // immagine sorgente (screenshot)
  const noteFilesRef = useRef(null) // immagini da allegare alla nota

  useEffect(() => {
    listPeople().then(setAllPeople).catch(() => {})
    listTags().then(setAllTags).catch(() => {})
    peopleUsageCounts().then(setPeopleUsage).catch(() => {})
  }, [])

  const setField = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const selectedPeople = useMemo(
    () => (draft ? allPeople.filter((p) => draft.peopleIds.includes(p.id)) : []),
    [allPeople, draft],
  )
  const selectedTags = useMemo(
    () => (draft ? allTags.filter((t) => draft.tagIds.includes(t.id)) : []),
    [allTags, draft],
  )

  const previews = useMemo(
    () => (draft?.files || []).map((file) => ({ file, url: URL.createObjectURL(file) })),
    [draft?.files],
  )
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  function addFiles(list) {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith('image/'))
    if (picked.length) setDraft((d) => ({ ...d, files: [...d.files, ...picked] }))
  }

  function togglePerson(id) {
    setDraft((d) => ({
      ...d,
      peopleIds: d.peopleIds.includes(id)
        ? d.peopleIds.filter((x) => x !== id)
        : [...d.peopleIds, id],
    }))
  }
  function toggleTag(id) {
    setDraft((d) => ({
      ...d,
      tagIds: d.tagIds.includes(id)
        ? d.tagIds.filter((x) => x !== id)
        : [...d.tagIds, id],
    }))
  }

  // Crea al volo una persona/tag "in attesa" e la sposta tra i selezionati.
  async function materializePending(kind, name) {
    try {
      if (kind === 'person') {
        const rec = await createPerson(name)
        setAllPeople((p) =>
          [...p, rec].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setDraft((d) => ({
          ...d,
          peopleIds: [...d.peopleIds, rec.id],
          pendingPeople: d.pendingPeople.filter((x) => x !== name),
        }))
      } else {
        const rec = await createTag(name)
        setAllTags((t) =>
          [...t, rec].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setDraft((d) => ({
          ...d,
          tagIds: [...d.tagIds, rec.id],
          pendingTags: d.pendingTags.filter((x) => x !== name),
        }))
      }
    } catch (err) {
      setError(describeError(err))
    }
  }

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
      setDraft(toDraft(result[0], allPeople, allTags))
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
      setDraft(toDraft(notes[next], allPeople, allTags))
    }
  }

  async function saveCurrent() {
    if (!draft || saving || !draft.date) return
    setSaving(true)
    setError('')
    try {
      const createdPeopleIds = await resolveNames(
        draft.pendingPeople,
        allPeople,
        setAllPeople,
        createPerson,
      )
      const createdTagIds = await resolveNames(
        draft.pendingTags,
        allTags,
        setAllTags,
        createTag,
      )
      const peopleIds = [...new Set([...draft.peopleIds, ...createdPeopleIds])]
      const tagIds = [...new Set([...draft.tagIds, ...createdTagIds])]
      await createNote(
        {
          dateKey: draft.date,
          title: draft.title,
          content: draft.content,
          mood: draft.mood,
          place: draft.place,
          songs: draft.songs,
          timeStart: draft.timeStart || '09:00',
          timeEnd: draft.timeEnd || '10:00',
        },
        { newFiles: draft.files, peopleIds, tagIds },
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Importa da immagine
        </h1>
        <span className="flex items-center gap-1.5 rounded-full border border-warn-dark bg-warn px-2.5 py-1 text-xs font-bold text-ink">
          <Icon name="alert-triangle" size={13} className="shrink-0" />
          Funzione provvisoria
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

          {/* Immagini */}
          <div className="rounded-2xl border border-line bg-cream p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Immagini
              </span>
              <button
                type="button"
                onClick={() =>
                  immichReady
                    ? setAddImagesOpen(true)
                    : noteFilesRef.current?.click()
                }
                className="rounded-full border border-line bg-tag px-3 py-1 text-xs font-bold text-ink transition hover:brightness-95"
              >
                + Aggiungi
              </button>
            </div>
            {previews.length === 0 ? (
              <p className="text-sm italic text-ink-soft">Nessuna immagine</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-lg bg-panel-2 ring-2 ring-save"
                  >
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() =>
                        setField({
                          files: draft.files.filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Persone */}
          <div className="rounded-2xl border border-line bg-cream p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Persone
              </span>
              <button
                type="button"
                onClick={() => setPeopleSheetOpen(true)}
                className="rounded-full border border-line bg-tag px-3 py-1 text-xs font-bold text-ink transition hover:brightness-95"
              >
                + Aggiungi
              </button>
            </div>
            {selectedPeople.length === 0 && draft.pendingPeople.length === 0 ? (
              <p className="text-sm italic text-ink-soft">Nessuna persona</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedPeople.map((person) => (
                  <span
                    key={person.id}
                    className="flex items-center gap-2 rounded-full border border-line bg-tag py-1 pl-1 pr-2"
                  >
                    <PersonAvatar
                      person={person}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                      size={24}
                    />
                    <span className="text-sm font-semibold text-ink">
                      {person.name}
                    </span>
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => togglePerson(person.id)}
                      className="text-ink-soft"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                ))}
                {draft.pendingPeople.map((nm) => (
                  <span
                    key={nm}
                    className="flex items-center gap-1.5 rounded-full border border-dashed border-line bg-tag/60 py-1 pl-2.5 pr-1.5 text-sm font-semibold text-ink-soft"
                  >
                    {nm}
                    <button
                      type="button"
                      title="Crea e aggiungi"
                      onClick={() => materializePending('person', nm)}
                      className="rounded-full bg-save px-1.5 text-xs font-bold text-ink"
                    >
                      crea
                    </button>
                    <button
                      type="button"
                      title="Scarta"
                      onClick={() =>
                        setField({
                          pendingPeople: draft.pendingPeople.filter(
                            (x) => x !== nm,
                          ),
                        })
                      }
                      className="text-ink-soft"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tag */}
          <div className="rounded-2xl border border-line bg-cream p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Tag
              </span>
              <button
                type="button"
                onClick={() => setTagSheetOpen(true)}
                className="rounded-full border border-line bg-tag px-3 py-1 text-xs font-bold text-ink transition hover:brightness-95"
              >
                + Aggiungi
              </button>
            </div>
            {selectedTags.length === 0 && draft.pendingTags.length === 0 ? (
              <p className="text-sm italic text-ink-soft">Nessun tag</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-tag py-1 pl-2 pr-1.5 text-sm font-medium text-ink"
                  >
                    <Icon name="tag" size={12} className="shrink-0 text-ink-soft" />
                    {tag.name}
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => toggleTag(tag.id)}
                      className="text-ink-soft"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
                {draft.pendingTags.map((nm) => (
                  <span
                    key={nm}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-line bg-tag/60 py-1 pl-2 pr-1.5 text-sm font-medium text-ink-soft"
                  >
                    {nm}
                    <button
                      type="button"
                      title="Crea e aggiungi"
                      onClick={() => materializePending('tag', nm)}
                      className="rounded-full bg-save px-1.5 text-xs font-bold text-ink"
                    >
                      crea
                    </button>
                    <button
                      type="button"
                      title="Scarta"
                      onClick={() =>
                        setField({
                          pendingTags: draft.pendingTags.filter((x) => x !== nm),
                        })
                      }
                      className="text-ink-soft"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Luogo */}
          <div className="rounded-2xl border border-line bg-cream p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Luogo
              </span>
              <button
                type="button"
                onClick={() => setPlaceSheetOpen(true)}
                className="rounded-full border border-line bg-tag px-3 py-1 text-xs font-bold text-ink transition hover:brightness-95"
              >
                {draft.place ? 'Cambia' : '+ Aggiungi'}
              </button>
            </div>
            {draft.place ? (
              draft.place.lat != null ? (
                <PlaceCard
                  place={draft.place}
                  onRemove={() => setField({ place: null })}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft.place.name}
                    onChange={(e) =>
                      setField({
                        place: { ...draft.place, name: e.target.value },
                      })
                    }
                    placeholder="Nome del luogo (senza mappa)"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
                  />
                  <button
                    type="button"
                    title="Rimuovi"
                    onClick={() => setField({ place: null })}
                    className="shrink-0 text-ink-soft"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              )
            ) : (
              <p className="text-sm italic text-ink-soft">Nessun luogo</p>
            )}
          </div>

          {/* Canzoni */}
          <div className="rounded-2xl border border-line bg-cream p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Canzoni
              </span>
              <button
                type="button"
                onClick={() => setSongSheetOpen(true)}
                className="rounded-full border border-line bg-tag px-3 py-1 text-xs font-bold text-ink transition hover:brightness-95"
              >
                + Aggiungi
              </button>
            </div>
            {draft.songs.length === 0 ? (
              <p className="text-sm italic text-ink-soft">Nessuna canzone</p>
            ) : (
              <div className="space-y-2">
                {draft.songs.map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-line bg-tag px-2 py-1.5"
                  >
                    {song.thumbnailUrl ? (
                      <img
                        src={song.thumbnailUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-ink-soft">
                        <Icon name="music" size={16} />
                      </span>
                    )}
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-ink"
                    >
                      {song.title}
                    </a>
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() =>
                        setField({
                          songs: draft.songs.filter((_, idx) => idx !== i),
                        })
                      }
                      className="shrink-0 text-ink-soft"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
          <h2 className="font-serif text-2xl font-semibold text-ink">Fatto</h2>
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

      <input
        ref={noteFilesRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {draft && (
        <>
          <AddImagesSheet
            open={addImagesOpen}
            onClose={() => setAddImagesOpen(false)}
            onDevice={() => noteFilesRef.current?.click()}
            onImmich={immichReady ? () => setImmichOpen(true) : null}
          />
          {immichReady && (
            <ImmichPicker
              open={immichOpen}
              baseUrl={immichUrl}
              apiKey={immichApiKey}
              onClose={() => setImmichOpen(false)}
              onConfirm={(files) => {
                addFiles(files)
                setImmichOpen(false)
              }}
            />
          )}
          <PeoplePickerSheet
            open={peopleSheetOpen}
            people={allPeople}
            selectedIds={draft.peopleIds}
            immichUrl={immichUrl}
            immichApiKey={immichApiKey}
            usageCounts={peopleUsage}
            onClose={() => setPeopleSheetOpen(false)}
            onToggle={togglePerson}
            onCreated={(person) => {
              setAllPeople((prev) =>
                [...prev, person].sort((a, b) => a.name.localeCompare(b.name)),
              )
              setDraft((d) => ({ ...d, peopleIds: [...d.peopleIds, person.id] }))
            }}
          />
          <TagPickerSheet
            open={tagSheetOpen}
            tags={allTags}
            selectedIds={draft.tagIds}
            onClose={() => setTagSheetOpen(false)}
            onToggle={toggleTag}
            onCreated={(tag) => {
              setAllTags((prev) =>
                [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
              )
              setDraft((d) => ({ ...d, tagIds: [...d.tagIds, tag.id] }))
            }}
          />
          <AddSongSheet
            open={songSheetOpen}
            onClose={() => setSongSheetOpen(false)}
            onAdd={(song) =>
              setDraft((d) => ({ ...d, songs: [...d.songs, song] }))
            }
            spotifyClientId={spotifyClientId}
            spotifyClientSecret={spotifyClientSecret}
          />
          <PlacePickerSheet
            open={placeSheetOpen}
            onClose={() => setPlaceSheetOpen(false)}
            onAdd={(place) => setField({ place })}
          />
        </>
      )}
    </div>
  )
}
