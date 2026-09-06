import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { loadLeaflet, boundsForDiameterKm } from '../lib/leaflet'

// Targhetta per il luogo salvato: mappa a tutta altezza (bloccata, sola
// visualizzazione, ~4km di diametro, alta il 65% della larghezza — ridotta
// del 35% rispetto al quadrato iniziale), nome in una fascia in basso (come
// la didascalia di una foto, per lasciare più spazio alla mappa).
// `isolate` sul contenitore evita che i pannelli interni di Leaflet (z-index
// alti, 400-700) sfondino sopra ad altri dialog/sheet dell'app (z-50).
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
      map.fitBounds(boundsForDiameterKm(place.lat, place.lon, 4))
      // Segnalino ridotto del 30% rispetto alla dimensione predefinita di
      // Leaflet (25×41 → 17×29), per pesare meno su una targhetta piccola.
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [17, 28],
        iconAnchor: [8, 28],
        popupAnchor: [1, -24],
        shadowSize: [28, 28],
      })
      L.marker([place.lat, place.lon], { icon }).addTo(map)
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [place?.lat, place?.lon])

  if (!place) return null

  return (
    <div className="isolate relative aspect-[1/0.65] w-full overflow-hidden rounded-xl border border-line bg-panel-2">
      {place.lat != null && <div ref={mapElRef} className="h-full w-full" />}
      {/* z-index esplicito: i pannelli interni di Leaflet arrivano a 700 e,
          pur isolati dal resto della pagina, coprirebbero questa fascia
          (impedendo di premere "Rimuovi") se non stesse sopra di loro. */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] flex items-center gap-1.5 bg-ink/70 px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cream">
          {place.name}
        </span>
        <button
          type="button"
          title="Rimuovi"
          onClick={onRemove}
          className="shrink-0 text-cream"
        >
          <Icon name="x" size={12} />
        </button>
      </div>
    </div>
  )
}
