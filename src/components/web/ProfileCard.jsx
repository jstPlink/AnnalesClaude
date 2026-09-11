import { useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { pb, fileUrl } from '../../lib/pocketbase'
import { describeError } from '../../lib/notes'
import { fakeIdNumber, fakeSignature } from '../../lib/idCard'
import Icon from '../Icon'

const PASSWORD_DOTS = '••••••••••••'

// Riga di un campo (Nome/Email/Password) dentro la tessera: valore in sola
// lettura + matitina per aprire, sul posto, un piccolo form di modifica.
function FieldRow({ label, value, dots, editing, onEdit, children }) {
  return (
    <div className="pf-row">
      <span className="pf-flabel">{label}</span>
      {editing ? (
        children
      ) : (
        <>
          <span className={'pf-fvalue' + (dots ? ' dots' : '')}>{value}</span>
          <button
            type="button"
            className="pf-pencil"
            title={`Modifica ${label.toLowerCase()}`}
            onClick={onEdit}
          >
            <Icon name="edit" size={12} />
          </button>
        </>
      )}
    </div>
  )
}

// Tessera profilo in cima alle Impostazioni: stessa identica estetica della
// finta carta d'identità della barra laterale (src/components/web/Sidebar.jsx
// → .sb-id), solo ingrandita e con nome/email/password modificabili sul
// posto tramite le matitine, invece che come semplice link al profilo.
export default function ProfileCard() {
  const { user } = useAuth()
  const name = user?.name?.trim() || ''
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()
  const avatarUrl = user?.avatar ? fileUrl(user, user.avatar, { thumb: '160x160' }) : ''
  const joinYear = user?.created ? new Date(user.created).getFullYear() : null

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

  // Un solo campo alla volta in modifica: 'name' | 'email' | 'password' | null.
  const [editingField, setEditingField] = useState(null)
  const [fieldMsg, setFieldMsg] = useState(null) // { ok, text }

  const [nameDraft, setNameDraft] = useState(name)
  const [savingName, setSavingName] = useState(false)

  const [emailDraft, setEmailDraft] = useState(user?.email || '')
  const [savingEmail, setSavingEmail] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  function openEdit(field) {
    setEditingField(field)
    setFieldMsg(null)
    setNameDraft(name)
    setEmailDraft(user?.email || '')
    setOldPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
  }

  function closeEdit() {
    setEditingField(null)
    setOldPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
  }

  async function saveName() {
    const next = nameDraft.trim()
    if (!next || next === name || savingName) return
    setSavingName(true)
    try {
      await pb.collection('users').update(user.id, { name: next })
      setFieldMsg({ ok: true, text: 'Nome aggiornato.' })
      setEditingField(null)
    } catch (err) {
      setFieldMsg({ ok: false, text: describeError(err) })
    } finally {
      setSavingName(false)
    }
  }

  async function saveEmail() {
    const next = emailDraft.trim()
    if (!next || next === (user?.email || '') || savingEmail) return
    setSavingEmail(true)
    try {
      await pb.collection('users').update(user.id, { email: next })
      setFieldMsg({ ok: true, text: 'Email aggiornata.' })
      setEditingField(null)
    } catch (errDirect) {
      try {
        await pb.collection('users').requestEmailChange(next)
        setFieldMsg({
          ok: true,
          text: "Ti ho inviato una mail di conferma al nuovo indirizzo.",
        })
        setEditingField(null)
      } catch {
        setFieldMsg({ ok: false, text: describeError(errDirect) })
      }
    } finally {
      setSavingEmail(false)
    }
  }

  async function savePassword() {
    if (
      !oldPassword ||
      !newPassword ||
      newPassword !== newPasswordConfirm ||
      savingPassword
    )
      return
    setSavingPassword(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
      })
      setFieldMsg({ ok: true, text: 'Password aggiornata.' })
      closeEdit()
    } catch (err) {
      setFieldMsg({ ok: false, text: describeError(err) })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
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
          {joinYear && <span className="pf-since">· dal {joinYear}</span>}
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
          <FieldRow
            label="Nome"
            value={name || '—'}
            editing={editingField === 'name'}
            onEdit={() => openEdit('name')}
          >
            <div className="pf-edit">
              <input
                type="text"
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              <div className="pf-edit-actions">
                <button
                  type="button"
                  className="pf-edit-btn save"
                  disabled={savingName || !nameDraft.trim() || nameDraft.trim() === name}
                  onClick={saveName}
                >
                  {savingName ? '…' : 'Salva'}
                </button>
                <button type="button" className="pf-edit-btn" onClick={closeEdit}>
                  Annulla
                </button>
              </div>
            </div>
          </FieldRow>

          <FieldRow
            label="Email"
            value={email}
            editing={editingField === 'email'}
            onEdit={() => openEdit('email')}
          >
            <div className="pf-edit">
              <input
                type="email"
                autoFocus
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEmail()}
              />
              <div className="pf-edit-actions">
                <button
                  type="button"
                  className="pf-edit-btn save"
                  disabled={
                    savingEmail || !emailDraft.trim() || emailDraft.trim() === (user?.email || '')
                  }
                  onClick={saveEmail}
                >
                  {savingEmail ? '…' : 'Salva'}
                </button>
                <button type="button" className="pf-edit-btn" onClick={closeEdit}>
                  Annulla
                </button>
              </div>
            </div>
          </FieldRow>

          <FieldRow
            label="Password"
            value={PASSWORD_DOTS}
            dots
            editing={editingField === 'password'}
            onEdit={() => openEdit('password')}
          >
            <div className="pf-edit stack">
              <input
                type="password"
                placeholder="Password attuale"
                autoFocus
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
                onKeyDown={(e) => e.key === 'Enter' && savePassword()}
              />
              <div className="pf-edit-actions">
                <button
                  type="button"
                  className="pf-edit-btn save"
                  disabled={
                    savingPassword ||
                    !oldPassword ||
                    !newPassword ||
                    newPassword !== newPasswordConfirm
                  }
                  onClick={savePassword}
                >
                  {savingPassword ? '…' : 'Salva'}
                </button>
                <button type="button" className="pf-edit-btn" onClick={closeEdit}>
                  Annulla
                </button>
              </div>
            </div>
          </FieldRow>

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
  )
}
