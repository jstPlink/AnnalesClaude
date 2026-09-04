import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { pb } from '../../lib/pocketbase'
import { describeError } from '../../lib/notes'
import { testImmichConnection, describeImmichError } from '../../lib/immich'

export default function WebProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name?.trim()
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()

  const [immichUrl, setImmichUrl] = useState(user?.immichUrl || '')
  const [immichApiKey, setImmichApiKey] = useState(user?.immichApiKey || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setImmichUrl(user?.immichUrl || '')
    setImmichApiKey(user?.immichApiKey || '')
  }, [user])

  async function saveImmich() {
    setSaving(true)
    setStatus(null)
    try {
      await pb.collection('users').update(user.id, {
        immichUrl: immichUrl.trim(),
        immichApiKey: immichApiKey.trim(),
      })
      setStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setStatus({ ok: false, message: describeError(err) })
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setStatus(null)
    try {
      await testImmichConnection(immichUrl.trim(), immichApiKey.trim())
      setStatus({ ok: true, message: 'Connessione riuscita.' })
    } catch (err) {
      setStatus({ ok: false, message: describeImmichError(err) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-serif text-4xl font-semibold tracking-tight text-ink">
        Profilo
      </h1>

      <div className="rounded-3xl border border-line bg-tag p-8">
        <div className="flex items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-cream font-serif text-3xl font-semibold text-ink">
            {initial}
          </span>
          <div className="min-w-0">
            {name && (
              <p className="font-serif text-2xl font-semibold text-ink">{name}</p>
            )}
            <p className="truncate text-ink-soft">{email}</p>
          </div>
        </div>

        <dl className="mt-8 divide-y divide-line-soft border-y border-line-soft text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-medium text-ink">{email}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Autenticazione</dt>
            <dd className="font-medium text-ink">PocketBase · users</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="mt-8 w-full rounded-full border border-delete-dark bg-delete px-6 py-3 text-sm font-bold text-ink transition hover:brightness-105"
        >
          Esci
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-line bg-tag p-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Immich</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Collega il tuo server Immich per scegliere le foto da lì quando
          aggiungi immagini a una nota.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              URL server
            </span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://immich.tuodominio.it"
              value={immichUrl}
              onChange={(e) => setImmichUrl(e.target.value)}
              className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              API key
            </span>
            <input
              type="password"
              placeholder="Da Immich → Account → API Keys"
              value={immichApiKey}
              onChange={(e) => setImmichApiKey(e.target.value)}
              className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
            />
          </label>

          {status && (
            <p
              className={
                'text-sm ' + (status.ok ? 'text-save-dark' : 'text-delete-dark')
              }
            >
              {status.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || !immichUrl.trim() || !immichApiKey.trim()}
              className="flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-tag disabled:opacity-50"
            >
              {testing ? 'Verifico…' : 'Testa connessione'}
            </button>
            <button
              type="button"
              onClick={saveImmich}
              disabled={saving}
              className="flex-1 rounded-full border border-save-dark bg-save px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? 'Salvo…' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
