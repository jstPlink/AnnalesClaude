import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import DatePickerPopover from '../components/DatePickerPopover'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import MoodSlider from '../components/MoodSlider'
import RichText from '../components/RichText'
import Dialog from '../components/Dialog'
import ImageLightbox from '../components/ImageLightbox'
import AddImagesSheet from '../components/AddImagesSheet'
import ImmichPicker from '../components/ImmichPicker'
import PeoplePickerSheet from '../components/PeoplePickerSheet'
import PersonAvatar from '../components/PersonAvatar'
import TagPickerSheet from '../components/TagPickerSheet'
import AddSongSheet from '../components/AddSongSheet'
import PlacePickerSheet from '../components/PlacePickerSheet'
import PlaceCard from '../components/PlaceCard'
import GeminiSheet from '../components/GeminiSheet'
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
  checkSavedNote,
  describeError,
  parsePlace,
} from '../lib/notes'
import { fileUrl } from '../lib/pocketbase'
import { listPeople } from '../lib/people'
import { listTags } from '../lib/tags'
import { useAuth } from '../context/AuthContext'
import {
  dayKey,
  nowRoundedTo5,
  parseWall,
  subtractHours,
  timeInputValue,
} from '../lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Pallino con conteggio sopra un pulsante di aggiunta contenuto: rende
// visibile a colpo d'occhio che c'è già almeno un elemento di quel tipo.
function CountBadge({ count }) {
  if (!count) return null
  return (
    <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-sand bg-save px-1 text-[10px] font-extrabold text-ink">
      {count}
    </span>
  )
}

function emptyForm(dKey) {
  const timeEnd = nowRoundedTo5()
  return {
    title: '',
    content: '',
    mood: 0.5,
    place: null,
    songs: [],
    dateKey: dKey,
    timeStart: subtractHours(timeEnd, 2),
    timeEnd,
  }
}

function formFromRecord(rec) {
  return {
    title: rec.title ?? '',
    content: rec.content ?? '',
    mood: Number(rec.mood ?? 0.5),
    place: parsePlace(rec.place),
    songs: Array.isArray(rec.songs) ? rec.songs : [],
    dateKey: dayKey(rec.date),
    timeStart: timeInputValue(rec.timeStart) || '09:00',
    timeEnd: timeInputValue(rec.timeEnd) || '10:00',
  }
}

const snapshot = (f) =>
  JSON.stringify({
    title: f.title,
    content: f.content,
    mood: Number(f.mood),
    place: f.place,
    songs: f.songs,
    dateKey: f.dateKey,
    timeStart: f.timeStart,
    timeEnd: f.timeEnd,
  })

export default function NoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [search] = useSearchParams()
  const { user } = useAuth()
  const isNew = !id

  // Bozza arrivata da "Nuova nota con Gemini" (MonthView/Sidebar): titolo,
  // contenuto, tag/persone e luogo pre-compilati, tutti da rivedere qui
  // prima di salvare — non è mai stato scritto nulla sul server.
  const aiDraft = isNew ? location.state?.aiDraft : null

  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const immichReady = Boolean(immichUrl && immichApiKey)
  const spotifyClientId = user?.spotifyClientId?.trim()
  const spotifyClientSecret = user?.spotifyClientSecret?.trim()
  const geminiApiKey = user?.geminiApiKey?.trim()

  const dateParam = search.get('date')
  const initialDate =
    dateParam && DATE_RE.test(dateParam) ? dateParam : dayKey(new Date())

  const initialForm = () => {
    const base = emptyForm(initialDate)
    if (!aiDraft) return base
    return {
      ...base,
      title: aiDraft.title || '',
      content: aiDraft.content || '',
      place: aiDraft.place || null,
    }
  }

  const [form, setForm] = useState(initialForm)
  const [baseline, setBaseline] = useState(() => snapshot(initialForm()))
  const [existingImages, setExistingImages] = useState([])
  const [record, setRecord] = useState(null)
  const [createdId, setCreatedId] = useState(null)
  const [newFiles, setNewFiles] = useState([])
  const [removedImages, setRemovedImages] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [dialog, setDialog] = useState(null) // { title, lines }
  const [viewerIndex, setViewerIndex] = useState(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [immichOpen, setImmichOpen] = useState(false)
  const [allPeople, setAllPeople] = useState([])
  const [peopleIds, setPeopleIds] = useState(() => aiDraft?.peopleIds || [])
  const [baselinePeopleIds, setBaselinePeopleIds] = useState([])
  const [peopleSheetOpen, setPeopleSheetOpen] = useState(false)
  const [allTags, setAllTags] = useState([])
  const [tagIds, setTagIds] = useState(() => aiDraft?.tagIds || [])
  const [baselineTagIds, setBaselineTagIds] = useState([])
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [songSheetOpen, setSongSheetOpen] = useState(false)
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false)
  const [geminiSheetOpen, setGeminiSheetOpen] = useState(false)
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)
  const savingRef = useRef(false) // guardia anti doppio invio

  const effectiveId = id || createdId
  const existsOnServer = Boolean(effectiveId)

  useEffect(() => {
    if (isNew) return
    let alive = true
    setLoading(true)
    getNote(id)
      .then((rec) => {
        if (!alive) return
        setRecord(rec)
        const f = formFromRecord(rec)
        setForm(f)
        setBaseline(snapshot(f))
        setExistingImages(rec.images || [])
        setPeopleIds(rec.people || [])
        setBaselinePeopleIds(rec.people || [])
        setTagIds(rec.tags || [])
        setBaselineTagIds(rec.tags || [])
      })
      .catch((err) => alive && setLoadError(describeError(err)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, isNew])

  useEffect(() => {
    listPeople()
      .then(setAllPeople)
      .catch(() => {})
    listTags()
      .then(setAllTags)
      .catch(() => {})
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  )
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [previews])

  const galleryImages = useMemo(
    () => [
      ...existingImages.map((fn) => ({
        url: record ? fileUrl(record, fn) : '',
        key: fn,
      })),
      ...previews.map((p) => ({ url: p.url, key: p.url })),
    ],
    [existingImages, previews, record],
  )

  const selectedPeople = useMemo(
    () => allPeople.filter((p) => peopleIds.includes(p.id)),
    [allPeople, peopleIds],
  )

  function togglePerson(id) {
    setPeopleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectedTags = useMemo(
    () => allTags.filter((t) => tagIds.includes(t.id)),
    [allTags, tagIds],
  )

  function toggleTag(id) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function removeSong(index) {
    setForm((f) => ({ ...f, songs: f.songs.filter((_, i) => i !== index) }))
  }

  const peopleDirty =
    JSON.stringify([...peopleIds].sort()) !== JSON.stringify([...baselinePeopleIds].sort())
  const tagsDirty =
    JSON.stringify([...tagIds].sort()) !== JSON.stringify([...baselineTagIds].sort())

  const dirty =
    !existsOnServer ||
    snapshot(form) !== baseline ||
    newFiles.length > 0 ||
    removedImages.length > 0 ||
    peopleDirty ||
    tagsDirty

  // Verde = salva (nota nuova o modificata). Rosso = elimina (esistente invariata).
  const mode = !existsOnServer || dirty ? 'save' : 'delete'

  const parsed = parseWall(form.dateKey)
  const year = parsed?.y ?? new Date().getFullYear()

  const onPickFiles = useCallback((e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length) setNewFiles((prev) => [...prev, ...picked])
    e.target.value = ''
  }, [])

  async function handleSave() {
    if (savingRef.current) return
    savingRef.current = true
    setBusy(true)
    setDialog(null)
    const creating = !existsOnServer
    const imageCount = existingImages.length + newFiles.length
    try {
      const rec = creating
        ? await createNote(form, { newFiles, peopleIds, tagIds })
        : await updateNote(effectiveId, form, { newFiles, removedImages, peopleIds, tagIds })

      // Adotta il record salvato: eventuali nuovi salvataggi diventano update.
      setRecord(rec)
      setCreatedId(rec.id)
      setExistingImages(rec.images || [])
      setNewFiles([])
      setRemovedImages([])
      setBaseline(snapshot(form))
      setPeopleIds(rec.people || [])
      setBaselinePeopleIds(rec.people || [])
      setTagIds(rec.tags || [])
      setBaselineTagIds(rec.tags || [])

      const problems = checkSavedNote(rec, {
        title: form.title,
        content: form.content,
        mood: form.mood,
        imageCount,
        peopleCount: peopleIds.length,
        tagCount: tagIds.length,
        dateKey: form.dateKey,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
      })

      if (problems.length) {
        savingRef.current = false
        setBusy(false)
        setDialog({
          title: 'La nota potrebbe non essere stata salvata correttamente',
          lines: [
            ...problems,
            'La nota resta aperta qui: correggi e salva di nuovo, oppure eliminala.',
          ],
        })
        return
      }

      const targetDay = creating ? form.dateKey : dayKey(rec.date) || form.dateKey
      navigate(`/day/${targetDay}`, { replace: true })
    } catch (err) {
      savingRef.current = false
      setBusy(false)
      setDialog({ title: 'Errore nel salvataggio', lines: [describeError(err)] })
    }
  }

  async function handleDelete() {
    if (!window.confirm('Eliminare definitivamente questa nota?')) return
    setBusy(true)
    setDialog(null)
    try {
      await deleteNote(effectiveId)
      navigate(`/day/${form.dateKey}`, { replace: true })
    } catch (err) {
      setBusy(false)
      setDialog({
        title: "Errore nell'eliminazione",
        lines: [describeError(err)],
      })
    }
  }

  if (loading) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center text-ink-soft">
          Carico…
        </div>
      </PhoneShell>
    )
  }

  const noImages = existingImages.length === 0 && previews.length === 0
  const hasExtras =
    selectedPeople.length > 0 ||
    selectedTags.length > 0 ||
    Boolean(form.place) ||
    form.songs.length > 0 ||
    !noImages

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 pb-2">
          <CircleButton onClick={() => navigate(-1)} title="Indietro">
            <Icon name="chevron-left" size={22} />
          </CircleButton>
          <span className="text-center text-[1.3rem] font-bold text-ink-soft tabular-nums">
            {year}
          </span>
          <CircleButton
            variant={mode}
            disabled={busy}
            onClick={mode === 'save' ? handleSave : handleDelete}
            title={mode === 'save' ? 'Salva' : 'Elimina nota'}
          >
            <Icon name={mode === 'save' ? 'check' : 'trash'} size={22} />
          </CircleButton>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-stretch gap-2 px-3 pb-3">
          <label className="flex items-center justify-center rounded-full border border-line bg-tag px-3">
            <input
              type="time"
              aria-label="Orario di inizio"
              value={form.timeStart}
              onChange={(e) => set({ timeStart: e.target.value })}
              className="time-compact w-[5rem] bg-transparent text-center text-base font-extrabold tabular-nums text-ink outline-none"
            />
          </label>

          <div className="flex items-center justify-center">
            <DatePickerPopover
              dateKey={form.dateKey}
              onChange={(dateKey) => set({ dateKey })}
              textClassName="text-base font-bold"
            />
          </div>

          <label className="flex items-center justify-center rounded-full border border-line bg-tag px-3">
            <input
              type="time"
              aria-label="Orario di fine"
              value={form.timeEnd}
              onChange={(e) => set({ timeEnd: e.target.value })}
              className="time-compact w-[5rem] bg-transparent text-center text-base font-extrabold tabular-nums text-ink outline-none"
            />
          </label>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 py-4">
        {loadError && (
          <p className="mb-4 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
            {loadError}
          </p>
        )}

        <MoodSlider value={form.mood} onChange={(mood) => set({ mood })} />

        {/* Titolo + contenuto in un unico riquadro: nessun bordo esterno,
            solo il divisorio tra titolo e contenuto. Almeno il 40% dello
            schermo anche vuoto: se le altre informazioni sotto sforano, è
            la pagina intera (main) a scorrere, non questo riquadro. */}
        <div className="mt-4 flex min-h-[40dvh] flex-1 flex-col overflow-hidden rounded-2xl bg-cream">
          <input
            type="text"
            placeholder="Titolo della nota"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full shrink-0 bg-transparent px-4 pb-2 pt-3 text-xl font-extrabold text-ink outline-none placeholder:text-ink-soft"
          />
          <div className="mx-4 shrink-0 border-t border-line-soft" />
          <RichText
            ref={editorRef}
            value={form.content}
            onChange={(html) => set({ content: html })}
            placeholder="Scrivi qui la nota…"
            className="flex-1 px-4 py-3 text-[15px] leading-relaxed text-ink"
          />
        </div>

        {hasExtras && (
          <div className="mt-4 space-y-3 rounded-2xl bg-panel p-3">
            {(selectedTags.length > 0 || selectedPeople.length > 0 || form.place) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="flex w-full items-center gap-1.5 rounded-lg border border-line bg-cream py-1 pl-2 pr-2"
                    >
                      <Icon name="tag" size={13} className="shrink-0 text-ink-soft" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {tag.name}
                      </span>
                      <button
                        type="button"
                        title="Rimuovi"
                        onClick={() => toggleTag(tag.id)}
                        className="shrink-0 text-ink-soft"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </span>
                  ))}

                  {selectedPeople.map((person) => (
                    <span
                      key={person.id}
                      className="flex w-full items-center gap-2 rounded-full border border-line bg-tag py-1 pl-1 pr-2"
                    >
                      <PersonAvatar
                        person={person}
                        immichUrl={immichUrl}
                        immichApiKey={immichApiKey}
                        size={24}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {person.name}
                      </span>
                      <button
                        type="button"
                        title="Rimuovi"
                        onClick={() => togglePerson(person.id)}
                        className="shrink-0 text-ink-soft"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                <div>
                  {form.place && (
                    <PlaceCard place={form.place} onRemove={() => set({ place: null })} />
                  )}
                </div>
              </div>
            )}

            {form.songs.length > 0 && (
              <div className="space-y-2">
                {form.songs.map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-tag px-3 py-2"
                  >
                    {song.thumbnailUrl ? (
                      <img
                        src={song.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-ink-soft">
                        <Icon name="music" size={18} />
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
                      onClick={() => removeSong(i)}
                      className="shrink-0 text-ink-soft"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!noImages && (
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((fn, i) => (
                  <div
                    key={fn}
                    className="relative aspect-square overflow-hidden rounded-xl bg-panel-2"
                  >
                    <button
                      type="button"
                      title="Visualizza"
                      onClick={() => setViewerIndex(i)}
                      className="block h-full w-full"
                    >
                      <img
                        src={record ? fileUrl(record, fn, { thumb: '300x300' }) : ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => {
                        setExistingImages((prev) => prev.filter((x) => x !== fn))
                        setRemovedImages((prev) => [...prev, fn])
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-xl bg-panel-2 ring-2 ring-save"
                  >
                    <button
                      type="button"
                      title="Visualizza"
                      onClick={() => setViewerIndex(existingImages.length + i)}
                      className="block h-full w-full"
                    >
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() =>
                        setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-6" />
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onPickFiles}
      />

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-line bg-sand px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <CircleButton
          size={52}
          variant="active"
          onClick={() => setGeminiSheetOpen(true)}
          title="Gemini"
        >
          <Icon name="sparkles" size={20} />
        </CircleButton>

        <div className="flex items-center gap-2">
        <div className="relative">
          <CircleButton
            size={52}
            variant={selectedPeople.length ? 'filled' : 'light'}
            onClick={() => setPeopleSheetOpen(true)}
            title="Aggiungi persone"
          >
            <Icon name="user" size={20} />
          </CircleButton>
          <CountBadge count={selectedPeople.length} />
        </div>
        <div className="relative">
          <CircleButton
            size={52}
            variant={selectedTags.length ? 'filled' : 'light'}
            onClick={() => setTagSheetOpen(true)}
            title="Aggiungi tag"
          >
            <Icon name="tag" size={20} />
          </CircleButton>
          <CountBadge count={selectedTags.length} />
        </div>
        <div className="relative">
          <CircleButton
            size={52}
            variant={form.songs.length ? 'filled' : 'light'}
            onClick={() => setSongSheetOpen(true)}
            title="Aggiungi canzone"
          >
            <Icon name="music" size={20} />
          </CircleButton>
          <CountBadge count={form.songs.length} />
        </div>
        <div className="relative">
          <CircleButton
            size={52}
            variant={form.place ? 'filled' : 'light'}
            onClick={() => setPlaceSheetOpen(true)}
            title="Aggiungi luogo"
          >
            <Icon name="map-pin" size={20} />
          </CircleButton>
          <CountBadge count={form.place ? 1 : 0} />
        </div>
        <div className="relative">
          <CircleButton
            size={52}
            variant={existingImages.length + previews.length ? 'filled' : 'light'}
            onClick={() => (immichReady ? setAddSheetOpen(true) : fileInputRef.current?.click())}
            title="Aggiungi immagini"
          >
            <Icon name="image-plus" size={22} />
          </CircleButton>
          <CountBadge count={existingImages.length + previews.length} />
        </div>
        </div>
      </div>

      <Dialog
        open={Boolean(dialog)}
        title={dialog?.title}
        lines={dialog?.lines || []}
        onClose={() => setDialog(null)}
      />

      <ImageLightbox
        images={galleryImages}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndex={setViewerIndex}
      />

      <AddImagesSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onDevice={() => fileInputRef.current?.click()}
        onImmich={immichReady ? () => setImmichOpen(true) : null}
      />

      {immichReady && (
        <ImmichPicker
          open={immichOpen}
          baseUrl={immichUrl}
          apiKey={immichApiKey}
          onClose={() => setImmichOpen(false)}
          onConfirm={(files) => {
            setNewFiles((prev) => [...prev, ...files])
            setImmichOpen(false)
          }}
        />
      )}

      <PeoplePickerSheet
        open={peopleSheetOpen}
        people={allPeople}
        selectedIds={peopleIds}
        immichUrl={immichUrl}
        immichApiKey={immichApiKey}
        onClose={() => setPeopleSheetOpen(false)}
        onToggle={togglePerson}
      />

      <TagPickerSheet
        open={tagSheetOpen}
        tags={allTags}
        selectedIds={tagIds}
        onClose={() => setTagSheetOpen(false)}
        onToggle={toggleTag}
        onCreated={(tag) => {
          setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
          setTagIds((prev) => [...prev, tag.id])
        }}
      />

      <AddSongSheet
        open={songSheetOpen}
        onClose={() => setSongSheetOpen(false)}
        onAdd={(song) => setForm((f) => ({ ...f, songs: [...f.songs, song] }))}
        spotifyClientId={spotifyClientId}
        spotifyClientSecret={spotifyClientSecret}
      />

      <PlacePickerSheet
        open={placeSheetOpen}
        onClose={() => setPlaceSheetOpen(false)}
        onAdd={(place) => set({ place })}
      />

      <GeminiSheet
        open={geminiSheetOpen}
        onClose={() => setGeminiSheetOpen(false)}
        apiKey={geminiApiKey}
        content={form.content}
        onReplaceContent={(text) => set({ content: text })}
        allPeople={allPeople}
        selectedPeopleIds={peopleIds}
        onTogglePerson={togglePerson}
      />
    </PhoneShell>
  )
}
