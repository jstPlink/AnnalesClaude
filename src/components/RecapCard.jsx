import { useEffect, useState } from 'react'
import { recapNotes, describeGeminiError } from '../lib/gemini'
import GeminiWait from './GeminiWait'
import Icon from './Icon'

// Card "Recap": riassunto in poche frasi di un insieme di note, generato con
// Gemini su richiesta. Nascosta se manca la chiave o non ci sono note.
export default function RecapCard({ label, notes, apiKey, className = '' }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Nuovo periodo / nuove note: azzera il recap precedente.
  useEffect(() => {
    setText('')
    setError('')
  }, [label, notes])

  if (!apiKey || !notes || !notes.length) return null

  async function run() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      setText(await recapNotes(apiKey, notes, { label }))
    } catch (e) {
      setError(describeGeminiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={'st-recap ' + className}>
      <div className="st-recap-head">
        <p className="st-recap-title">
          <Icon name="sparkles" size={14} className="shrink-0" />
          Recap {label}
        </p>
        {!loading && (
          <button type="button" onClick={run} className="st-recap-btn">
            {text ? 'Rigenera' : 'Genera'}
          </button>
        )}
      </div>
      {loading ? (
        <GeminiWait label="Preparo il recap…" />
      ) : text ? (
        <p className="st-recap-text">{text}</p>
      ) : (
        <p className="st-recap-empty">
          {notes.length} {notes.length === 1 ? 'nota' : 'note'}. Genera un
          riassunto con Gemini.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-delete-dark">{error}</p>}
    </section>
  )
}
