import { useState } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'
import { createTag } from '../lib/tags'

// Dialog per selezionare i tag di una nota: tra quelli già esistenti, o
// creandone uno nuovo al volo (aggiunto subito all'elenco locale e
// selezionato).
export default function TagPickerSheet({
  open,
  tags,
  selectedIds,
  onClose,
  onToggle,
  onCreated,
}) {
  const [newTag, setNewTag] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleCreate() {
    const name = newTag.trim()
    if (!name || creating) return
    haptic()
    setCreating(true)
    setError('')
    try {
      const rec = await createTag(name)
      onCreated(rec)
      setNewTag('')
    } catch (err) {
      setError(err?.message || 'Errore nella creazione del tag.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">Tag</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-line px-5 py-3">
          <input
            type="text"
            placeholder="Nuovo tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="min-w-0 flex-1 rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
          />
          <button
            type="button"
            disabled={!newTag.trim() || creating}
            onClick={handleCreate}
            className="shrink-0 rounded-xl border border-save-dark bg-save px-3 py-2 text-sm font-bold text-ink transition disabled:opacity-50"
          >
            {creating ? '…' : 'Crea'}
          </button>
        </div>
        {error && <p className="px-5 pt-2 text-xs text-delete-dark">{error}</p>}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!tags.length ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              Nessun tag ancora. Creane uno qui sopra.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = selectedIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      haptic()
                      onToggle(tag.id)
                    }}
                    className={
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
                      (active
                        ? 'bg-ink text-cream'
                        : 'border border-line bg-tag text-ink')
                    }
                  >
                    <Icon name="tag" size={12} className={active ? 'text-cream' : 'text-ink-soft'} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  )
}
