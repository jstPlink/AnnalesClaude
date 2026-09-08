import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'

// Modifica nome e email dell'account. Il nome si aggiorna subito; per l'email,
// se l'istanza richiede la conferma via link, parte quel flusso.
export default function AccountFields() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  useEffect(() => {
    setName(user?.name || '')
    setEmail(user?.email || '')
  }, [user])

  const nameDirty = name.trim() !== (user?.name || '')
  const emailDirty =
    email.trim() && email.trim() !== (user?.email || '')

  async function saveName() {
    if (savingName || !user) return
    setSavingName(true)
    setMsg(null)
    try {
      await pb.collection('users').update(user.id, { name: name.trim() })
      setMsg({ ok: true, text: 'Nome aggiornato.' })
    } catch (err) {
      setMsg({ ok: false, text: describeError(err) })
    } finally {
      setSavingName(false)
    }
  }

  async function saveEmail() {
    const next = email.trim()
    if (savingEmail || !user || !emailDirty) return
    setSavingEmail(true)
    setMsg(null)
    try {
      await pb.collection('users').update(user.id, { email: next })
      setMsg({ ok: true, text: 'Email aggiornata.' })
    } catch (errDirect) {
      try {
        await pb.collection('users').requestEmailChange(next)
        setMsg({
          ok: true,
          text: 'Ti ho inviato una mail di conferma al nuovo indirizzo.',
        })
      } catch {
        setMsg({ ok: false, text: describeError(errDirect) })
      }
    } finally {
      setSavingEmail(false)
    }
  }

  const inputCls =
    'min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft'
  const btnCls =
    'shrink-0 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50'

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ink-soft">
          Nome
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <button
            type="button"
            disabled={!nameDirty || savingName}
            onClick={saveName}
            className={btnCls}
          >
            {savingName ? '…' : 'Salva'}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ink-soft">
          Email
        </span>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <button
            type="button"
            disabled={!emailDirty || savingEmail}
            onClick={saveEmail}
            className={btnCls}
          >
            {savingEmail ? '…' : 'Salva'}
          </button>
        </div>
      </label>

      {msg && (
        <p
          className={
            'text-xs ' + (msg.ok ? 'text-save-dark' : 'text-delete-dark')
          }
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}
