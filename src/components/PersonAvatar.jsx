import { useEffect, useState } from 'react'
import { fetchImmichPersonThumbnailBlob } from '../lib/immich'

// Cache di sessione delle miniature dei volti Immich: la vista mese "Pagine"
// può mostrare la stessa persona su decine di giorni, e senza cache ognuno
// rifarebbe la richiesta. Chiave = url server + id persona; valore = Promise
// dell'object URL (creato una volta, non revocato: uno per persona, costo
// trascurabile e vive quanto la scheda).
const thumbCache = new Map()
function personThumbUrl(baseUrl, apiKey, personId) {
  const key = `${baseUrl}|${personId}`
  let entry = thumbCache.get(key)
  if (!entry) {
    entry = fetchImmichPersonThumbnailBlob(baseUrl, apiKey, personId).then((blob) =>
      URL.createObjectURL(blob),
    )
    entry.catch(() => thumbCache.delete(key)) // riprova alla prossima montata
    thumbCache.set(key, entry)
  }
  return entry
}

// Avatar di una persona dell'elenco locale: foto dal volto Immich se
// disponibile, altrimenti iniziale del nome.
export default function PersonAvatar({ person, immichUrl, immichApiKey, size = 32 }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!person?.immichPersonId || !immichUrl || !immichApiKey) return
    let alive = true
    personThumbUrl(immichUrl, immichApiKey, person.immichPersonId)
      .then((objUrl) => {
        if (alive) setUrl(objUrl)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [person?.immichPersonId, immichUrl, immichApiKey])

  const initial = (person?.name || '?').charAt(0).toUpperCase()

  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-panel-2 text-xs font-bold text-ink-soft"
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  )
}
