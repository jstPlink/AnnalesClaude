import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'
import { dayKey, fullDayLabel, todayKey } from '../lib/dates'
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
// di salvataggio usata per gli allegati locali. Il campo data in alto
// permette di saltare direttamente a un giorno preciso (via `takenAfter`/
// `takenBefore`), invece di scorrere/"Carica altre" tra le più recenti.
export default function ImmichPicker({ open, baseUrl, apiKey, onClose, onConfirm }) {
  const [items, setItems] = useState([])
  const [nextPage, setNextPage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [importing, setImporting] = useState(false)
  // Se una o più foto scaricate sono arrivate in versione ridotta (fallback:
  // originale non più su Immich), aspettiamo conferma esplicita invece di
  // chiudere subito, per far leggere l'avviso.
  const [pendingFallback, setPendingFallback] = useState(null)
  // Giorno scelto dal calendario per saltare direttamente lì invece di
  // scorrere/"Carica altre" tra le foto più recenti. Vuoto = nessun filtro.
  const [dateFilter, setDateFilter] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      loadedRef.current = false
      setItems([])
      setSelected([])
      setNextPage(null)
      setError('')
      setDateFilter('')
      setPendingFallback(null)
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadPage(page, { dateFilter: dayOverride = dateFilter } = {}) {
    const setBusy = page === 1 ? setLoading : setLoadingMore
    setBusy(true)
    setError('')
    try {
      const params = { page }
      if (dayOverride) {
        params.takenAfter = `${dayOverride}T00:00:00.000Z`
        params.takenBefore = `${dayOverride}T23:59:59.999Z`
      }
      const { items: newItems, nextPage: np } = await searchImmichPhotos(baseUrl, apiKey, params)
      setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]))
      setNextPage(np)
    } catch (err) {
      setError(describeImmichError(err))
    } finally {
      setBusy(false)
    }
  }

  function handleDateChange(e) {
    const value = e.target.value
    haptic()
    setDateFilter(value)
    setItems([])
    setNextPage(null)
    loadPage(1, { dateFilter: value })
  }

  function handleClearDate() {
    haptic()
    setDateFilter('')
    setItems([])
    setNextPage(null)
    loadPage(1, { dateFilter: '' })
  }

  const sections = useMemo(() => groupByDay(items), [items])

  function toggle(asset) {
    haptic()
    setPendingFallback(null)
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
      const fallbackCount = files.filter((f) => f.immichFallback).length
      if (fallbackCount > 0) {
        // Non chiudiamo subito: l'utente deve vedere l'avviso prima che il
        // dialog si chiuda (il genitore chiude alla chiamata di onConfirm).
        setPendingFallback({ files, count: fallbackCount })
      } else {
        onConfirm(files)
      }
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

        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <label
            htmlFor="immich-date-jump"
            className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-soft"
          >
            Vai al giorno
          </label>
          <input
            id="immich-date-jump"
            type="date"
            value={dateFilter}
            max={todayKey()}
            onChange={handleDateChange}
            className="rounded-xl border border-line bg-tag px-2 py-1.5 text-sm text-ink outline-none"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={handleClearDate}
              className="ml-auto shrink-0 text-xs font-semibold text-ink-soft underline"
            >
              Mostra tutte
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-ink-soft">Carico foto…</p>
          ) : error && !items.length ? (
            <p className="py-10 text-center text-sm text-delete-dark">{error}</p>
          ) : !items.length ? (
            <p className="py-10 text-center text-ink-soft">
              {dateFilter ? 'Nessuna foto in questo giorno.' : 'Nessuna foto trovata.'}
            </p>
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
          {pendingFallback ? (
            <>
              <p className="mb-3 rounded-2xl border border-warn-dark bg-warn/20 px-4 py-3 text-sm text-ink">
                {pendingFallback.count === pendingFallback.files.length
                  ? pendingFallback.count === 1
                    ? "L'originale di questa foto non è più su Immich (libreria spostata o cancellata): verrà aggiunta una versione ridotta al posto suo."
                    : `Gli originali di queste ${pendingFallback.count} foto non sono più su Immich (libreria spostata o cancellata): verranno aggiunte in versione ridotta al posto loro.`
                  : `${pendingFallback.count} di ${pendingFallback.files.length} foto non sono più disponibili come originale su Immich: per quelle verrà aggiunta una versione ridotta.`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingFallback(null)}
                  className="flex-1 rounded-full border border-line bg-tag px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(pendingFallback.files)}
                  className="flex-1 rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
                >
                  Aggiungi comunque
                </button>
              </div>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
