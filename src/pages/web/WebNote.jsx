import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MoodSlider from '../../components/MoodSlider'
import RichText from '../../components/RichText'
import Dialog from '../../components/Dialog'
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
  checkSavedNote,
  describeError,
} from '../../lib/notes'
import { fileUrl } from '../../lib/pocketbase'
import {
  dayKey,
  fullDayLabel,
  parseWall,
  timeInputValue,
} from '../../lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const nowYear = new Date().getFullYear()
const YEARS = Array.from({ length: 9 }, (_, i) => nowYear + 2 - i)

const emptyForm = (dKey) => ({
  title: '',
  content: '',
  mood: 0.5,
  dateKey: dKey,
  timeStart: '09:00',
  timeEnd: '10:00',
})

const formFromRecord = (rec) => ({
  title: rec.title ?? '',
  content: rec.content ?? '',
  mood: Number(rec.mood ?? 0.5),
  dateKey: dayKey(rec.date),
  timeStart: timeInputValue(rec.timeStart) || '09:00',
  timeEnd: timeInputValue(rec.timeEnd) || '10:00',
})

const snapshot = (f) =>
  JSON.stringify({
    title: f.title,
    content: f.content,
    mood: Number(f.mood),
    dateKey: f.dateKey,
    timeStart: f.timeStart,
    timeEnd: f.timeEnd,
  })

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none transition focus:border-ink-soft'

export default function WebNote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const isNew = !id

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
  const [dialog, setDialog] = useState(null)
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)
  const savingRef = useRef(false)

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
      })
      .catch((err) => alive && setLoadError(describeError(err)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, isNew])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  )
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  )

  const dirty =
    !existsOnServer ||
    snapshot(form) !== baseline ||
    newFiles.length > 0 ||
    removedImages.length > 0
  const mode = !existsOnServer || dirty ? 'save' : 'delete'

  const parsed = parseWall(form.dateKey)
  const year = parsed?.y ?? nowYear

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
        ? await createNote(form, newFiles)
        : await updateNote(effectiveId, form, newFiles, removedImages)

      setRecord(rec)
      setCreatedId(rec.id)
      setExistingImages(rec.images || [])
      setNewFiles([])
      setRemovedImages([])
      setBaseline(snapshot(form))

      const problems = checkSavedNote(rec, {
        title: form.title,
        content: form.content,
        mood: form.mood,
        imageCount,
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

      navigate(
        `/day/${creating ? form.dateKey : dayKey(rec.date) || form.dateKey}`,
        { replace: true },
      )
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
    return <p className="py-20 text-center text-ink-soft">Carico…</p>
  }

  const noImages = existingImages.length === 0 && previews.length === 0

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Indietro
        </button>

        {mode === 'save' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="rounded-full border border-save-dark bg-save px-6 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
          >
            {existsOnServer ? 'Salva modifiche' : 'Crea nota'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded-full border border-delete-dark bg-delete px-6 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
          >
            Elimina nota
          </button>
        )}
      </header>

      {loadError && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {loadError}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Colonna meta */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Data
            </p>
            <p className="mt-1 font-serif text-lg text-ink">
              {fullDayLabel(form.dateKey)}
            </p>
            {isNew && !existsOnServer && (
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-soft">
                Anno
                <select
                  value={year}
                  onChange={(e) => changeYear(Number(e.target.value))}
                  className="rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Orario
            </p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Inizio"
                value={form.timeStart}
                onChange={(e) => set({ timeStart: e.target.value })}
                className={inputCls}
              />
              <span className="text-ink-soft">–</span>
              <input
                type="time"
                aria-label="Fine"
                value={form.timeEnd}
                onChange={(e) => set({ timeEnd: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <MoodSlider value={form.mood} onChange={(mood) => set({ mood })} />
          </div>

          <div className="rounded-2xl border border-line bg-tag p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Immagini
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-line bg-cream px-3 py-1 text-xs font-bold text-ink transition hover:bg-tag"
              >
                + Aggiungi
              </button>
            </div>
            {noImages ? (
              <p className="text-sm italic text-ink-soft">Nessuna immagine</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((fn) => (
                  <div
                    key={fn}
                    className="relative aspect-square overflow-hidden rounded-lg bg-panel-2"
                  >
                    <img
                      src={record ? fileUrl(record, fn, { thumb: '200x200' }) : ''}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => {
                        setExistingImages((p) => p.filter((x) => x !== fn))
                        setRemovedImages((p) => [...p, fn])
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-lg bg-panel-2 ring-2 ring-save"
                  >
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() =>
                        setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
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
        </div>

        {/* Colonna editor */}
        <div className="rounded-2xl border border-line bg-cream">
          <input
            type="text"
            placeholder="Titolo della nota"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full bg-transparent px-6 pb-3 pt-5 font-serif text-3xl font-semibold text-ink outline-none placeholder:text-ink-soft/70"
          />
          <div className="mx-6 flex items-center gap-1.5 border-t border-line-soft py-2">
            <FmtBtn label="B" cmd="bold" editorRef={editorRef} className="font-extrabold" />
            <FmtBtn label="I" cmd="italic" editorRef={editorRef} className="font-serif italic" />
            <FmtBtn label="U" cmd="underline" editorRef={editorRef} className="underline" />
          </div>
          <RichText
            ref={editorRef}
            value={form.content}
            onChange={(html) => set({ content: html })}
            placeholder="Scrivi qui la nota…"
            className="min-h-[440px] px-6 py-4 text-[15px] leading-relaxed text-ink"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onPickFiles}
      />

      <Dialog
        open={Boolean(dialog)}
        title={dialog?.title}
        lines={dialog?.lines || []}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

function FmtBtn({ label, cmd, editorRef, className = '' }) {
  return (
    <button
      type="button"
      title={label}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => editorRef.current?.exec(cmd)}
      className={
        'h-8 w-9 rounded-lg border border-line bg-tag text-base text-ink transition hover:bg-cream ' +
        className
      }
    >
      {label}
    </button>
  )
}
