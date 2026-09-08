import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import PersonAvatar from '../components/PersonAvatar'
import ImmichPeoplePicker from '../components/ImmichPeoplePicker'
import CollapsibleSection from '../components/CollapsibleSection'
import AppearanceControls from '../components/AppearanceControls'
import ExportButtons from '../components/ExportButtons'
import Changelog from '../components/Changelog'
import DeleteAccount from '../components/DeleteAccount'
import { useAuth } from '../context/AuthContext'
import { pb, fileUrl } from '../lib/pocketbase'
import {
  describeError,
  listNotesWithPerson,
  reassignPersonInNotes,
  peopleUsageCounts,
} from '../lib/notes'
import {
  testImmichConnection,
  listImmichPeople,
  describeImmichError,
} from '../lib/immich'
import {
  listPeople,
  createPerson,
  createPersonFromImmich,
  deletePerson,
} from '../lib/people'
import { listTags, createTag, deleteTag } from '../lib/tags'
import { getSpotifyToken, describeSpotifyError } from '../lib/spotify'
import { testGeminiKey, describeGeminiError } from '../lib/gemini'
import { downloadIntegrationDoc } from '../lib/integrationDocs'
import { haptic } from '../lib/haptics'

// Pulsante "scarica la guida" per ottenere il token di un'integrazione.
function TokenHelp({ which }) {
  return (
    <button
      type="button"
      onClick={() => downloadIntegrationDoc(which)}
      className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft underline underline-offset-2"
    >
      <Icon name="download" size={13} className="shrink-0" />
      Come ottenerlo (guida)
    </button>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name?.trim()
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()
  const avatarUrl = user?.avatar ? fileUrl(user, user.avatar, { thumb: '160x160' }) : ''

  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await pb.collection('users').update(user.id, formData)
    } catch (err) {
      setAvatarError(describeError(err))
    } finally {
      setAvatarUploading(false)
    }
  }

  const [immichUrl, setImmichUrl] = useState(user?.immichUrl || '')
  const [immichApiKey, setImmichApiKey] = useState(user?.immichApiKey || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null) // { ok, message }

  const immichReady = Boolean(user?.immichUrl && user?.immichApiKey)
  const [people, setPeople] = useState([])
  const [peopleUsage, setPeopleUsage] = useState(null)
  const [peopleError, setPeopleError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [creatingPerson, setCreatingPerson] = useState(false)
  // Persona collegata a delle note per cui si è chiesta la rimozione:
  // { person, notes }. Finché è impostato, mostra il dialog di scelta.
  const [personToDelete, setPersonToDelete] = useState(null)
  const [replacementId, setReplacementId] = useState('')
  const [cascadeBusy, setCascadeBusy] = useState(false)
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

  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || '')
  const [savingGemini, setSavingGemini] = useState(false)
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiStatus, setGeminiStatus] = useState(null)

  useEffect(() => {
    setImmichUrl(user?.immichUrl || '')
    setImmichApiKey(user?.immichApiKey || '')
    setSpotifyClientId(user?.spotifyClientId || '')
    setSpotifyClientSecret(user?.spotifyClientSecret || '')
    setGeminiApiKey(user?.geminiApiKey || '')
  }, [user])

  async function saveGemini() {
    setSavingGemini(true)
    setGeminiStatus(null)
    try {
      await pb.collection('users').update(user.id, {
        geminiApiKey: geminiApiKey.trim(),
      })
      setGeminiStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setGeminiStatus({ ok: false, message: describeError(err) })
    } finally {
      setSavingGemini(false)
    }
  }

  async function testGemini() {
    setTestingGemini(true)
    setGeminiStatus(null)
    try {
      await testGeminiKey(geminiApiKey.trim())
      setGeminiStatus({ ok: true, message: 'Connessione riuscita.' })
    } catch (err) {
      setGeminiStatus({ ok: false, message: describeGeminiError(err) })
    } finally {
      setTestingGemini(false)
    }
  }

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
    peopleUsageCounts()
      .then(setPeopleUsage)
      .catch(() => {})
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

  // Persona "locale" (solo nome), senza passare da Immich.
  async function addLocalPerson() {
    const nm = newPersonName.trim()
    if (!nm || creatingPerson) return
    setCreatingPerson(true)
    setPeopleError('')
    try {
      const rec = await createPerson(nm)
      setPeople((prev) =>
        [...prev, rec].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setNewPersonName('')
    } catch (err) {
      setPeopleError(describeError(err))
    } finally {
      setCreatingPerson(false)
    }
  }

  async function removePerson(id) {
    setRemovingId(id)
    setPeopleError('')
    try {
      const linked = await listNotesWithPerson(id)
      if (linked.length === 0) {
        await deletePerson(id)
        setPeople((prev) => prev.filter((p) => p.id !== id))
      } else {
        // Collegata a delle note: chiedi se sostituire con un'altra persona
        // o confermare la rimozione da impostazioni e da tutte le note.
        setReplacementId('')
        setPersonToDelete({ person: people.find((p) => p.id === id), notes: linked })
      }
    } catch (err) {
      setPeopleError(describeError(err))
    } finally {
      setRemovingId('')
    }
  }

  // mode: 'replace' (sostituisci con replacementId) | 'detach' (togli e basta).
  async function confirmCascade(mode) {
    if (!personToDelete || cascadeBusy) return
    const { person, notes } = personToDelete
    const toId = mode === 'replace' ? replacementId : null
    if (mode === 'replace' && !toId) return
    setCascadeBusy(true)
    setPeopleError('')
    try {
      await reassignPersonInNotes(person.id, toId, notes)
      await deletePerson(person.id)
      setPeople((prev) => prev.filter((p) => p.id !== person.id))
      setPersonToDelete(null)
    } catch (err) {
      setPeopleError(describeError(err))
    } finally {
      setCascadeBusy(false)
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

      <main className="anim-page flex flex-1 flex-col overflow-y-auto no-scrollbar px-6 py-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            title="Cambia immagine profilo"
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-sand text-3xl font-extrabold text-ink"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {initial}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-ink/70 py-1 text-cream">
              {avatarUploading ? (
                <span className="text-[10px] font-semibold">…</span>
              ) : (
                <Icon name="edit" size={12} />
              )}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarPick}
          />
          <div className="min-w-0 flex-1">
            {name && <p className="truncate text-xl font-bold text-ink">{name}</p>}
            <p className="truncate text-ink-soft">{email}</p>
            {avatarError && (
              <p className="mt-1 text-xs text-delete-dark">{avatarError}</p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <CollapsibleSection title="Aspetto" icon="settings">
            <AppearanceControls />
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Integrazioni" icon="link">
            <CollapsibleSection title="Immich" icon="image">
            <p className="text-xs text-ink-soft">
              Collega il tuo server Immich per scegliere le foto da lì quando
              aggiungi immagini a una nota.
            </p>
            <TokenHelp which="immich" />
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
            </CollapsibleSection>

            <CollapsibleSection title="Gemini (IA)" icon="sparkles">
              <p className="text-xs text-ink-soft">
                Chiave API di Google AI Studio per ripulire il testo delle note,
                riconoscere le persone citate e scrivere contenuti con l'IA.
              </p>
              <TokenHelp which="gemini" />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">
                  API key
                </span>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              {geminiStatus && (
                <p
                  className={
                    'text-xs ' +
                    (geminiStatus.ok ? 'text-save-dark' : 'text-delete-dark')
                  }
                >
                  {geminiStatus.message}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testGemini}
                  disabled={testingGemini || !geminiApiKey.trim()}
                  className="flex-1 rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
                >
                  {testingGemini ? 'Verifico…' : 'Testa connessione'}
                </button>
                <button
                  type="button"
                  onClick={saveGemini}
                  disabled={savingGemini}
                  className="flex-1 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
                >
                  {savingGemini ? 'Salvo…' : 'Salva'}
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Spotify" icon="music">
            <p className="text-xs text-ink-soft">
              Client ID/Secret di un'app Spotify (Client Credentials) per
              cercare canzoni da aggiungere alle note, senza incollare link a
              mano.
            </p>
            <TokenHelp which="spotify" />
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
          </CollapsibleSection>
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Persone" icon="user">
            <p className="text-xs text-ink-soft">
              Elenco delle persone selezionabili nelle note. Aggiungine dal tuo
              Immich o creane una nuova qui.
            </p>
            {peopleError && (
              <p className="text-xs text-delete-dark">{peopleError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nuova persona…"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLocalPerson()}
                className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-2 text-xs text-ink outline-none"
              />
              <button
                type="button"
                disabled={!newPersonName.trim() || creatingPerson}
                onClick={addLocalPerson}
                className="shrink-0 rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition disabled:opacity-50"
              >
                {creatingPerson ? '…' : 'Crea'}
              </button>
            </div>
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
                    {peopleUsage && (
                      <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                        {peopleUsage[person.id] || 0}{' '}
                        {(peopleUsage[person.id] || 0) === 1 ? 'nota' : 'note'}
                      </span>
                    )}
                    <button
                      type="button"
                      title="Rimuovi"
                      disabled={removingId === person.id}
                      onClick={() => removePerson(person.id)}
                      className="shrink-0 rounded-full border border-line p-1.5 text-ink-soft transition hover:border-delete-dark hover:text-delete-dark disabled:opacity-50"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Tag" icon="tag">
            <p className="text-xs text-ink-soft">
              Elenco dei tag selezionabili nelle note.
            </p>
            {tagsError && <p className="text-xs text-delete-dark">{tagsError}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-tag py-1 pl-2 pr-1.5 text-sm font-medium text-ink"
                  >
                    <Icon name="tag" size={12} className="shrink-0 text-ink-soft" />
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
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Import ed export" icon="download">
            <p className="text-xs text-ink-soft">
              L'importazione da immagine è disponibile solo dalla versione web.
            </p>
            <ExportButtons />
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Supporto" icon="mail">
            <p className="text-xs text-ink-soft">
              Domande, problemi o suggerimenti su Annales? Scrivimi pure.
            </p>
            <a
              href="mailto:fp.dignazio@gmail.com"
              className="flex items-center justify-between rounded-xl border border-line bg-cream px-3 py-2.5"
            >
              <span className="text-xs font-semibold text-ink-soft">Email</span>
              <span className="text-sm font-medium text-ink">
                fp.dignazio@gmail.com
              </span>
            </a>
            <a
              href="https://t.me/fplinio"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-cream px-3 py-2.5"
            >
              <span className="text-xs font-semibold text-ink-soft">Telegram</span>
              <span className="text-sm font-medium text-ink">@fplinio</span>
            </a>
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Offrimi un caffè" icon="heart">
            <p className="text-xs text-ink-soft">
              Se Annales ti è utile e vuoi sostenere lo sviluppo, presto potrai
              farlo da qui.
            </p>
            {/* Placeholder: account Buy Me a Coffee non ancora attivo. Quando
                sarà pronto, sostituire con il link reale
                (https://buymeacoffee.com/…). */}
            <div className="flex items-center justify-center rounded-xl border border-dashed border-line bg-cream px-3 py-4 text-center text-xs font-semibold text-ink-soft">
              Buy Me a Coffee · presto disponibile
            </div>
          </CollapsibleSection>
        </div>

        <div className="mt-6">
          <CollapsibleSection title="Novità" icon="list">
            <Changelog />
          </CollapsibleSection>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 flex items-center justify-center gap-2 rounded-full border border-delete-dark bg-delete px-6 py-3 text-base font-bold text-ink shadow-sm transition active:scale-95"
        >
          <Icon name="logout" size={18} />
          Esci
        </button>

        <div className="mt-6 flex justify-center">
          <DeleteAccount />
        </div>

        <p className="mt-3 text-center text-xs text-ink-soft">
          Annales · versione {__APP_VERSION__}
        </p>
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

      {personToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => !cascadeBusy && setPersonToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-ink">
              Rimuovi {personToDelete.person?.name}
            </h3>
            <p className="mt-2 text-sm text-ink-soft">
              È collegata a {personToDelete.notes.length}{' '}
              {personToDelete.notes.length === 1 ? 'nota' : 'note'}. Scegli cosa
              fare.
            </p>

            <label className="mt-4 block text-xs font-semibold text-ink-soft">
              Sostituisci con
            </label>
            <select
              value={replacementId}
              onChange={(e) => setReplacementId(e.target.value)}
              disabled={cascadeBusy}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="">— scegli una persona —</option>
              {people
                .filter((p) => p.id !== personToDelete.person?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!replacementId || cascadeBusy}
              onClick={() => confirmCascade('replace')}
              className="mt-2 w-full rounded-full border border-save-dark bg-save px-4 py-2.5 text-sm font-bold text-ink transition disabled:opacity-50"
            >
              {cascadeBusy ? 'Aggiorno…' : 'Sostituisci nelle note e rimuovi'}
            </button>

            <div className="my-3 border-t border-line-soft" />

            <button
              type="button"
              disabled={cascadeBusy}
              onClick={() => confirmCascade('detach')}
              className="w-full rounded-full border border-delete-dark bg-delete px-4 py-2.5 text-sm font-bold text-ink transition disabled:opacity-50"
            >
              {cascadeBusy
                ? 'Aggiorno…'
                : `Rimuovi da tutte le ${personToDelete.notes.length} note e cancella`}
            </button>
            <button
              type="button"
              disabled={cascadeBusy}
              onClick={() => setPersonToDelete(null)}
              className="mt-2 w-full rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold text-ink transition disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  )
}
