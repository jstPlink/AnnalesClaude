import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import {
  cleanupNoteText,
  writeNoteText,
  analyzePeopleInText,
  describeGeminiError,
} from '../lib/gemini'
import { plainText } from '../lib/notes'

// Dialog per le funzioni IA (Gemini) su una nota: ripulire/sintetizzare il
// testo esistente, riconoscere le persone citate tra quelle conosciute, o
// scrivere un nuovo contenuto da zero seguendo delle indicazioni.
export default function GeminiSheet({
  open,
  onClose,
  apiKey,
  content,
  onReplaceContent,
  allPeople,
  selectedPeopleIds,
  onTogglePerson,
}) {
  const [mode, setMode] = useState('menu') // menu | clean | write | people
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [instructions, setInstructions] = useState('')
  const [matches, setMatches] = useState(null) // [{ id, name, checked }] | null

  useEffect(() => {
    if (!open) return
    setMode('menu')
    setLoading(false)
    setError('')
    setPreview('')
    setInstructions('')
    setMatches(null)
  }, [open])

  if (!open) return null

  const ready = Boolean(apiKey)
  const plain = plainText(content)

  async function runClean() {
    setLoading(true)
    setError('')
    try {
      const text = await cleanupNoteText(apiKey, plain)
      setPreview(text)
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function runWrite() {
    if (!instructions.trim()) return
    setLoading(true)
    setError('')
    try {
      const text = await writeNoteText(apiKey, instructions.trim())
      setPreview(text)
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function runPeople() {
    setLoading(true)
    setError('')
    try {
      const names = await analyzePeopleInText(
        apiKey,
        plain,
        allPeople.map((p) => p.name),
      )
      const found = allPeople.filter((p) =>
        names.some((n) => n.trim().toLowerCase() === p.name.trim().toLowerCase()),
      )
      if (!found.length) {
        setError('Nessuna persona conosciuta riconosciuta nel testo.')
        setMatches([])
      } else {
        setMatches(
          found.map((p) => ({
            id: p.id,
            name: p.name,
            checked: !selectedPeopleIds.includes(p.id),
          })),
        )
      }
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  function applyPeople() {
    for (const m of matches) {
      const alreadySelected = selectedPeopleIds.includes(m.id)
      if (m.checked && !alreadySelected) onTogglePerson(m.id)
      if (!m.checked && alreadySelected) onTogglePerson(m.id)
    }
    onClose()
  }

  function applyPreview() {
    onReplaceContent(preview)
    onClose()
  }

  function goMenu() {
    setMode('menu')
    setError('')
    setPreview('')
    setMatches(null)
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
            {mode !== 'menu' && (
              <button
                type="button"
                onClick={goMenu}
                className="text-ink-soft transition hover:text-ink"
                title="Indietro"
              >
                <Icon name="chevron-left" size={18} />
              </button>
            )}
            <h3 className="text-lg font-extrabold text-ink">Gemini</h3>
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
              Configura una chiave API Gemini in Profilo per usare queste
              funzioni.
            </p>
          ) : mode === 'menu' ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMode('clean')
                  runClean()
                }}
                disabled={!plain.trim()}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3 text-left transition hover:brightness-95 disabled:opacity-40"
              >
                <Icon name="check" size={18} className="shrink-0 text-ink-soft" />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Ripulisci e sintetizza
                  </span>
                  <span className="block text-xs text-ink-soft">
                    Corregge e rende più scorrevole il testo della nota.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('people')
                  runPeople()
                }}
                disabled={!plain.trim() || !allPeople.length}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3 text-left transition hover:brightness-95 disabled:opacity-40"
              >
                <Icon name="user" size={18} className="shrink-0 text-ink-soft" />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Riconosci le persone citate
                  </span>
                  <span className="block text-xs text-ink-soft">
                    Confronta il testo con il tuo elenco persone.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode('write')}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3 text-left transition hover:brightness-95"
              >
                <Icon name="edit" size={18} className="shrink-0 text-ink-soft" />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Scrivi con l'IA
                  </span>
                  <span className="block text-xs text-ink-soft">
                    Genera un nuovo contenuto da delle indicazioni.
                  </span>
                </span>
              </button>
            </div>
          ) : mode === 'write' && !preview ? (
            <div className="space-y-3">
              <p className="text-xs text-ink-soft">
                Descrivi cosa scrivere: Gemini genererà il testo della nota.
              </p>
              <textarea
                autoFocus
                rows={4}
                placeholder="Es. una giornata di mare con amici, tono leggero…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full resize-none rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
              />
              <button
                type="button"
                disabled={!instructions.trim() || loading}
                onClick={runWrite}
                className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Scrivo…' : 'Genera'}
              </button>
            </div>
          ) : (mode === 'clean' || mode === 'write') && loading ? (
            <GeminiWait />
          ) : (mode === 'clean' || mode === 'write') && preview ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Anteprima
              </p>
              <p className="whitespace-pre-wrap rounded-xl border border-line bg-tag px-3 py-2.5 text-sm text-ink">
                {preview}
              </p>
              <button
                type="button"
                onClick={applyPreview}
                className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
              >
                Sostituisci il contenuto della nota
              </button>
            </div>
          ) : mode === 'people' && loading ? (
            <GeminiWait label="Analizzo il testo…" />
          ) : mode === 'people' && matches?.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-ink-soft">
                Persone riconosciute nel testo: scegli quelle da aggiungere
                alla nota.
              </p>
              <div className="space-y-1.5">
                {matches.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-tag px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={m.checked}
                      onChange={(e) =>
                        setMatches((prev) =>
                          prev.map((x) =>
                            x.id === m.id ? { ...x, checked: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    <span className="text-sm font-semibold text-ink">{m.name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={applyPeople}
                className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
              >
                Applica
              </button>
            </div>
          ) : null}

          {error && <p className="mt-3 text-xs text-delete-dark">{error}</p>}
        </div>
      </div>
    </div>
  )
}
