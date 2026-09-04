import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'
import { dayKey, fullDayLabel } from '../lib/dates'
import {
  searchImmichPhotos,
  fetchImmichThumbnailBlob,
  fetchImmichOriginalAsFile,
  describeImmichError,
} from '../lib/immich'

// Raggruppa gli asset (già ordinati dal più recente) in sezioni per giorno.
function groupByDay(items) {
  const sections = []
  let current = null
  for (const asset of items) {
    const key = dayKey(asset.localDateTime || asset.fileCreatedAt || asset.fileModifiedAt)
    if (!current || current.key !== key) {
      current = { key, label: key ? fullDayLabel(key) : 'Data sconosciuta', assets: [] }
      sections.push(current)
    }
    current.assets.push(asset)
  }
  return sections
}

function ImmichThumb({ baseUrl, apiKey, asset, selected, onToggle }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let alive = true
    let objUrl = ''
    fetchImmichThumbnailBlob(baseUrl, apiKey, asset.id)
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
  }, [baseUrl, apiKey, asset.id])

  return (
    <button
      type="button"
      onClick={() => onToggle(asset)}
      title={asset.originalFileName}
      className={
        'relative aspect-square overflow-hidden rounded-xl bg-panel-2 ' +
        (selected ? 'ring-2 ring-save' : '')
      }
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-panel-2" />
      )}
      {selected && (
        <span className="absolute right-1 top-1 rounded-full bg-save p-1 text-ink">
          <Icon name="check" size={14} />
        </span>
      )}
    </button>
  )
}

// Dialog per scegliere foto dal server Immich configurato in Profilo.
// `onConfirm(files)` riceve i File scaricati, pronti per la stessa pipeline
// di salvataggio usata per gli allegati locali.
export default function ImmichPicker({ open, baseUrl, apiKey, onClose, onConfirm }) {
  const [items, setItems] = useState([])
  const [nextPage, setNextPage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [importing, setImporting] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      loadedRef.current = false
      setItems([])
      setSelected([])
      setNextPage(null)
      setError('')
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadPage(page) {
    const setBusy = page === 1 ? setLoading : setLoadingMore
    setBusy(true)
    setError('')
    try {
      const { items: newItems, nextPage: np } = await searchImmichPhotos(baseUrl, apiKey, {
        page,
      })
      setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]))
      setNextPage(np)
    } catch (err) {
      setError(describeImmichError(err))
    } finally {
      setBusy(false)
    }
  }

  const sections = useMemo(() => groupByDay(items), [items])

  function toggle(asset) {
    haptic()
    setSelected((prev) =>
      prev.some((a) => a.id === asset.id)
        ? prev.filter((a) => a.id !== asset.id)
        : [...prev, asset],
    )
  }

  async function handleConfirm() {
    if (!selected.length || importing) return
    setImporting(true)
    setError('')
    try {
      const files = await Promise.all(
        selected.map((asset) => fetchImmichOriginalAsFile(baseUrl, apiKey, asset)),
      )
      onConfirm(files)
    } catch (err) {
      setError(describeImmichError(err))
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">Scegli da Immich</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-ink-soft">Carico foto…</p>
          ) : error && !items.length ? (
            <p className="py-10 text-center text-sm text-delete-dark">{error}</p>
          ) : !items.length ? (
            <p className="py-10 text-center text-ink-soft">Nessuna foto trovata.</p>
          ) : (
            <>
              {sections.map((section) => (
                <div key={section.key || section.label} className="mb-5 last:mb-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {section.assets.map((asset) => (
                      <ImmichThumb
                        key={asset.id}
                        baseUrl={baseUrl}
                        apiKey={apiKey}
                        asset={asset}
                        selected={selected.some((a) => a.id === asset.id)}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {nextPage != null && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadPage(nextPage)}
                  className="mt-4 w-full rounded-full border border-line bg-tag px-4 py-2 text-sm font-semibold text-ink transition disabled:opacity-50"
                >
                  {loadingMore ? 'Carico…' : 'Carica altre'}
                </button>
              )}
              {error && items.length > 0 && (
                <p className="mt-3 text-center text-sm text-delete-dark">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            disabled={!selected.length || importing}
            onClick={handleConfirm}
            className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95 disabled:opacity-50"
          >
            {importing
              ? 'Importo…'
              : selected.length
                ? `Aggiungi ${selected.length} foto`
                : 'Seleziona delle foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
