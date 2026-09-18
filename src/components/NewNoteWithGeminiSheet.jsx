import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import {
  draftNoteFromPrompt,
  describeGeminiError,
  loadGeminiPromptDraft,
  saveGeminiPromptDraft,
  clearGeminiPromptDraft,
  saveGeminiCustomInstructions,
} from '../lib/gemini'
import { describeError } from '../lib/notes'
import { searchPlaces } from '../lib/leaflet'

// Dialog per creare una nota intera con Gemini da un prompt scritto. Il
// risultato apre la nota già compilata, da rivedere prima di salvare — nulla
// viene salvato da qui.

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
  allPeople,
  allTags,
  onGenerated,
}) {
  const [prompt, setPrompt] = useState('')
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [placeholder, setPlaceholder] = useState(PROMPT_PLACEHOLDERS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [instructions, setInstructions] = useState(customInstructions || '')
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [instructionsStatus, setInstructionsStatus] = useState(null)
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  useEffect(() => {
    if (!open) return
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
    setInstructions(customInstructions || '')
    setInstructionsStatus(null)
    setInstructionsOpen(false)
  }, [open, customInstructions])

  if (!open) return null

  const ready = Boolean(apiKey)

  async function saveInstructions() {
    setSavingInstructions(true)
    setInstructionsStatus(null)
    try {
      await saveGeminiCustomInstructions(instructions)
      setInstructionsStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setInstructionsStatus({ ok: false, message: describeError(err) })
    } finally {
      setSavingInstructions(false)
    }
  }

  async function generateFromPrompt() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const draft = await draftNoteFromPrompt(apiKey, prompt.trim(), {
        peopleNames: allPeople.map((p) => p.name),
        tagNames: allTags.map((t) => t.name),
        customInstructions: instructions,
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

  return (
    <div className="ncs-backdrop" onClick={onClose}>
      <div className="ncs-sheet gms-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="ncs-tape a" aria-hidden="true" />
        <span className="ncs-tape b" aria-hidden="true" />

        <div className="ncs-head">
          <div className="flex items-center gap-2">
            <h3 className="ncs-title">Nuova nota con Gemini</h3>
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
          ) : (
            <div className="gms-stack">
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

              <div className="gms-instructions">
                <button
                  type="button"
                  onClick={() => setInstructionsOpen((v) => !v)}
                  className="gms-instructions-label"
                >
                  <Icon name="edit" size={13} />
                  Istruzioni personalizzate
                  <Icon
                    name="chevron-right"
                    size={12}
                    className={'gms-instructions-chev' + (instructionsOpen ? ' open' : '')}
                  />
                </button>
                {instructionsOpen && (
                  <>
                    <textarea
                      rows={6}
                      placeholder='Es. "scrivi in tono ironico" oppure "non menzionare mai il lavoro a meno che non sia esplicito"'
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="gms-field"
                    />
                    {instructionsStatus && (
                      <p
                        className={
                          'text-xs ' +
                          (instructionsStatus.ok ? 'text-save-dark' : 'text-delete-dark')
                        }
                      >
                        {instructionsStatus.message}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={saveInstructions}
                      disabled={savingInstructions}
                      className="gms-instructions-save"
                    >
                      {savingInstructions ? 'Salvo…' : 'Salva istruzioni'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {error && <p className="gms-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
