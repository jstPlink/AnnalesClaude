import { useState } from 'react'
import Icon from './Icon'
import { fetchSpotifyTrack } from '../lib/spotify'

// Dialog per aggiungere una canzone a una nota incollando un link Spotify:
// titolo e copertina vengono letti automaticamente (oEmbed pubblico).
export default function AddSongSheet({ open, onClose, onAdd }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleAdd() {
    if (!url.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const song = await fetchSpotifyTrack(url)
      onAdd(song)
      setUrl('')
      onClose()
    } catch (err) {
      setError(err?.message || 'Errore nel leggere il brano.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Aggiungi canzone</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          Incolla il link a un brano Spotify (open.spotify.com/track/…).
        </p>
        <input
          type="url"
          placeholder="https://open.spotify.com/track/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="mb-2 w-full rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
        />
        {error && <p className="mb-2 text-xs text-delete-dark">{error}</p>}
        <button
          type="button"
          disabled={!url.trim() || loading}
          onClick={handleAdd}
          className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Cerco…' : 'Aggiungi'}
        </button>
      </div>
    </div>
  )
}
