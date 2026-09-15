import { useState } from 'react'
import Icon from './Icon'
import { getPbUrl, setPbUrl, DEFAULT_PB_URL } from '../lib/pocketbase'

// Riga "Server" da mostrare in fondo al modulo di accesso (web e mobile):
// l'indirizzo PocketBase in uso è sempre visibile in chiaro, con una
// matitina per cambiarlo sul posto — utile per chi ha più installazioni o
// si connette da reti diverse. Non richiede login: qui il client non è
// ancora autenticato, quindi basta applicare il nuovo indirizzo (vedi invece
// ProfileCard.jsx per il cambio da Impostazioni, che deve disconnettere).
export default function ServerUrlField() {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [url, setUrl] = useState(getPbUrl())

  function openEdit() {
    setDraft(url)
    setEditing(true)
  }

  function save() {
    const next = draft.trim() || DEFAULT_PB_URL
    setPbUrl(next)
    setUrl(next)
    setEditing(false)
  }

  return (
    <div className="wl-server">
      {editing ? (
        <div className="wl-server-edit">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={DEFAULT_PB_URL}
            className="wl-server-input"
          />
          <button type="button" onClick={save} className="wl-server-btn save">
            Salva
          </button>
          <button type="button" onClick={() => setEditing(false)} className="wl-server-btn">
            Annulla
          </button>
        </div>
      ) : (
        <button type="button" onClick={openEdit} className="wl-server-row" title="Cambia server">
          <span>
            Server: <b>{url}</b>
          </span>
          <Icon name="edit" size={12} />
        </button>
      )}
    </div>
  )
}
