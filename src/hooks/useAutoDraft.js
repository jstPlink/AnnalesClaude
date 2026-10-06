import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { newDraftId, removeDraft, saveDraft } from '../lib/drafts'
import { plainText } from '../lib/notes'
import { toast } from '../lib/toast'

// Salva da sola, mentre si scrive, la bozza di una NUOVA nota (vedi
// src/lib/drafts.js). `enabled` = la nota non esiste ancora sul server.
// Salva con un piccolo ritardo mentre si digita e, soprattutto, all'uscita
// dalla pagina (tasto Indietro, cambio scheda, chiusura): è proprio il caso
// "tornato indietro per sbaglio" a cui serve. `discard()` la toglie, da
// chiamare quando la nota è stata salvata (o messa in coda offline).
export function useAutoDraft({ enabled, draftId, form, peopleIds, tagIds, imageCount }) {
  const [id] = useState(() => draftId || newDraftId())
  const discardedRef = useRef(false)
  const latestRef = useRef(null) // l'ultimo contenuto da salvare, o null se non c'è nulla

  const { title, content, mood, timeStart, timeEnd, dateKey, place, songs } = form
  const meaningful = Boolean(
    title.trim() ||
      plainText(content).trim() ||
      songs?.length ||
      place ||
      peopleIds.length ||
      tagIds.length ||
      imageCount,
  )

  const payload = useMemo(
    () => ({
      id,
      dateKey,
      title,
      content,
      mood,
      timeStart,
      timeEnd,
      place: place || null,
      songs: songs || [],
      peopleIds,
      tagIds,
      imageCount: imageCount || 0,
    }),
    [id, dateKey, title, content, mood, timeStart, timeEnd, place, songs, peopleIds, tagIds, imageCount],
  )

  useEffect(() => {
    latestRef.current = enabled && meaningful ? payload : null
  }, [enabled, meaningful, payload])

  const flush = useCallback(() => {
    if (latestRef.current && !discardedRef.current) saveDraft(latestRef.current)
  }, [])

  // salvataggio ritardato mentre si scrive
  useEffect(() => {
    if (!enabled || discardedRef.current) return
    if (!meaningful) {
      removeDraft(id) // svuotata di proposito: niente bozza vuota
      return
    }
    const t = setTimeout(flush, 600)
    return () => clearTimeout(t)
  }, [enabled, meaningful, payload, id, flush])

  // all'uscita dalla pagina o quando l'app passa in secondo piano
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      // uscita dalla pagina con una nota non salvata: resta come bozza e lo si dice
      if (latestRef.current && !discardedRef.current) {
        flush()
        toast("Nota salvata come bozza: la trovi nell'etichetta a destra dello schermo.")
      }
    }
  }, [flush])

  const discard = useCallback(() => {
    discardedRef.current = true
    removeDraft(id)
  }, [id])

  return { discard }
}
