import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { saveRecapCustomInstructions } from '../lib/gemini'
import { describeError } from '../lib/notes'

// Impostazioni → Gemini → "Istruzioni per i riassunti": testo fisso aggiunto a
// TUTTI i recap (giorno, mese, anno), sia quelli scritti dal server di notte
// sia quelli generati a mano. Salvato sull'account (`recapCustomInstructions`).
export default function RecapInstructions() {
  const { user } = useAuth()
  const [text, setText] = useState(user?.recapCustomInstructions || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const rec = await saveRecapCustomInstructions(text)
      // Se il server non ha ancora la migration il campo sparisce in silenzio.
      if (rec && rec.recapCustomInstructions === undefined) {
        setStatus({
          ok: false,
          message: 'Il server non ha ancora questo campo: pubblica la nuova versione.',
        })
      } else {
        setStatus({ ok: true, message: 'Salvato.' })
      }
    } catch (err) {
      setStatus({ ok: false, message: describeError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-soft sm:text-sm">
        Aggiunte a tutti i riassunti di Gemini (giorno, mese e anno): tono da usare, cosa
        evidenziare o evitare. Valgono anche per quelli scritti dal server di notte.
      </p>
      <textarea
        rows={6}
        placeholder='Es. "scrivi in seconda persona, tono sobrio" oppure "evidenzia sempre le persone che ho visto"'
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        className="w-full resize-none rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-soft"
      />
      {status && (
        <p
          className={
            'text-xs sm:text-sm ' + (status.ok ? 'text-save-dark' : 'text-delete-dark')
          }
        >
          {status.message}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition hover:brightness-105 disabled:opacity-50 sm:text-sm"
      >
        {saving ? 'Salvo…' : 'Salva'}
      </button>
    </div>
  )
}
