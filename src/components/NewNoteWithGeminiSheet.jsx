import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import {
  draftNoteFromPrompt,
  draftNoteFromPhotos,
  describeGeminiError,
  loadGeminiPromptDraft,
  saveGeminiPromptDraft,
  clearGeminiPromptDraft,
} from '../lib/gemini'
import { searchPlaces } from '../lib/leaflet'
import {
  searchImmichPhotos,
  fetchImmichThumbnailBlob,
  describeImmichError,
} from '../lib/immich'
import { addDaysKey, dayMonthLabel, todayKey } from '../lib/dates'

// Dialog per creare una nota intera con Gemini: da un prompt scritto, oppure
// dalle foto di ieri (se Immich è configurato). Il risultato apre la nota già
// compilata, da rivedere prima di salvare — nulla viene salvato da qui.

const MAX_PHOTOS_TO_GEMINI = 10

// Esempi vari per il placeholder del prompt: uno diverso a ogni apertura del
// dialog, invece di un unico esempio fisso (con un nome sempre uguale).
const PROMPT_PLACEHOLDERS = [
  'Es. oggi pranzo con Marco al ristorante vicino al lago, giornata bellissima…',
  'Es. mattinata di lavoro intensa, poi corsa al parco e cena con la famiglia…',
  'Es. giornata no: sveglia tardi, riunione stressante, serata di recupero con un film…',
  'Es. gita fuori porta con gli amici, tanto sole e la scoperta di un paesino carino…',
  'Es. giornata tranquilla in casa, un po’ di lettura e la spesa fatta insieme…',
  'Es. mattina dal dentista, poi shopping e aperitivo con i colleghi…',
]

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function Thumb({ baseUrl, apiKey, asset, selected, onToggle }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    let obj = ''
    fetchImmichThumbnailBlob(baseUrl, apiKey, asset.id)
      .then((blob) => {
        if (!alive) return
        obj = URL.createObjectURL(blob)
        setUrl(obj)
      })
      .catch(() => {})
    return () => {
      alive = false
      if (obj) URL.revokeObjectURL(obj)
    }
  }, [baseUrl, apiKey, asset.id])
  return (
    <button
      type="button"
      onClick={() => onToggle(asset.id)}
      className={
        'relative aspect-square overflow-hidden rounded-lg bg-panel-2 ' +
        (selected ? 'ring-2 ring-save' : 'opacity-60')
      }
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-panel-2" />
      )}
      {selected && (
        <span className="absolute right-1 top-1 rounded-full bg-save p-0.5 text-ink">
          <Icon name="check" size={12} />
        </span>
      )}
    </button>
  )
}

function resolveIds(names, list, keyName) {
  const wanted = names.map((n) => n.trim().toLowerCase())
  return list.filter((x) => wanted.includes(x[keyName].trim().toLowerCase())).map((x) => x.id)
}

async function resolvePlace(name) {
  if (!name) return null
  try {
    const found = await searchPlaces(name)
    return found[0]
      ? { name: found[0].shortName, lat: found[0].lat, lon: found[0].lon }
      : { name, lat: null, lon: null }
  } catch {
    return { name, lat: null, lon: null }
  }
}

export default function NewNoteWithGeminiSheet({
  open,
  onClose,
  apiKey,
  customInstructions,
  immichUrl,
  immichApiKey,
  allPeople,
  allTags,
  onGenerated,
}) {
  const immichReady = Boolean(immichUrl && immichApiKey)
  const yKey = addDaysKey(todayKey(), -1)

  const [mode, setMode] = useState('prompt') // prompt | photos
  const [prompt, setPrompt] = useState('')
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [placeholder, setPlaceholder] = useState(PROMPT_PLACEHOLDERS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [assets, setAssets] = useState([])
  const [selected, setSelected] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('prompt')
    // Se un tentativo precedente è fallito (rete, chiave, limite...) il
    // prompt scritto è ancora in locale: lo si ritrova qui invece di
    // doverlo riscrivere da capo.
    const draft = loadGeminiPromptDraft()
    setPrompt(draft)
    setRestoredDraft(Boolean(draft))
    setPlaceholder(
      PROMPT_PLACEHOLDERS[Math.floor(Math.random() * PROMPT_PLACEHOLDERS.length)],
    )
    setLoading(false)
    setError('')
    setAssets([])
    setSelected([])
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'photos' || !immichReady || assets.length) return
    setPhotosLoading(true)
    setError('')
    searchImmichPhotos(immichUrl, immichApiKey, {
      pageSize: 40,
      takenAfter: `${yKey}T00:00:00.000Z`,
      takenBefore: `${yKey}T23:59:59.999Z`,
    })
      .then(({ items }) => {
        setAssets(items)
        setSelected(items.map((a) => a.id))
      })
      .catch((err) => setError(describeImmichError(err)))
      .finally(() => setPhotosLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  if (!open) return null

  const ready = Boolean(apiKey)

  async function generateFromPrompt() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const draft = await draftNoteFromPrompt(apiKey, prompt.trim(), {
        peopleNames: allPeople.map((p) => p.name),
        tagNames: allTags.map((t) => t.name),
        customInstructions,
      })
      onGenerated({
        title: draft.title,
        content: draft.content,
        tagIds: resolveIds(draft.tags, allTags, 'name'),
        peopleIds: resolveIds(draft.people, allPeople, 'name'),
        place: await resolvePlace(draft.place),
        mood: draft.mood,
        timeStart: draft.timeStart,
        timeEnd: draft.timeEnd,
      })
      clearGeminiPromptDraft()
      onClose()
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function generateFromPhotos() {
    if (!selected.length || loading) return
    setLoading(true)
    setError('')
    try {
      const chosen = assets.filter((a) => selected.includes(a.id))
      const forGemini = chosen.slice(0, MAX_PHOTOS_TO_GEMINI)
      const images = await Promise.all(
        forGemini.map(async (a) => {
          const blob = await fetchImmichThumbnailBlob(immichUrl, immichApiKey, a.id)
          return { base64: await blobToBase64(blob), mimeType: blob.type || 'image/jpeg' }
        }),
      )
      const draft = await draftNoteFromPhotos(apiKey, images, {
        dateLabel: dayMonthLabel(yKey),
        peopleNames: allPeople.map((p) => p.name),
        tagNames: allTags.map((t) => t.name),
        customInstructions,
      })
      onGenerated({
        dateKey: yKey,
        immichAssetIds: selected,
        title: draft.title,
        content: draft.content,
        tagIds: resolveIds(draft.tags, allTags, 'name'),
        peopleIds: resolveIds(draft.people, allPeople, 'name'),
        place: await resolvePlace(draft.place),
        mood: draft.mood,
        timeStart: draft.timeStart,
        timeEnd: draft.timeEnd,
      })
      onClose()
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ncs-backdrop" onClick={onClose}>
      <div className="ncs-sheet gms-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="ncs-tape a" aria-hidden="true" />
        <span className="ncs-tape b" aria-hidden="true" />

        <div className="ncs-head">
          <div className="flex items-center gap-2">
            {mode === 'photos' && !loading && (
              <button
                type="button"
                onClick={() => setMode('prompt')}
                className="gms-chev"
                title="Indietro"
                aria-label="Indietro"
              >
                <Icon name="chevron-left" size={15} strokeWidth={2.8} />
              </button>
            )}
            <h3 className="ncs-title">
              {mode === 'photos' ? 'Nota dalle foto di ieri' : 'Nuova nota con Gemini'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="gms-chev" title="Chiudi" aria-label="Chiudi">
            <Icon name="x" size={15} strokeWidth={2.8} />
          </button>
        </div>

        <div className="gms-body">
          {!ready ? (
            <p className="gms-empty">
              Configura una chiave API Gemini in Profilo per usare questa
              funzione.
            </p>
          ) : loading ? (
            <GeminiWait label="Preparo la nota…" />
          ) : mode === 'photos' ? (
            <div className="gms-stack">
              <p className="gms-hint">
                Foto di {dayMonthLabel(yKey)}. Deseleziona quelle da escludere;
                verranno allegate alla nota e usate da Gemini per la bozza.
              </p>
              {photosLoading ? (
                <p className="gms-empty">Carico le foto…</p>
              ) : assets.length === 0 ? (
                <p className="gms-empty">Nessuna foto su Immich per {dayMonthLabel(yKey)}.</p>
              ) : (
                <>
                  <div className="gms-photo-grid">
                    {assets.map((a) => (
                      <Thumb
                        key={a.id}
                        baseUrl={immichUrl}
                        apiKey={immichApiKey}
                        asset={a}
                        selected={selected.includes(a.id)}
                        onToggle={(id) =>
                          setSelected((prev) =>
                            prev.includes(id)
                              ? prev.filter((x) => x !== id)
                              : [...prev, id],
                          )
                        }
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!selected.length}
                    onClick={generateFromPhotos}
                    className="gms-cta"
                  >
                    Genera bozza da {selected.length}{' '}
                    {selected.length === 1 ? 'foto' : 'foto'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="gms-stack">
              {immichReady && (
                <button type="button" onClick={() => setMode('photos')} className="ncs-option">
                  <span className="ncs-opt-icon paper">
                    <Icon name="image" size={17} />
                  </span>
                  <span className="ncs-opt-text">
                    <b>Genera dalle foto di ieri</b>
                    <span>Usa le foto caricate ieri su Immich come base per la bozza.</span>
                  </span>
                </button>
              )}
              <p className="gms-hint">
                Racconta cosa è successo: Gemini prova a ricavare titolo, testo,
                tag, persone e luogo. Potrai correggere tutto prima di salvare.
              </p>
              {restoredDraft && (
                <p className="gms-restored">
                  Testo ripristinato dall'ultimo tentativo (non era andato a
                  buon fine).
                </p>
              )}
              <textarea
                autoFocus
                rows={5}
                placeholder={placeholder}
                value={prompt}
                onChange={(e) => {
                  const v = e.target.value
                  setPrompt(v)
                  setRestoredDraft(false)
                  saveGeminiPromptDraft(v)
                }}
                className="gms-field"
              />
              <button
                type="button"
                disabled={!prompt.trim()}
                onClick={generateFromPrompt}
                className="gms-cta"
              >
                Genera nota
              </button>
            </div>
          )}

          {error && <p className="gms-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
