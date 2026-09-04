// Recupero titolo e copertina di un brano Spotify a partire dal link,
// tramite l'endpoint pubblico oEmbed (nessuna API key/credenziale necessaria).

const TRACK_RE = /open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/

export function isSpotifyTrackUrl(url) {
  return TRACK_RE.test(String(url || ''))
}

// { url, title, thumbnailUrl }
export async function fetchSpotifyTrack(url) {
  const clean = String(url || '').trim()
  if (!TRACK_RE.test(clean)) {
    throw new Error('Non sembra un link a un brano Spotify (open.spotify.com/track/...).')
  }
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(clean)}`,
  )
  if (!res.ok) {
    throw new Error('Impossibile leggere i dati del brano da Spotify.')
  }
  const data = await res.json()
  return {
    url: clean,
    title: data.title || 'Brano Spotify',
    thumbnailUrl: data.thumbnail_url || '',
  }
}
