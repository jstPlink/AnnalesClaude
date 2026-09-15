import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { pb, fileUrl, getPbUrl, setPbUrl, DEFAULT_PB_URL } from '../../lib/pocketbase'
import { describeError } from '../../lib/notes'
import { fakeIdNumber, fakeSignature } from '../../lib/idCard'
import { MONTHS_IT } from '../../lib/dates'
import Icon from '../Icon'

const PASSWORD_DOTS = '••••••••••••'

// Tessera profilo in cima alle Impostazioni: stessa identica estetica della
// finta carta d'identità della barra laterale (src/components/web/Sidebar.jsx
// → .sb-id), solo ingrandita. Foto quadrata come nella barra laterale (non
// più allungata quanto le righe accanto); niente più matitina per riga — un
// solo pulsante sotto la tessera mette TUTTI i campi in modifica insieme.
export default function ProfileCard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.name?.trim() || ''
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()
  const avatarUrl = user?.avatar ? fileUrl(user, user.avatar, { thumb: '160x160' }) : ''
  const joinDate = user?.created
    ? (() => {
        const d = new Date(user.created)
        return `${d.getDate()} ${MONTHS_IT[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
      })()
    : null

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

  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldMsg, setFieldMsg] = useState(null) // { ok, text }

  const [nameDraft, setNameDraft] = useState(name)
  const [emailDraft, setEmailDraft] = useState(user?.email || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [serverDraft, setServerDraft] = useState(getPbUrl())

  function openEditAll() {
    setEditMode(true)
    setFieldMsg(null)
    setNameDraft(name)
    setEmailDraft(user?.email || '')
    setOldPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
    setServerDraft(getPbUrl())
  }

  function cancelEditAll() {
    setEditMode(false)
    setOldPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
  }

  // Un solo pulsante salva tutto quello che è cambiato: nome/email/password
  // (se compilata) e server — quest'ultimo per ultimo e solo se il resto è
  // andato a buon fine, perché disconnette e porta al login.
  async function saveAllChanges() {
    if (!user?.id || busy) return
    if (newPassword && newPassword !== newPasswordConfirm) {
      setFieldMsg({ ok: false, text: 'Le due password non coincidono.' })
      return
    }
    setBusy(true)
    setFieldMsg(null)
    const notes = []
    try {
      const nextName = nameDraft.trim()
      if (nextName && nextName !== name) {
        await pb.collection('users').update(user.id, { name: nextName })
        notes.push('Nome aggiornato.')
      }

      const nextEmail = emailDraft.trim()
      if (nextEmail && nextEmail !== (user?.email || '')) {
        try {
          await pb.collection('users').update(user.id, { email: nextEmail })
          notes.push('Email aggiornata.')
        } catch {
          await pb.collection('users').requestEmailChange(nextEmail)
          notes.push('Ti ho inviato una mail di conferma al nuovo indirizzo.')
        }
      }

      if (oldPassword && newPassword) {
        await pb.collection('users').update(user.id, {
          oldPassword,
          password: newPassword,
          passwordConfirm: newPasswordConfirm,
        })
        notes.push('Password aggiornata.')
      }

      const nextServer = serverDraft.trim() || DEFAULT_PB_URL
      if (nextServer !== getPbUrl()) {
        setPbUrl(nextServer)
        pb.authStore.clear()
        navigate('/login', { replace: true })
        return
      }

      setFieldMsg({ ok: true, text: notes.length ? notes.join(' ') : 'Nessuna modifica.' })
      setEditMode(false)
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (err) {
      setFieldMsg({ ok: false, text: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="pf-card">
        <span className="pf-seal" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          </svg>
        </span>

        <div className="pf-top">
          <span>
            Diarista
            {joinDate && <span className="pf-since">· dal {joinDate}</span>}
          </span>
          <span>{fakeIdNumber(name, email)}</span>
        </div>

        <div className="pf-body">
          <button
            type="button"
            className="pf-photo"
            onClick={() => avatarInputRef.current?.click()}
            title="Cambia immagine profilo"
          >
            <span className="pf-tape pf-tape-a" aria-hidden="true" />
            <span className="pf-tape pf-tape-b" aria-hidden="true" />
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initial}</span>}
            <span className="edit-badge">
              {avatarUploading ? '…' : <Icon name="edit" size={12} />}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarPick}
          />

          <div className="pf-fields">
            {editMode ? (
              <div className="pf-editall">
                <label className="pf-erow">
                  <span className="pf-flabel">Nome</span>
                  <input
                    type="text"
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                </label>
                <label className="pf-erow">
                  <span className="pf-flabel">Email</span>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                  />
                </label>
                <div className="pf-erow">
                  <span className="pf-flabel">Password (lascia vuoto per non cambiarla)</span>
                  <input
                    type="password"
                    placeholder="Password attuale"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Nuova password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Conferma nuova password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  />
                </div>
                <label className="pf-erow">
                  <span className="pf-flabel">Server</span>
                  <input
                    type="text"
                    value={serverDraft}
                    onChange={(e) => setServerDraft(e.target.value)}
                    placeholder={DEFAULT_PB_URL}
                  />
                  <p className="pf-hint">
                    Cambiandolo verrai disconnesso: dovrai accedere di nuovo
                    (anche con un altro account, se il nuovo server ne ha uno diverso).
                  </p>
                </label>
              </div>
            ) : (
              <>
                <div className="pf-row">
                  <span className="pf-flabel">Nome</span>
                  <span className="pf-fvalue">{name || '—'}</span>
                </div>
                <div className="pf-row">
                  <span className="pf-flabel">Email</span>
                  <span className="pf-fvalue">{email}</span>
                </div>
                <div className="pf-row">
                  <span className="pf-flabel">Password</span>
                  <span className="pf-fvalue dots">{PASSWORD_DOTS}</span>
                </div>
                <div className="pf-row">
                  <span className="pf-flabel">Server</span>
                  <span className="pf-fvalue">{getPbUrl()}</span>
                </div>
              </>
            )}

            {fieldMsg && (
              <p className={'pf-msg ' + (fieldMsg.ok ? 'ok' : 'err')}>{fieldMsg.text}</p>
            )}
            {avatarError && <p className="pf-msg err">{avatarError}</p>}
          </div>
        </div>

        <div className="pf-foot">
          <svg
            className="pf-sig"
            viewBox="0 0 56 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={fakeSignature(name, email)} />
          </svg>
          <span className="pf-strip" aria-hidden="true" />
        </div>
      </div>

      {editMode ? (
        <div className="pf-modify-actions">
          <button
            type="button"
            disabled={busy}
            onClick={saveAllChanges}
            className="pf-modify-btn save"
          >
            {busy ? 'Salvo…' : 'Salva modifiche'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={cancelEditAll}
            className="pf-modify-btn"
          >
            Annulla
          </button>
        </div>
      ) : (
        <button type="button" onClick={openEditAll} className="pf-modify-btn">
          <Icon name="edit" size={13} />
          Modifica dati
        </button>
      )}
    </div>
  )
}
