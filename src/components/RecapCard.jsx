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
    <section className={'rounded-2xl border border-line bg-tag p-4 ' + className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <Icon name="sparkles" size={13} className="shrink-0" />
          Recap {label}
        </p>
        {!loading && (
          <button
            type="button"
            onClick={run}
            className="shrink-0 rounded-full border border-line bg-cream px-3 py-1 text-xs font-bold text-ink transition active:scale-95"
          >
            {text ? 'Rigenera' : 'Genera'}
          </button>
        )}
      </div>
      {loading ? (
        <GeminiWait label="Preparo il recap…" />
      ) : text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {text}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">
          {notes.length} {notes.length === 1 ? 'nota' : 'note'}. Genera un
          riassunto con Gemini.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-delete-dark">{error}</p>}
    </section>
  )
}
