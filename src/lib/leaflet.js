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
