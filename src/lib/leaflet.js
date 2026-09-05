// Caricamento pigro di Leaflet da CDN (nessuna dipendenza npm: evita di
// toccare package-lock.json / la build Docker). Usato solo dal picker luoghi.

let loadPromise = null

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => resolve(window.L)
    script.onerror = () => reject(new Error('Impossibile caricare la mappa (Leaflet).'))
    document.head.appendChild(script)
  })

  return loadPromise
}

// Ricerca luoghi via Nominatim (OpenStreetMap), nessuna API key necessaria.
export async function searchPlaces(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(query)}`,
  )
  if (!res.ok) throw new Error('Ricerca del luogo non riuscita.')
  const data = await res.json()
  return data.map((r) => ({
    id: r.place_id,
    name: r.display_name,
    shortName: r.display_name.split(',').slice(0, 2).join(',').trim(),
    lat: Number(r.lat),
    lon: Number(r.lon),
  }))
}

// Nome del punto/locale toccato sulla mappa (reverse geocoding). Se il punto
// coincide con un locale/punto di interesse mappato su OpenStreetMap,
// `name` restituisce quello; altrimenti il miglior indirizzo disponibile.
export async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
  )
  if (!res.ok) throw new Error('Impossibile riconoscere questo punto.')
  const r = await res.json()
  if (!r || r.error) throw new Error('Nessun luogo trovato in questo punto.')
  const a = r.address || {}
  const poi = a.amenity || a.shop || a.tourism || a.leisure || a.building
  const name = poi
    ? `${poi}, ${a.road || a.suburb || a.city || ''}`.replace(/,\s*$/, '')
    : r.display_name.split(',').slice(0, 2).join(',').trim()
  return {
    id: r.place_id,
    name: r.display_name,
    shortName: name,
    lat: Number(r.lat),
    lon: Number(r.lon),
  }
}

// Bounding box centrato su lat/lon con il diametro voluto (km), per
// inquadrare la mappa senza dover indovinare uno zoom fisso.
export function boundsForDiameterKm(lat, lon, km) {
  const r = km / 2
  const dLat = r / 111
  const dLon = r / (111 * Math.cos((lat * Math.PI) / 180) || 1)
  return [
    [lat - dLat, lon - dLon],
    [lat + dLat, lon + dLon],
  ]
}
