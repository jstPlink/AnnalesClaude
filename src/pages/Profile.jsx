import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import PersonAvatar from '../components/PersonAvatar'
import ImmichPeoplePicker from '../components/ImmichPeoplePicker'
import CollapsibleSection from '../components/CollapsibleSection'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'
import {
  testImmichConnection,
  listImmichPeople,
  describeImmichError,
} from '../lib/immich'
import { listPeople, createPersonFromImmich, deletePerson } from '../lib/people'
import { listTags, createTag, deleteTag } from '../lib/tags'
import { getSpotifyToken, describeSpotifyError } from '../lib/spotify'
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
  const [refreshing, setRefreshing] = useState(false)
  const [tags, setTags] = useState([])
  const [tagsError, setTagsError] = useState('')
  const [newTag, setNewTag] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [removingTagId, setRemovingTagId] = useState('')

  const [spotifyClientId, setSpotifyClientId] = useState(user?.spotifyClientId || '')
  const [spotifyClientSecret, setSpotifyClientSecret] = useState(
    user?.spotifyClientSecret || '',
  )
  const [savingSpotify, setSavingSpotify] = useState(false)
  const [testingSpotify, setTestingSpotify] = useState(false)
  const [spotifyStatus, setSpotifyStatus] = useState(null)

  useEffect(() => {
    setImmichUrl(user?.immichUrl || '')
    setImmichApiKey(user?.immichApiKey || '')
    setSpotifyClientId(user?.spotifyClientId || '')
    setSpotifyClientSecret(user?.spotifyClientSecret || '')
  }, [user])

  async function saveSpotify() {
    setSavingSpotify(true)
    setSpotifyStatus(null)
    try {
      await pb.collection('users').update(user.id, {
        spotifyClientId: spotifyClientId.trim(),
        spotifyClientSecret: spotifyClientSecret.trim(),
      })
      setSpotifyStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setSpotifyStatus({ ok: false, message: describeError(err) })
    } finally {
      setSavingSpotify(false)
    }
  }

  async function testSpotify() {
    setTestingSpotify(true)
    setSpotifyStatus(null)
    try {
      await getSpotifyToken(spotifyClientId.trim(), spotifyClientSecret.trim())
      setSpotifyStatus({ ok: true, message: 'Connessione riuscita.' })
    } catch (err) {
      setSpotifyStatus({ ok: false, message: describeSpotifyError(err) })
    } finally {
      setTestingSpotify(false)
    }
  }

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch((err) => setPeopleError(describeError(err)))
    listTags()
      .then(setTags)
      .catch((err) => setTagsError(describeError(err)))
  }, [])

  async function addTag() {
    const name = newTag.trim()
    if (!name || creatingTag) return
    setCreatingTag(true)
    setTagsError('')
    try {
      const rec = await createTag(name)
      setTags((prev) => [...prev, rec].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTag('')
    } catch (err) {
      setTagsError(describeError(err))
    } finally {
      setCreatingTag(false)
    }
  }

  async function removeTag(id) {
    setRemovingTagId(id)
    try {
      await deleteTag(id)
      setTags((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setTagsError(describeError(err))
    } finally {
      setRemovingTagId('')
    }
  }

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

  // Il nome è salvato come copia locale al momento dell'aggiunta: se viene
  // rinominata su Immich, qui va risincronizzata a mano.
  async function refreshNamesFromImmich() {
    setRefreshing(true)
    setPeopleError('')
    try {
      const immichPeople = await listImmichPeople(immichUrl, immichApiKey)
      const nameById = new Map(immichPeople.map((p) => [p.id, p.name]))
      const toUpdate = people.filter(
        (p) =>
          p.immichPersonId &&
          nameById.has(p.immichPersonId) &&
          nameById.get(p.immichPersonId) !== p.name,
      )
      for (const p of toUpdate) {
        await pb
          .collection('people')
          .update(p.id, { name: nameById.get(p.immichPersonId) })
      }
      if (toUpdate.length) {
        setPeople(await listPeople())
      }
    } catch (err) {
      setPeopleError(describeImmichError(err))
    } finally {
      setRefreshing(false)
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

        <div className="mt-10">
          <CollapsibleSection title="Immich">
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
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Persone">
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
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!immichReady}
                onClick={() => setPickerOpen(true)}
                title={immichReady ? undefined : 'Configura prima Immich qui sopra'}
                className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                + Aggiungi da Immich
              </button>
              {people.length > 0 && (
                <button
                  type="button"
                  disabled={!immichReady || refreshing}
                  onClick={refreshNamesFromImmich}
                  title={
                    immichReady
                      ? 'Aggiorna i nomi se sono cambiati su Immich'
                      : 'Configura prima Immich qui sopra'
                  }
                  className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
                >
                  {refreshing ? 'Aggiorno…' : 'Aggiorna nomi'}
                </button>
              )}
            </div>
          </div>
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Tag">
          <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs text-ink-soft">
              Elenco dei tag selezionabili nelle note.
            </p>
            {tagsError && <p className="text-xs text-delete-dark">{tagsError}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-tag py-1 pl-3 pr-1.5 text-sm font-medium text-ink"
                  >
                    {tag.name}
                    <button
                      type="button"
                      title="Rimuovi"
                      disabled={removingTagId === tag.id}
                      onClick={() => removeTag(tag.id)}
                      className="rounded-full p-1 text-ink-soft transition hover:text-delete-dark disabled:opacity-50"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nuovo tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-2 text-xs text-ink outline-none"
              />
              <button
                type="button"
                disabled={!newTag.trim() || creatingTag}
                onClick={addTag}
                className="shrink-0 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {creatingTag ? '…' : 'Crea'}
              </button>
            </div>
          </div>
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Spotify">
          <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs text-ink-soft">
              Client ID/Secret di un'app Spotify (Client Credentials) per
              cercare canzoni da aggiungere alle note, senza incollare link a
              mano.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Client ID
              </span>
              <input
                type="text"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Client Secret
              </span>
              <input
                type="password"
                value={spotifyClientSecret}
                onChange={(e) => setSpotifyClientSecret(e.target.value)}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
            {spotifyStatus && (
              <p
                className={
                  'text-xs ' +
                  (spotifyStatus.ok ? 'text-save-dark' : 'text-delete-dark')
                }
              >
                {spotifyStatus.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={testSpotify}
                disabled={
                  testingSpotify || !spotifyClientId.trim() || !spotifyClientSecret.trim()
                }
                className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {testingSpotify ? 'Verifico…' : 'Testa connessione'}
              </button>
              <button
                type="button"
                onClick={saveSpotify}
                disabled={savingSpotify}
                className="flex-1 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {savingSpotify ? 'Salvo…' : 'Salva'}
              </button>
            </div>
          </div>
          </CollapsibleSection>
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
