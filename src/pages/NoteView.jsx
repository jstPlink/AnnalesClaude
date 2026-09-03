import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import YearPill from '../components/YearPill'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import MoodSlider from '../components/MoodSlider'
import Dialog from '../components/Dialog'
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
  checkSavedNote,
  describeError,
} from '../lib/notes'
import { fileUrl } from '../lib/pocketbase'
import { dayKey, dayMonthLabel, parseWall, timeInputValue } from '../lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function emptyForm(dKey) {
  return {
    title: '',
    content: '',
    mood: 0.5,
    dateKey: dKey,
    timeStart: '09:00',
    timeEnd: '10:00',
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
  const [dialog, setDialog] = useState(null) // { title, lines }
  const fileInputRef = useRef(null)
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
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [previews])

  const dirty =
    !existsOnServer ||
    snapshot(form) !== baseline ||
    newFiles.length > 0 ||
    removedImages.length > 0

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
        ? await createNote(form, newFiles)
        : await updateNote(effectiveId, form, newFiles, removedImages)

      // Adotta il record salvato: eventuali nuovi salvataggi diventano update.
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

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 px-3 pb-3">
          <label className="flex flex-col items-center rounded-xl border border-line bg-cream px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            inizio
            <input
              type="time"
              value={form.timeStart}
              onChange={(e) => set({ timeStart: e.target.value })}
              className="time-compact w-16 bg-transparent text-center text-sm font-bold text-ink outline-none"
            />
          </label>

          <div className="flex min-w-0 justify-center">
            <YearPill
              year={year}
              onChange={existsOnServer ? undefined : changeYear}
              subtitle={dayMonthLabel(form.dateKey)}
              minWidth={96}
            />
          </div>

          <label className="flex flex-col items-center rounded-xl border border-line bg-cream px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            fine
            <input
              type="time"
              value={form.timeEnd}
              onChange={(e) => set({ timeEnd: e.target.value })}
              className="time-compact w-16 bg-transparent text-center text-sm font-bold text-ink outline-none"
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

        <input
          type="text"
          placeholder="Titolo della nota"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className="mt-5 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-lg font-bold text-ink outline-none focus:border-ink-soft"
        />

        <div className="mt-4">
          <textarea
            rows={10}
            placeholder="Scrivi in Markdown…"
            value={form.content}
            onChange={(e) => set({ content: e.target.value })}
            className="w-full resize-y rounded-2xl border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none focus:border-ink-soft"
          />
          {form.content.trim() && (
            <div className="mt-2">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                Anteprima
              </p>
              <div className="markdown-body rounded-2xl border border-line-soft bg-cream px-4 py-3 text-[15px] text-ink">
                <Markdown remarkPlugins={[remarkGfm]}>{form.content}</Markdown>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Immagini
          </p>
          {existingImages.length === 0 && previews.length === 0 ? (
            <p className="text-sm italic text-ink-soft">
              Nessuna immagine. Usa il pulsante in basso a destra per aggiungerne.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((fn) => (
                <div
                  key={fn}
                  className="relative aspect-square overflow-hidden rounded-xl bg-panel-2"
                >
                  <img
                    src={record ? fileUrl(record, fn, { thumb: '300x300' }) : ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
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
        primaryIcon="image-plus"
        primaryTitle="Aggiungi immagini"
        onPrimary={() => fileInputRef.current?.click()}
      />

      <Dialog
        open={Boolean(dialog)}
        title={dialog?.title}
        lines={dialog?.lines || []}
        onClose={() => setDialog(null)}
      />
    </PhoneShell>
  )
}
