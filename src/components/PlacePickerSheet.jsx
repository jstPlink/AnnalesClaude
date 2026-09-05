import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { loadLeaflet, searchPlaces } from '../lib/leaflet'

const DEFAULT_CENTER = [41.9, 12.5] // Italia, vista d'insieme
const DEFAULT_ZOOM = 5

// Dialog per scegliere un luogo cercandolo su una mappa reale (Leaflet +
// OpenStreetMap, nessuna chiave API necessaria).
export default function PlacePickerSheet({ open, onClose, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Crea la mappa una volta sola all'apertura.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapElRef.current || mapRef.current) return
        const map = L.map(mapElRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)
        mapRef.current = map
      })
      .catch((err) => setError(err.message))
    return () => {
      cancelled = true
    }
  }, [open])

  // Distrugge la mappa alla chiusura, per poterla ricreare pulita la volta dopo.
  useEffect(() => {
    if (open) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
    }
    setQuery('')
    setResults([])
    setSelected(null)
    setError('')
  }, [open])

  if (!open) return null

  async function runSearch() {
    if (!query.trim() || searching) return
    setSearching(true)
    setError('')
    try {
      const found = await searchPlaces(query.trim())
      setResults(found)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  function pickResult(place) {
    setSelected(place)
    const map = mapRef.current
    if (!map || !window.L) return
    map.setView([place.lat, place.lon], 14)
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = window.L.marker([place.lat, place.lon]).addTo(map)
  }

  function confirm() {
    if (!selected) return
    onAdd(selected.shortName)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream sm:h-[80vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">Aggiungi luogo</h3>
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
            placeholder="Cerca un luogo…"
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

        {results.length > 0 && (
          <div className="max-h-32 overflow-y-auto border-b border-line px-3 py-2">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickResult(r)}
                className={
                  'block w-full truncate rounded-xl px-3 py-2 text-left text-sm transition ' +
                  (selected?.id === r.id
                    ? 'bg-ink text-cream'
                    : 'text-ink hover:bg-tag')
                }
                title={r.name}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div ref={mapElRef} className="min-h-0 flex-1" />

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            disabled={!selected}
            onClick={confirm}
            className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
          >
            {selected ? `Aggiungi "${selected.shortName}"` : 'Cerca e scegli un luogo'}
          </button>
        </div>
      </div>
    </div>
  )
}
