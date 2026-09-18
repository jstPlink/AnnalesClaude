import { useEffect, useState } from 'react'
import Icon from './Icon'
import GeminiWait from './GeminiWait'
import {
  cleanupNoteText,
  writeNoteText,
  describeGeminiError,
  saveGeminiCustomInstructions,
} from '../lib/gemini'
import { plainText, describeError } from '../lib/notes'

// Dialog per le funzioni IA (Gemini) su una nota: ripulire/sintetizzare il
// testo esistente, o scrivere un nuovo contenuto da zero seguendo delle
// indicazioni.
export default function GeminiSheet({
  open,
  onClose,
  apiKey,
  content,
  onReplaceContent,
  customInstructions,
}) {
  const [mode, setMode] = useState('menu') // menu | clean | write
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [instructions, setInstructions] = useState('')

  const [customText, setCustomText] = useState(customInstructions || '')
  const [savingCustom, setSavingCustom] = useState(false)
  const [customStatus, setCustomStatus] = useState(null)
  const [customOpen, setCustomOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('menu')
    setLoading(false)
    setError('')
    setPreview('')
    setInstructions('')
    setCustomText(customInstructions || '')
    setCustomStatus(null)
    setCustomOpen(false)
  }, [open, customInstructions])

  if (!open) return null

  const ready = Boolean(apiKey)
  const plain = plainText(content)

  async function saveCustomText() {
    setSavingCustom(true)
    setCustomStatus(null)
    try {
      await saveGeminiCustomInstructions(customText)
      setCustomStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setCustomStatus({ ok: false, message: describeError(err) })
    } finally {
      setSavingCustom(false)
    }
  }

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
      const text = await writeNoteText(apiKey, instructions.trim(), customText)
      setPreview(text)
    } catch (err) {
      setError(describeGeminiError(err))
    } finally {
      setLoading(false)
    }
  }

  function applyPreview() {
    onReplaceContent(preview)
    onClose()
  }

  function goMenu() {
    setMode('menu')
    setError('')
    setPreview('')
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

              <div className="gms-instructions">
                <button
                  type="button"
                  onClick={() => setCustomOpen((v) => !v)}
                  className="gms-instructions-label"
                >
                  <Icon name="edit" size={13} />
                  Istruzioni personalizzate
                  <Icon
                    name="chevron-right"
                    size={12}
                    className={'gms-instructions-chev' + (customOpen ? ' open' : '')}
                  />
                </button>
                {customOpen && (
                  <>
                    <textarea
                      rows={6}
                      placeholder='Es. "scrivi in tono ironico" oppure "non menzionare mai il lavoro a meno che non sia esplicito"'
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="gms-field"
                    />
                    {customStatus && (
                      <p
                        className={
                          'text-xs ' +
                          (customStatus.ok ? 'text-save-dark' : 'text-delete-dark')
                        }
                      >
                        {customStatus.message}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={saveCustomText}
                      disabled={savingCustom}
                      className="gms-instructions-save"
                    >
                      {savingCustom ? 'Salvo…' : 'Salva istruzioni'}
                    </button>
                  </>
                )}
              </div>
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
          ) : null}

          {error && <p className="gms-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
