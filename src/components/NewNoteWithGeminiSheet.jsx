import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import { draftNoteFromPrompt, describeGeminiError } from '../lib/gemini'
import { searchPlaces } from '../lib/leaflet'

// Dialog per creare una nota intera con Gemini a partire da un prompt: il
// risultato (titolo, contenuto, tag/persone tra quelli disponibili, luogo)
// apre la nota già compilata, da rivedere e correggere prima di salvare —
// non viene mai salvato nulla direttamente da qui.
export default function NewNoteWithGeminiSheet({
  open,
  onClose,
  apiKey,
  allPeople,
  allTags,
  onGenerated,
}) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPrompt('')
    setLoading(false)
    setError('')
  }, [open])

  if (!open) return null

  const ready = Boolean(apiKey)

  async function generate() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const draft = await draftNoteFromPrompt(apiKey, prompt.trim(), {
        peopleNames: allPeople.map((p) => p.name),
        tagNames: allTags.map((t) => t.name),
      })

      const tagIds = allTags
        .filter((t) =>
          draft.tags.some((name) => name.trim().toLowerCase() === t.name.trim().toLowerCase()),
        )
        .map((t) => t.id)
      const peopleIds = allPeople
        .filter((p) =>
          draft.people.some((name) => name.trim().toLowerCase() === p.name.trim().toLowerCase()),
        )
        .map((p) => p.id)

      let place = null
      if (draft.place) {
        try {
          const found = await searchPlaces(draft.place)
          place = found[0]
            ? { name: found[0].shortName, lat: found[0].lat, lon: found[0].lon }
            : { name: draft.place, lat: null, lon: null }
        } catch {
          place = { name: draft.place, lat: null, lon: null }
        }
      }

      onGenerated({ title: draft.title, content: draft.content, tagIds, peopleIds, place })
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
          <h3 className="text-lg font-extrabold text-ink">Nuova nota con Gemini</h3>
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
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-soft">
                Racconta cosa è successo: Gemini prova a ricavare titolo,
                testo, tag, persone e luogo. Potrai correggere tutto prima di
                salvare.
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
                onClick={generate}
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
