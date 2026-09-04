// Client minimale per l'API di Immich (server di foto self-hosted).
// Riferimento: https://immich.app/docs/api

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

async function immichFetch(baseUrl, apiKey, path, options = {}) {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': apiKey,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = new Error(`Immich: ${res.status} ${res.statusText}`)
    err.status = res.status
    throw err
  }
  return res
}

// Verifica URL + API key chiamando l'endpoint dell'utente autenticato.
export async function testImmichConnection(baseUrl, apiKey) {
  const res = await immichFetch(baseUrl, apiKey, '/api/users/me')
  return res.json()
}

// Elenco foto (solo immagini, più recenti prima), paginato.
export async function searchImmichPhotos(baseUrl, apiKey, { page = 1, pageSize = 60 } = {}) {
  const res = await immichFetch(baseUrl, apiKey, '/api/search/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page,
      size: pageSize,
      type: 'IMAGE',
      order: 'desc',
      withDeleted: false,
    }),
  })
  const data = await res.json()
  return {
    items: data?.assets?.items || [],
    nextPage: data?.assets?.nextPage ? Number(data.assets.nextPage) : null,
  }
}

export async function fetchImmichThumbnailBlob(baseUrl, apiKey, assetId) {
  const res = await immichFetch(
    baseUrl,
    apiKey,
    `/api/assets/${assetId}/thumbnail?size=thumbnail`,
  )
  return res.blob()
}

// Scarica l'originale e lo confeziona come File, pronto per la stessa
// pipeline di salvataggio usata per i file scelti dal dispositivo.
export async function fetchImmichOriginalAsFile(baseUrl, apiKey, asset) {
  const res = await immichFetch(baseUrl, apiKey, `/api/assets/${asset.id}/original`)
  const blob = await res.blob()
  const name = asset.originalFileName || `${asset.id}.jpg`
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

// Elenco delle persone taggate su Immich con un nome assegnato.
export async function listImmichPeople(baseUrl, apiKey) {
  const res = await immichFetch(baseUrl, apiKey, '/api/people?withHidden=false')
  const data = await res.json()
  return (data?.people || [])
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchImmichPersonThumbnailBlob(baseUrl, apiKey, personId) {
  const res = await immichFetch(baseUrl, apiKey, `/api/people/${personId}/thumbnail`)
  return res.blob()
}

export function describeImmichError(err) {
  if (!err) return 'Errore sconosciuto.'
  if (err.status === 401 || err.status === 403) {
    return 'API key non valida o senza permessi sufficienti.'
  }
  if (err.status === 404) return 'URL Immich non valido (endpoint non trovato).'
  if (err.status) return `Errore Immich (${err.status}).`
  if (err.name === 'TypeError') {
    return 'Impossibile raggiungere il server Immich (rete/CORS). Verifica URL e che il server accetti richieste da questa app.'
  }
  return err.message || String(err)
}
