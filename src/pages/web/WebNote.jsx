import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MoodSlider from '../../components/MoodSlider'
import RichText from '../../components/RichText'
import Dialog from '../../components/Dialog'
import AddImagesSheet from '../../components/AddImagesSheet'
import ImmichPicker from '../../components/ImmichPicker'
import PeoplePickerSheet from '../../components/PeoplePickerSheet'
import PersonAvatar from '../../components/PersonAvatar'
import TagPickerSheet from '../../components/TagPickerSheet'
import AddSongSheet from '../../components/AddSongSheet'
import PlacePickerSheet from '../../components/PlacePickerSheet'
import PlaceCard from '../../components/PlaceCard'
import DatePickerPopover from '../../components/DatePickerPopover'
import Icon from '../../components/Icon'
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
  checkSavedNote,
  describeError,
  parsePlace,
  peopleUsageCounts,
} from '../../lib/notes'
import { fileUrl } from '../../lib/pocketbase'
import { fetchImmichOriginalAsFile } from '../../lib/immich'
import { listPeople } from '../../lib/people'
import { listTags } from '../../lib/tags'
import { useAuth } from '../../context/AuthContext'
import {
  dayKey,
  fullDayLabel,
  timeInputValue,
} from '../../lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const emptyForm = (dKey) => ({
  title: '',
  content: '',
  mood: 0.5,
  place: null,
  songs: [],
  dateKey: dKey,
  timeStart: '09:00',
  timeEnd: '10:00',
})

const formFromRecord = (rec) => ({
  title: rec.title ?? '',
  content: rec.content ?? '',
  mood: Number(rec.mood ?? 0.5),
  place: parsePlace(rec.place),
  songs: Array.isArray(rec.songs) ? rec.songs : [],
  dateKey: dayKey(rec.date),
  timeStart: timeInputValue(rec.timeStart) || '09:00',
  timeEnd: timeInputValue(rec.timeEnd) || '10:00',
})

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

export default function WebNote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [search] = useSearchParams()
  const { user } = useAuth()
  const isNew = !id

  // Bozza arrivata da "Nuova nota con Gemini" (Sidebar): titolo, contenuto,
  // tag/persone e luogo pre-compilati, tutti da rivedere qui prima di
  // salvare — non è mai stato scritto nulla sul server.
  const aiDraft = isNew ? location.state?.aiDraft : null

  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const immichReady = Boolean(immichUrl && immichApiKey)
  const spotifyClientId = user?.spotifyClientId?.trim()
  const spotifyClientSecret = user?.spotifyClientSecret?.trim()

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
      mood: aiDraft.mood ?? base.mood,
      timeStart: aiDraft.timeStart || base.timeStart,
      timeEnd: aiDraft.timeEnd || base.timeEnd,
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
  const [dialog, setDialog] = useState(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [immichOpen, setImmichOpen] = useState(false)
  const [allPeople, setAllPeople] = useState([])
  const [peopleUsage, setPeopleUsage] = useState(null)
  const [peopleIds, setPeopleIds] = useState(() => aiDraft?.peopleIds || [])
  const [baselinePeopleIds, setBaselinePeopleIds] = useState([])
  const [peopleSheetOpen, setPeopleSheetOpen] = useState(false)
  const [allTags, setAllTags] = useState([])
  const [tagIds, setTagIds] = useState(() => aiDraft?.tagIds || [])
  const [baselineTagIds, setBaselineTagIds] = useState([])
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [songSheetOpen, setSongSheetOpen] = useState(false)
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false)
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
    peopleUsageCounts()
      .then(setPeopleUsage)
      .catch(() => {})
  }, [])

  // Bozza "dalle foto di ieri": scarica gli originali Immich e li allega.
  useEffect(() => {
    const ids = aiDraft?.immichAssetIds
    if (!ids?.length || !immichReady) return
    let alive = true
    Promise.all(
      ids.map((assetId) =>
        fetchImmichOriginalAsFile(immichUrl, immichApiKey, { id: assetId }),
      ),
    )
      .then((files) => {
        if (alive) setNewFiles((prev) => [...prev, ...files])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  )
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
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
  const mode = !existsOnServer || dirty ? 'save' : 'delete'

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

      navigate(
        `/day/${creating ? form.dateKey : dayKey(rec.date) || form.dateKey}`,
        { replace: true },
      )
    } catch (err) {
      savingRef.current = false
      setBusy(false)
      setDialog(
        err?.queued
          ? {
              title: 'Salvato in coda offline',
              lines: [
                describeError(err),
                'La nota resta aperta qui; comparirà nel diario dopo la sincronizzazione.',
              ],
            }
          : { title: 'Errore nel salvataggio', lines: [describeError(err)] },
      )
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
      <div className="ne-head">
        <button type="button" onClick={() => navigate(-1)} className="ne-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Indietro
        </button>

        {mode === 'save' ? (
          <button type="button" disabled={busy} onClick={handleSave} className="ne-save">
            {existsOnServer ? 'Salva modifiche' : 'Crea nota'}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={handleDelete} className="ne-delete">
            Elimina nota
          </button>
        )}
      </div>

      {loadError && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {loadError}
        </p>
      )}

      <div className="ne-grid">
        {/* Colonna meta */}
        <div className="ne-meta">
          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">Data</span>
            </div>
            <p className="ne-date">{fullDayLabel(form.dateKey)}</p>
            <DatePickerPopover
              dateKey={form.dateKey}
              onChange={(dateKey) => set({ dateKey })}
              buttonClassName="ne-date-link"
              textClassName="text-xs font-bold underline underline-offset-2 text-ink-soft"
            />
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">Orario</span>
            </div>
            <div className="ne-time-row">
              <input
                type="time"
                aria-label="Inizio"
                value={form.timeStart}
                onChange={(e) => set({ timeStart: e.target.value })}
                className="ne-time-input"
              />
              <span className="ne-sep">–</span>
              <input
                type="time"
                aria-label="Fine"
                value={form.timeEnd}
                onChange={(e) => set({ timeEnd: e.target.value })}
                className="ne-time-input"
              />
            </div>
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">Mood</span>
            </div>
            <MoodSlider value={form.mood} onChange={(mood) => set({ mood })} />
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">
                <Icon name="image" size={13} />
                Immagini
              </span>
              <button
                type="button"
                onClick={() =>
                  immichReady ? setAddSheetOpen(true) : fileInputRef.current?.click()
                }
                className="ne-add"
              >
                + Aggiungi
              </button>
            </div>
            {noImages ? (
              <p className="ne-empty">Nessuna immagine</p>
            ) : (
              <div className="ne-thumbs">
                {existingImages.map((fn) => (
                  <div
                    key={fn}
                    className="ne-thumb"
                    style={{
                      backgroundImage: record
                        ? `url(${fileUrl(record, fn, { thumb: '200x200' })})`
                        : undefined,
                    }}
                  >
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => {
                        setExistingImages((p) => p.filter((x) => x !== fn))
                        setRemovedImages((p) => [...p, fn])
                      }}
                      className="ne-thumb-x"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="ne-thumb is-new"
                    style={{ backgroundImage: `url(${p.url})` }}
                  >
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() =>
                        setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="ne-thumb-x"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">
                <Icon name="user" size={13} />
                Persone
              </span>
              <button type="button" onClick={() => setPeopleSheetOpen(true)} className="ne-add">
                + Aggiungi
              </button>
            </div>
            {selectedPeople.length === 0 ? (
              <p className="ne-empty">Nessuna persona</p>
            ) : (
              <div className="ne-chips">
                {selectedPeople.map((person) => (
                  <span key={person.id} className="ne-chip">
                    <PersonAvatar
                      person={person}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                      size={20}
                    />
                    {person.name}
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => togglePerson(person.id)}
                      className="rm"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">
                <Icon name="tag" size={13} />
                Tag
              </span>
              <button type="button" onClick={() => setTagSheetOpen(true)} className="ne-add">
                + Aggiungi
              </button>
            </div>
            {selectedTags.length === 0 ? (
              <p className="ne-empty">Nessun tag</p>
            ) : (
              <div className="ne-chips">
                {selectedTags.map((tag) => (
                  <span key={tag.id} className="ne-chip sq">
                    <Icon name="tag" size={11} />
                    {tag.name}
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => toggleTag(tag.id)}
                      className="rm"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">
                <Icon name="music" size={13} />
                Canzoni
              </span>
              <button type="button" onClick={() => setSongSheetOpen(true)} className="ne-add">
                + Aggiungi
              </button>
            </div>
            {form.songs.length === 0 ? (
              <p className="ne-empty">Nessuna canzone</p>
            ) : (
              <div className="ne-songs">
                {form.songs.map((song, i) => (
                  <div key={i} className="ne-song">
                    {song.thumbnailUrl ? (
                      <div
                        className="ne-song-thumb"
                        style={{ backgroundImage: `url(${song.thumbnailUrl})` }}
                      />
                    ) : (
                      <span className="ne-song-thumb">
                        <Icon name="music" size={14} />
                      </span>
                    )}
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ne-song-title"
                    >
                      {song.title}
                    </a>
                    <button
                      type="button"
                      title="Rimuovi"
                      onClick={() => removeSong(i)}
                      className="ne-song-rm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ne-sub">
            <div className="ne-sub-head">
              <span className="ne-sub-title">
                <Icon name="map-pin" size={13} />
                Luogo
              </span>
              <button type="button" onClick={() => setPlaceSheetOpen(true)} className="ne-add">
                {form.place ? 'Cambia' : '+ Aggiungi'}
              </button>
            </div>
            {form.place ? (
              <PlaceCard place={form.place} onRemove={() => set({ place: null })} />
            ) : (
              <p className="ne-empty">Nessun luogo</p>
            )}
          </div>
        </div>

        {/* Colonna editor: foglio di scrittura */}
        <div className="ne-sheet">
          <span className="ne-tape ne-tape-a" aria-hidden="true" />
          <span className="ne-tape ne-tape-b" aria-hidden="true" />
          <input
            type="text"
            placeholder="Titolo della nota"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="ne-title"
          />
          <RichText
            ref={editorRef}
            value={form.content}
            onChange={(html) => set({ content: html })}
            placeholder="Scrivi qui la nota…"
            className="ne-body"
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
        usageCounts={peopleUsage}
        onCreated={(person) => {
          setAllPeople((prev) =>
            [...prev, person].sort((a, b) => a.name.localeCompare(b.name)),
          )
          setPeopleIds((prev) => [...prev, person.id])
        }}
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
    </div>
  )
}
