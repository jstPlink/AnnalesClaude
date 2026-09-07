import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'

const CONFIRM_WORD = 'ELIMINA'

async function deleteInChunks(collection, ids) {
  for (let i = 0; i < ids.length; i += 10) {
    await Promise.all(
      ids.slice(i, i + 10).map((id) => pb.collection(collection).delete(id)),
    )
  }
}

// Elimina l'account e tutti i dati collegati, con doppia conferma:
// 1) avviso irreversibile, 2) digitare la parola ELIMINA.
export default function DeleteAccount() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [step, setStep] = useState(0) // 0 chiuso · 1 avviso · 2 conferma testo
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function close() {
    if (busy) return
    setStep(0)
    setText('')
    setError('')
  }

  async function confirmDelete() {
    if (busy || text.trim().toUpperCase() !== CONFIRM_WORD) return
    setBusy(true)
    setError('')
    try {
      // Filtro esplicito sull'utente: anche se le regole per-proprietario non
      // fossero ancora attive, si cancellano SOLO i propri record.
      const own = { filter: pb.filter('user = {:uid}', { uid: user.id }), fields: 'id' }
      const [notes, people, tags] = await Promise.all([
        pb.collection('note').getFullList(own),
        pb.collection('people').getFullList(own),
        pb.collection('tags').getFullList(own),
      ])
      await deleteInChunks('note', notes.map((r) => r.id))
      await deleteInChunks('people', people.map((r) => r.id))
      await deleteInChunks('tags', tags.map((r) => r.id))
      await pb.collection('users').delete(user.id)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep(1)}
        className="text-xs font-semibold text-delete-dark underline underline-offset-2"
      >
        Elimina account
      </button>

      {step > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 1 ? (
              <>
                <h3 className="text-lg font-extrabold text-ink">
                  Eliminare l'account?
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Verranno cancellati definitivamente l'account, tutte le note,
                  le persone e i tag. L'operazione è irreversibile.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold text-ink"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-full border border-delete-dark bg-delete px-4 py-2.5 text-sm font-bold text-ink"
                  >
                    Continua
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-extrabold text-ink">
                  Ultima conferma
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Scrivi <span className="font-bold text-ink">{CONFIRM_WORD}</span>{' '}
                  per eliminare tutto in modo definitivo.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm tracking-widest text-ink outline-none"
                />
                {error && (
                  <p className="mt-2 text-xs text-delete-dark">{error}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={busy || text.trim().toUpperCase() !== CONFIRM_WORD}
                    className="flex-1 rounded-full border border-delete-dark bg-delete px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
                  >
                    {busy ? 'Elimino…' : 'Elimina definitivamente'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
