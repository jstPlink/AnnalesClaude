import { useState } from 'react'
import { exportJson, exportMarkdown } from '../lib/exportData'
import { describeError } from '../lib/notes'

// Pulsanti di export completo del diario (JSON / Markdown). Usati sia nelle
// Impostazioni mobile che web.
export default function ExportButtons() {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function run(kind, fn) {
    setBusy(kind)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run('json', exportJson)}
          className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
        >
          {busy === 'json' ? 'Esporto…' : 'Esporta JSON'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run('md', exportMarkdown)}
          className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
        >
          {busy === 'md' ? 'Esporto…' : 'Esporta Markdown'}
        </button>
      </div>
      {error && <p className="text-xs text-delete-dark">{error}</p>}
      <p className="text-xs text-ink-soft">
        JSON = copia completa con relazioni. Markdown = testo leggibile. Le
        immagini restano sul server (l'export ne elenca solo i nomi).
      </p>
    </div>
  )
}
