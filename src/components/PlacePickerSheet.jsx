import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { loadLeaflet, searchPlaces, reverseGeocode } from '../lib/leaflet'

const DEFAULT_CENTER = [41.9, 12.5] // Italia, vista d'insieme
const DEFAULT_ZOOM = 5

// Segnalino personalizzato (coerente con la palette dell'app) per il punto
// scelto sulla mappa: più riconoscibile del segnalino blu di default.
function customMarkerIcon(L) {
  return L.divIcon({
    className: '',
    html:
      '<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" fill="#e0655e" stroke="#3a3226" stroke-width="1.2"/>' +
      '<circle cx="12" cy="10" r="3.2" fill="#fdf7ea"/>' +
      '</svg>',
    iconSize: [30, 30],
    iconAnchor: [15, 29],
  })
}

// Dialog per scegliere un luogo su una mappa reale (Leaflet + OpenStreetMap,
// nessuna chiave API): si cerca per nome, oppure si tocca direttamente un
// punto qualsiasi sulla mappa. Il punto viene selezionato SEMPRE, anche se
// OpenStreetMap non riconosce un indirizzo lì (es. un punto in mezzo alla
// natura): in quel caso il nome va scritto a mano.
export default function PlacePickerSheet({ open, onClose, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [nameOverride, setNameOverride] = useState('')
  const [locating, setLocating] = useState(false)

  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Crea la mappa una volta sola all'apertura, con tocco per selezionare un punto.
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
        map.on('click', async (e) => {
          const { lat, lng } = e.latlng
          setLocating(true)
          setError('')
          try {
            const place = await reverseGeocode(lat, lng)
            placeMarker(map, L, place)
          } catch {
            // Punto senza indirizzo riconosciuto: lo selezioniamo comunque,
            // il nome lo scrive a mano l'utente qui sotto.
            placeMarker(map, L, {
              id: `manual-${lat}-${lng}`,
              name: '',
              shortName: '',
              lat,
              lon: lng,
            })
          } finally {
            setLocating(false)
          }
        })
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
    setNameOverride('')
    setError('')
  }, [open])

  if (!open) return null

  function placeMarker(map, L, place) {
    setSelected(place)
    setNameOverride(place.shortName || '')
    map.setView([place.lat, place.lon], Math.max(map.getZoom(), 15))
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = L.marker([place.lat, place.lon], {
      icon: customMarkerIcon(L),
    }).addTo(map)
  }

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
    const map = mapRef.current
    if (!map || !window.L) return
    placeMarker(map, window.L, place)
  }

  function confirm() {
    if (!selected || !nameOverride.trim()) return
    onAdd({ name: nameOverride.trim(), lat: selected.lat, lon: selected.lon })
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

        <p className="px-5 pt-2 text-xs text-ink-soft">
          Oppure tocca direttamente un punto sulla mappa: puoi scegliere
          qualsiasi punto, anche se non viene riconosciuto un indirizzo.
        </p>
        {error && <p className="px-5 pt-1 text-xs text-delete-dark">{error}</p>}

        {results.length > 0 && (
          <div className="max-h-32 overflow-y-auto px-3 pt-2">
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

        <div className="isolate relative mt-2 min-h-0 flex-1">
          <div ref={mapElRef} className="h-full w-full" />
          {locating && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-[1000] flex justify-center">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-cream shadow">
                Riconosco il punto…
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          {selected && (
            <input
              type="text"
              placeholder="Nome del luogo…"
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              className="mb-2 w-full rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
            />
          )}
          <button
            type="button"
            disabled={!selected || !nameOverride.trim()}
            onClick={confirm}
            className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
          >
            {selected
              ? `Aggiungi "${nameOverride.trim() || '…'}"`
              : 'Cerca o tocca un punto sulla mappa'}
          </button>
        </div>
      </div>
    </div>
  )
}
