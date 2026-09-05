import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { loadLeaflet, boundsForDiameterKm } from '../lib/leaflet'

// Targhetta quadrata per il luogo salvato: barra col nome in alto, mappa
// (bloccata, sola visualizzazione) sotto, inquadrata su ~50km di diametro.
export default function PlaceCard({ place, onRemove }) {
  const mapElRef = useRef(null)

  useEffect(() => {
    if (!place?.lat || !mapElRef.current) return
    let map
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !mapElRef.current) return
      map = L.map(mapElRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)
      map.fitBounds(boundsForDiameterKm(place.lat, place.lon, 50))
      L.marker([place.lat, place.lon]).addTo(map)
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [place?.lat, place?.lon])

  if (!place) return null

  return (
    <div className="mt-4 w-40 overflow-hidden rounded-2xl border border-line">
      <div className="flex items-center gap-1.5 bg-tag px-2.5 py-1.5">
        <Icon name="map-pin" size={13} className="shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
          {place.name}
        </span>
        <button
          type="button"
          title="Rimuovi"
          onClick={onRemove}
          className="shrink-0 text-ink-soft"
        >
          <Icon name="x" size={12} />
        </button>
      </div>
      <div className="aspect-square w-full bg-panel-2">
        {place.lat != null && <div ref={mapElRef} className="h-full w-full" />}
      </div>
    </div>
  )
}
