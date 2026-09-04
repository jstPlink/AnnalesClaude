import { useEffect, useState } from 'react'
import { fetchImmichPersonThumbnailBlob } from '../lib/immich'

// Avatar di una persona dell'elenco locale: foto dal volto Immich se
// disponibile, altrimenti iniziale del nome.
export default function PersonAvatar({ person, immichUrl, immichApiKey, size = 32 }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!person?.immichPersonId || !immichUrl || !immichApiKey) return
    let alive = true
    let objUrl = ''
    fetchImmichPersonThumbnailBlob(immichUrl, immichApiKey, person.immichPersonId)
      .then((blob) => {
        if (!alive) return
        objUrl = URL.createObjectURL(blob)
        setUrl(objUrl)
      })
      .catch(() => {})
    return () => {
      alive = false
      if (objUrl) URL.revokeObjectURL(objUrl)
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
