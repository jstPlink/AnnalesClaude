import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import PersonAvatar from '../components/PersonAvatar'
import ImmichPeoplePicker from '../components/ImmichPeoplePicker'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'
import { testImmichConnection, describeImmichError } from '../lib/immich'
import { listPeople, createPersonFromImmich, deletePerson } from '../lib/people'
import { haptic } from '../lib/haptics'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name?.trim()
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()

  const [immichUrl, setImmichUrl] = useState(user?.immichUrl || '')
  const [immichApiKey, setImmichApiKey] = useState(user?.immichApiKey || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null) // { ok, message }

  const immichReady = Boolean(user?.immichUrl && user?.immichApiKey)
  const [people, setPeople] = useState([])
  const [peopleError, setPeopleError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    setImmichUrl(user?.immichUrl || '')
    setImmichApiKey(user?.immichApiKey || '')
  }, [user])

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch((err) => setPeopleError(describeError(err)))
  }, [])

  async function addPerson(immichPerson) {
    const rec = await createPersonFromImmich(immichPerson)
    setPeople((prev) => [...prev, rec].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function removePerson(id) {
    setRemovingId(id)
    try {
      await deletePerson(id)
      setPeople((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setPeopleError(describeError(err))
    } finally {
      setRemovingId('')
    }
  }

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

  function onLogout() {
    haptic()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center px-4 pb-3">
          <CircleButton size={40} onClick={() => navigate('/')} title="Indietro">
            <Icon name="chevron-left" size={20} />
          </CircleButton>
          <h2 className="text-center text-2xl font-extrabold text-ink">Profilo</h2>
          <span />
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-6 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-sand text-3xl font-extrabold text-ink">
            {initial}
          </div>
          {name && <p className="text-xl font-bold text-ink">{name}</p>}
          <p className="text-ink-soft">{email}</p>
        </div>

        <div className="mt-10 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Account
          </p>
          <div className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink-soft">Email</span>
              <span className="max-w-[60%] truncate text-sm font-medium text-ink">
                {email}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Immich
          </p>
          <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs text-ink-soft">
              Collega il tuo server Immich per scegliere le foto da lì quando
              aggiungi immagini a una nota.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                URL server
              </span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://immich.tuodominio.it"
                value={immichUrl}
                onChange={(e) => setImmichUrl(e.target.value)}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                API key
              </span>
              <input
                type="password"
                placeholder="Da Immich → Account → API Keys"
                value={immichApiKey}
                onChange={(e) => setImmichApiKey(e.target.value)}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            {status && (
              <p
                className={
                  'text-xs ' + (status.ok ? 'text-save-dark' : 'text-delete-dark')
                }
              >
                {status.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || !immichUrl.trim() || !immichApiKey.trim()}
                className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {testing ? 'Verifico…' : 'Testa connessione'}
              </button>
              <button
                type="button"
                onClick={saveImmich}
                disabled={saving}
                className="flex-1 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {saving ? 'Salvo…' : 'Salva'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Persone
          </p>
          <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs text-ink-soft">
              Elenco delle persone selezionabili nelle note, pescate dal tuo
              Immich.
            </p>
            {peopleError && (
              <p className="text-xs text-delete-dark">{peopleError}</p>
            )}
            {people.length > 0 && (
              <div className="space-y-1">
                {people.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 rounded-xl px-1 py-1"
                  >
                    <PersonAvatar
                      person={person}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                    />
                    <span className="flex-1 text-sm font-medium text-ink">
                      {person.name}
                    </span>
                    <button
                      type="button"
                      title="Rimuovi"
                      disabled={removingId === person.id}
                      onClick={() => removePerson(person.id)}
                      className="rounded-full p-1.5 text-ink-soft transition hover:text-delete-dark disabled:opacity-50"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={!immichReady}
              onClick={() => setPickerOpen(true)}
              title={immichReady ? undefined : 'Configura prima Immich qui sopra'}
              className="w-full rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
            >
              + Aggiungi da Immich
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-auto flex items-center justify-center gap-2 rounded-full border border-delete-dark bg-delete px-6 py-3 text-base font-bold text-ink shadow-sm transition active:scale-95"
        >
          <Icon name="logout" size={18} />
          Esci
        </button>
      </main>

      {immichReady && (
        <ImmichPeoplePicker
          open={pickerOpen}
          baseUrl={immichUrl}
          apiKey={immichApiKey}
          existingIds={new Set(people.map((p) => p.immichPersonId))}
          onClose={() => setPickerOpen(false)}
          onPick={addPerson}
        />
      )}
    </PhoneShell>
  )
}
