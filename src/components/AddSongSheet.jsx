import { useEffect, useState } from 'react'
import Icon from './Icon'
import {
  fetchSpotifyTrack,
  getSpotifyToken,
  searchSpotifyTracks,
  describeSpotifyError,
} from '../lib/spotify'

// Dialog per aggiungere una canzone a una nota: se Spotify è configurato in
// Profilo, cerca per titolo/artista; altrimenti incolla un link Spotify e
// titolo/copertina vengono letti automaticamente (oEmbed pubblico).
export default function AddSongSheet({ open, onClose, onAdd, spotifyClientId, spotifyClientSecret }) {
  const spotifyReady = Boolean(spotifyClientId && spotifyClientSecret)

  const [mode, setMode] = useState(spotifyReady ? 'search' : 'url')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [token, setToken] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode(spotifyReady ? 'search' : 'url')
    setQuery('')
    setResults([])
    setUrl('')
    setError('')
    setToken('')
  }, [open, spotifyReady])

  if (!open) return null

  async function runSearch() {
    if (!query.trim() || searching) return
    setSearching(true)
    setError('')
    try {
      let tok = token
      if (!tok) {
        tok = await getSpotifyToken(spotifyClientId, spotifyClientSecret)
        setToken(tok)
      }
      try {
        const tracks = await searchSpotifyTracks(tok, query.trim())
        setResults(tracks)
      } catch (err) {
        // Token scaduto o rifiutato: ne prendiamo uno nuovo e riproviamo una
        // volta sola, invece di mostrare subito un errore fuorviante.
        if (err.status === 401) {
          tok = await getSpotifyToken(spotifyClientId, spotifyClientSecret)
          setToken(tok)
          const tracks = await searchSpotifyTracks(tok, query.trim())
          setResults(tracks)
        } else {
          throw err
        }
      }
    } catch (err) {
      setError(describeSpotifyError(err))
    } finally {
      setSearching(false)
    }
  }

  function pickResult(track) {
    onAdd({ url: track.url, title: `${track.title} · ${track.artist}`, thumbnailUrl: track.thumbnailUrl })
    onClose()
  }

  async function handleAddUrl() {
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
        className="flex max-h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
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

        {mode === 'search' ? (
          <>
            <div className="flex gap-2 border-b border-line px-5 py-3">
              <input
                type="text"
                placeholder="Titolo o artista…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                className="min-w-0 flex-1 rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
              />
              <button
                type="button"
                disabled={!query.trim() || searching}
                onClick={runSearch}
                className="shrink-0 rounded-xl border border-save-dark bg-save px-3 py-2 text-sm font-bold text-ink transition disabled:opacity-50"
              >
                {searching ? '…' : 'Cerca'}
              </button>
            </div>
            {error && <p className="px-5 pt-2 text-xs text-delete-dark">{error}</p>}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {!results.length ? (
                <p className="py-6 text-center text-sm text-ink-soft">
                  Cerca un brano per titolo o artista.
                </p>
              ) : (
                <div className="space-y-1">
                  {results.map((t) => (
                    <button
                      key={t.url}
                      type="button"
                      onClick={() => pickResult(t)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-tag"
                    >
                      {t.thumbnailUrl ? (
                        <img
                          src={t.thumbnailUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-ink-soft">
                          <Icon name="music" size={18} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {t.title}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {t.artist}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMode('url')}
              className="border-t border-line px-5 py-3 text-center text-xs font-semibold text-ink-soft transition hover:text-ink"
            >
              Incolla un link Spotify invece
            </button>
          </>
        ) : (
          <div className="p-5">
            {spotifyReady && (
              <button
                type="button"
                onClick={() => setMode('search')}
                className="mb-3 text-xs font-semibold text-ink-soft transition hover:text-ink"
              >
                ← Torna alla ricerca
              </button>
            )}
            <p className="mb-3 text-xs text-ink-soft">
              Incolla il link a un brano Spotify (open.spotify.com/track/…).
            </p>
            <input
              type="url"
              placeholder="https://open.spotify.com/track/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              className="mb-2 w-full rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
            />
            {error && <p className="mb-2 text-xs text-delete-dark">{error}</p>}
            <button
              type="button"
              disabled={!url.trim() || loading}
              onClick={handleAddUrl}
              className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Cerco…' : 'Aggiungi'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
