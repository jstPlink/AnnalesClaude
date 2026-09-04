import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import YearPill from '../components/YearPill'
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
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
  checkSavedNote,
  describeError,
} from '../lib/notes'
import { fileUrl } from '../lib/pocketbase'
import { listPeople } from '../lib/people'
import { useAuth } from '../context/AuthContext'
import {
  dayKey,
  dayMonthLabel,
  nowRoundedTo5,
  parseWall,
  subtractHours,
  timeInputValue,
} from '../lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function emptyForm(dKey) {
  const timeEnd = nowRoundedTo5()
  return {
    title: '',
    content: '',
    mood: 0.5,
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
    dateKey: f.dateKey,
    timeStart: f.timeStart,
    timeEnd: f.timeEnd,
  })

export default function NoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const { user } = useAuth()
  const isNew = !id

  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const immichReady = Boolean(immichUrl && immichApiKey)

  const dateParam = search.get('date')
  const initialDate =
    dateParam && DATE_RE.test(dateParam) ? dateParam : dayKey(new Date())

  const [form, setForm] = useState(() => emptyForm(initialDate))
  const [baseline, setBaseline] = useState(() => snapshot(emptyForm(initialDate)))
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
  const [peopleIds, setPeopleIds] = useState([])
  const [baselinePeopleIds, setBaselinePeopleIds] = useState([])
  const [peopleSheetOpen, setPeopleSheetOpen] = useState(false)
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

  const peopleDirty =
    JSON.stringify([...peopleIds].sort()) !== JSON.stringify([...baselinePeopleIds].sort())

  const dirty =
    !existsOnServer ||
    snapshot(form) !== baseline ||
    newFiles.length > 0 ||
    removedImages.length > 0 ||
    peopleDirty

  // Verde = salva (nota nuova o modificata). Rosso = elimina (esistente invariata).
  const mode = !existsOnServer || dirty ? 'save' : 'delete'

  const parsed = parseWall(form.dateKey)
  const year = parsed?.y ?? new Date().getFullYear()

  function changeYear(newYear) {
    if (!parsed) return
    const mm = String(parsed.mo).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    set({ dateKey: `${newYear}-${mm}-${dd}` })
  }

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
        ? await createNote(form, newFiles, peopleIds)
        : await updateNote(effectiveId, form, newFiles, removedImages, peopleIds)

      // Adotta il record salvato: eventuali nuovi salvataggi diventano update.
      setRecord(rec)
      setCreatedId(rec.id)
      setExistingImages(rec.images || [])
      setNewFiles([])
      setRemovedImages([])
      setBaseline(snapshot(form))
      setPeopleIds(rec.people || [])
      setBaselinePeopleIds(rec.people || [])

      const problems = checkSavedNote(rec, {
        title: form.title,
        content: form.content,
        mood: form.mood,
        imageCount,
        peopleCount: peopleIds.length,
        dateKey: creating ? form.dateKey : null,
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

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between px-4 pb-2">
          <CircleButton size={40} onClick={() => navigate(-1)} title="Indietro">
            <Icon name="chevron-left" size={20} />
          </CircleButton>
          <CircleButton
            size={44}
            variant={mode}
            disabled={busy}
            onClick={mode === 'save' ? handleSave : handleDelete}
            title={mode === 'save' ? 'Salva' : 'Elimina nota'}
          >
            <Icon name={mode === 'save' ? 'check' : 'trash'} size={20} />
          </CircleButton>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 px-3 pb-3">
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
            <YearPill
              year={year}
              onChange={existsOnServer ? undefined : changeYear}
              subtitle={dayMonthLabel(form.dateKey)}
              minWidth={104}
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

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {loadError && (
          <p className="mb-4 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
            {loadError}
          </p>
        )}

        <MoodSlider value={form.mood} onChange={(mood) => set({ mood })} />

        {/* Titolo + contenuto in un unico riquadro: nessun bordo esterno,
            solo il divisorio tra titolo e contenuto. */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-cream">
          <input
            type="text"
            placeholder="Titolo della nota"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full bg-transparent px-4 pb-2 pt-3 text-xl font-extrabold text-ink outline-none placeholder:text-ink-soft"
          />
          <div className="mx-4 border-t border-line-soft" />
          <RichText
            ref={editorRef}
            value={form.content}
            onChange={(html) => set({ content: html })}
            placeholder="Scrivi qui la nota…"
            className="min-h-[220px] px-4 py-3 text-[15px] leading-relaxed text-ink"
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Persone
          </p>
          {selectedPeople.length === 0 ? (
            <p className="text-sm italic text-ink-soft">Nessuna persona</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedPeople.map((person) => (
                <span
                  key={person.id}
                  className="flex items-center gap-2 rounded-full border border-line bg-tag py-1 pl-1 pr-3"
                >
                  <PersonAvatar
                    person={person}
                    immichUrl={immichUrl}
                    immichApiKey={immichApiKey}
                    size={24}
                  />
                  <span className="text-sm font-semibold text-ink">{person.name}</span>
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
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Immagini
          </p>
          {noImages ? (
            <p className="text-sm italic text-ink-soft">Nessuna immagine</p>
          ) : (
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

      <Footer
        items={[
          null,
          null,
          {
            icon: 'user',
            title: 'Aggiungi persone',
            active: peopleIds.length > 0,
            onClick: () => setPeopleSheetOpen(true),
          },
        ]}
        primaryIcon="image-plus"
        primaryTitle="Aggiungi immagini"
        onPrimary={() =>
          immichReady ? setAddSheetOpen(true) : fileInputRef.current?.click()
        }
      />

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
    </PhoneShell>
  )
}
