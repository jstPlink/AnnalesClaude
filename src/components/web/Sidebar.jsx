import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fileUrl } from '../../lib/pocketbase'
import { todayKey } from '../../lib/dates'
import { listPeople } from '../../lib/people'
import { listTags } from '../../lib/tags'
import { fakeIdNumber, fakeSignature } from '../../lib/idCard'
import Icon from '../Icon'
import NewNoteWithGeminiSheet from '../NewNoteWithGeminiSheet'

// Barra laterale web, skin "Pagine": l'intera barra è un cartoncino
// strappato (con un secondo foglio, più scuro, che intravede da dietro),
// dentro cui i pulsanti diventano oggetti di carta — "Nuova nota"/Gemini un
// cartoncino nero pieno, i 3 link principali ritagli chiari col contorno a
// matita tratteggiato, "Cerca" una lente d'ingrandimento, "Importa"
// (provvisorio) un post-it giallo. In basso, i dati utente su una finta
// carta d'identità (numero di tessera e firma generati da nome+email).
export default function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const name = user?.name?.trim() || user?.email || 'Utente'
  const email = user?.email || ''
  const initial = name.charAt(0).toUpperCase()
  const avatarUrl = user?.avatar ? fileUrl(user, user.avatar, { thumb: '160x160' }) : ''

  const [geminiNoteOpen, setGeminiNoteOpen] = useState(false)
  const [allPeople, setAllPeople] = useState([])
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    listPeople()
      .then(setAllPeople)
      .catch(() => {})
    listTags()
      .then(setAllTags)
      .catch(() => {})
  }, [])

  return (
    <div className="sb-wrap">
      <div className="sb-under" aria-hidden="true" />
      <aside className="sb-sidebar flex w-[300px] shrink-0 flex-col">
        <div className="sb-logo">
          <img src="/favicon.svg" alt="" />
          <span className="sb-logo-name">Annales</span>
          <span className="sb-logo-v">v{__APP_VERSION__}</span>
        </div>

        <div className="sb-head-row">
          <button
            type="button"
            onClick={() => navigate(`/note/new?date=${todayKey()}`)}
            className="sb-new"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuova nota
          </button>
          <button
            type="button"
            onClick={() => setGeminiNoteOpen(true)}
            title="Nuova nota con Gemini"
            className="sb-gemini"
          >
            <Icon name="sparkles" size={18} />
          </button>
        </div>

        <NewNoteWithGeminiSheet
          open={geminiNoteOpen}
          onClose={() => setGeminiNoteOpen(false)}
          apiKey={user?.geminiApiKey?.trim()}
          customInstructions={user?.geminiCustomInstructions?.trim()}
          immichUrl={user?.immichUrl?.trim()}
          immichApiKey={user?.immichApiKey?.trim()}
          allPeople={allPeople}
          allTags={allTags}
          onGenerated={(draft) =>
            navigate(`/note/new?date=${draft.dateKey || todayKey()}`, {
              state: { aiDraft: draft },
            })
          }
        />

        <nav className="sb-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
          >
            <Icon name="calendar" size={17} />
            Calendario
          </NavLink>
          <NavLink
            to="/dati"
            className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
          >
            <Icon name="chart" size={17} />
            Andamento
          </NavLink>
          <NavLink
            to="/statistiche"
            className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
          >
            <Icon name="bar-chart" size={17} />
            Statistiche
          </NavLink>
        </nav>

        <NavLink
          to="/filtri"
          title="Cerca"
          className={({ isActive }) => 'sb-search' + (isActive ? ' active' : '')}
        >
          <span className="sb-handle" />
          <span className="sb-lens">
            <span>Cerca</span>
          </span>
        </NavLink>

        <NavLink
          to="/importa"
          title="Funzione provvisoria"
          className={({ isActive }) => 'sb-import' + (isActive ? ' active' : '')}
        >
          <Icon name="alert-triangle" size={14} />
          <b>Importa</b>
          <span className="beta">beta</span>
        </NavLink>

        <button type="button" onClick={() => navigate('/profilo')} className="sb-id" title="Profilo">
          <span className="sb-id-seal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
          </span>
          <span className="sb-id-top">
            <span className="sb-id-label">Diarista</span>
            <span className="sb-id-num">{fakeIdNumber(name, email)}</span>
          </span>
          <span className="sb-id-body">
            <span className="sb-id-photo">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initial}</span>}
            </span>
            <span className="sb-id-info">
              <span className="sb-id-name">{name}</span>
              <span className="sb-id-email">{email}</span>
            </span>
          </span>
          <span className="sb-id-foot">
            <svg
              className="sb-id-sig"
              viewBox="0 0 56 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d={fakeSignature(name, email)} />
            </svg>
            <span className="sb-id-strip" aria-hidden="true" />
          </span>
        </button>
      </aside>
    </div>
  )
}
