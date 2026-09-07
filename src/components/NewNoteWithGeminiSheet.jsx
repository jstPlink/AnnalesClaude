import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import {
  draftNoteFromPrompt,
  draftNoteFromPhotos,
  describeGeminiError,
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [assets, setAssets] = useState([])
  const [selected, setSelected] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('prompt')
    setPrompt('')
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            {mode === 'photos' && !loading && (
              <button
                type="button"
                onClick={() => setMode('prompt')}
                className="text-ink-soft transition hover:text-ink"
                title="Indietro"
              >
                <Icon name="chevron-left" size={18} />
              </button>
            )}
            <h3 className="text-lg font-extrabold text-ink">
              {mode === 'photos' ? 'Nota dalle foto di ieri' : 'Nuova nota con Gemini'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!ready ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              Configura una chiave API Gemini in Profilo per usare questa
              funzione.
            </p>
          ) : loading ? (
            <GeminiWait label="Preparo la nota…" />
          ) : mode === 'photos' ? (
            <div className="space-y-3">
              <p className="text-xs text-ink-soft">
                Foto di {dayMonthLabel(yKey)}. Deseleziona quelle da escludere;
                verranno allegate alla nota e usate da Gemini per la bozza.
              </p>
              {photosLoading ? (
                <p className="py-6 text-center text-sm text-ink-soft">Carico le foto…</p>
              ) : assets.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-soft">
                  Nessuna foto su Immich per {dayMonthLabel(yKey)}.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-1.5">
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
                    className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
                  >
                    Genera bozza da {selected.length}{' '}
                    {selected.length === 1 ? 'foto' : 'foto'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {immichReady && (
                <button
                  type="button"
                  onClick={() => setMode('photos')}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-tag px-3 py-2.5 text-left text-sm font-semibold text-ink transition active:scale-[0.99]"
                >
                  <Icon name="image" size={16} className="shrink-0 text-ink-soft" />
                  Genera dalle foto di ieri
                  <Icon name="chevron-right" size={14} className="ml-auto text-ink-soft" />
                </button>
              )}
              <p className="text-xs text-ink-soft">
                Racconta cosa è successo: Gemini prova a ricavare titolo, testo,
                tag, persone e luogo. Potrai correggere tutto prima di salvare.
              </p>
              <textarea
                autoFocus
                rows={5}
                placeholder="Es. oggi pranzo con Elena al ristorante vicino al lago, giornata bellissima…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full resize-none rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
              />
              <button
                type="button"
                disabled={!prompt.trim()}
                onClick={generateFromPrompt}
                className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
              >
                Genera nota
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-delete-dark">{error}</p>}
        </div>
      </div>
    </div>
  )
}
