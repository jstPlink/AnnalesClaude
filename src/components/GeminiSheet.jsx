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
    <div className="ncs-backdrop" onClick={onClose}>
      <div className="ncs-sheet gms-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="ncs-tape a" aria-hidden="true" />
        <span className="ncs-tape b" aria-hidden="true" />

        <div className="ncs-head">
          <div className="flex items-center gap-2">
            {mode !== 'menu' && (
              <button type="button" onClick={goMenu} className="gms-chev" title="Indietro" aria-label="Indietro">
                <Icon name="chevron-left" size={15} strokeWidth={2.8} />
              </button>
            )}
            <h3 className="ncs-title">Gemini</h3>
          </div>
          <button type="button" onClick={onClose} className="gms-chev" title="Chiudi" aria-label="Chiudi">
            <Icon name="x" size={15} strokeWidth={2.8} />
          </button>
        </div>

        <div className="gms-body">
          {!ready ? (
            <p className="gms-empty">
              Configura una chiave API Gemini in Profilo per usare queste
              funzioni.
            </p>
          ) : mode === 'menu' ? (
            <div className="ncs-options">
              <button
                type="button"
                onClick={() => {
                  setMode('clean')
                  runClean()
                }}
                disabled={!plain.trim()}
                className="ncs-option"
              >
                <span className="ncs-opt-icon paper">
                  <Icon name="check" size={17} />
                </span>
                <span className="ncs-opt-text">
                  <b>Ripulisci e sintetizza</b>
                  <span>Corregge e rende più scorrevole il testo della nota.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('people')
                  runPeople()
                }}
                disabled={!plain.trim() || !allPeople.length}
                className="ncs-option"
              >
                <span className="ncs-opt-icon paper">
                  <Icon name="user" size={17} />
                </span>
                <span className="ncs-opt-text">
                  <b>Riconosci le persone citate</b>
                  <span>Confronta il testo con il tuo elenco persone.</span>
                </span>
              </button>
              <button type="button" onClick={() => setMode('write')} className="ncs-option">
                <span className="ncs-opt-icon paper">
                  <Icon name="edit" size={17} />
                </span>
                <span className="ncs-opt-text">
                  <b>Scrivi con l'IA</b>
                  <span>Genera un nuovo contenuto da delle indicazioni.</span>
                </span>
              </button>
            </div>
          ) : mode === 'write' && !preview ? (
            <div className="gms-stack">
              <p className="gms-hint">
                Descrivi cosa scrivere: Gemini genererà il testo della nota.
              </p>
              <textarea
                autoFocus
                rows={4}
                placeholder="Es. una giornata di mare con amici, tono leggero…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="gms-field"
              />
              <button
                type="button"
                disabled={!instructions.trim() || loading}
                onClick={runWrite}
                className="gms-cta"
              >
                {loading ? 'Scrivo…' : 'Genera'}
              </button>
            </div>
          ) : (mode === 'clean' || mode === 'write') && loading ? (
            <GeminiWait />
          ) : (mode === 'clean' || mode === 'write') && preview ? (
            <div className="gms-stack">
              <p className="gms-label">Anteprima</p>
              <p className="gms-preview">{preview}</p>
              <button type="button" onClick={applyPreview} className="gms-cta">
                Sostituisci il contenuto della nota
              </button>
            </div>
          ) : mode === 'people' && loading ? (
            <GeminiWait label="Analizzo il testo…" />
          ) : mode === 'people' && matches?.length > 0 ? (
            <div className="gms-stack">
              <p className="gms-hint">
                Persone riconosciute nel testo: scegli quelle da aggiungere
                alla nota.
              </p>
              <div className="gms-stack" style={{ gap: 6 }}>
                {matches.map((m) => (
                  <label key={m.id} className="gms-check-row">
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
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={applyPeople} className="gms-cta">
                Applica
              </button>
            </div>
          ) : null}

          {error && <p className="gms-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
