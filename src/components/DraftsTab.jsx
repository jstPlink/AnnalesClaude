import { useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SideTab from './SideTab'
import Icon from './Icon'
import { listDrafts, removeDraft, subscribeDrafts } from '../lib/drafts'
import { dayMonthLabel } from '../lib/dates'

function ago(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000))
  if (m < 1) return 'adesso'
  if (m < 60) return `${m} min fa`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h fa`
  const d = Math.round(h / 24)
  return d === 1 ? 'ieri' : `${d} giorni fa`
}

// Linguetta "Bozze" (bordo destro, sotto le altre di StatusPills.jsx): le note
// nuove lasciate a metà — ad esempio tornando indietro per sbaglio — da
// riprendere con un tocco o da scartare. Vedi src/lib/drafts.js.
export default function DraftsTab() {
  const drafts = useSyncExternalStore(subscribeDrafts, listDrafts)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Mentre si sta scrivendo una nuova nota la sua bozza è quella aperta: non serve elencarla.
  if (!drafts.length || pathname.startsWith('/note/new')) return null

  function resume(d) {
    navigate(`/note/new?date=${d.dateKey}`, { state: { aiDraft: d, draftId: d.id } })
  }

  function discard(d) {
    if (window.confirm('Scartare questa bozza?')) removeDraft(d.id)
  }

  return (
    <SideTab
      icon="edit"
      tone="paper"
      badge={drafts.length}
      body={
        <ul className="mx-2.5 mb-2.5 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center gap-1.5 rounded-xl border border-line bg-tag pl-2.5">
              <button type="button" onClick={() => resume(d)} className="min-w-0 flex-1 py-1.5 text-left">
                <span className="block truncate text-xs font-bold">{d.title.trim() || 'Senza titolo'}</span>
                <span className="block truncate text-[11px] text-ink-soft">
                  {dayMonthLabel(d.dateKey)} · {ago(d.savedAt)}
                  {d.imageCount ? ` · ${d.imageCount} immagini da riaggiungere` : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => discard(d)}
                title="Scarta la bozza"
                aria-label="Scarta la bozza"
                className="shrink-0 px-2 py-2"
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      }
    >
      {drafts.length === 1 ? '1 nota lasciata in sospeso' : `${drafts.length} note lasciate in sospeso`}: tocca per riprenderle.
    </SideTab>
  )
}
