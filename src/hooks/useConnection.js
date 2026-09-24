import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getConnection, subscribeConnection, subscribeCacheUpdates } from '../lib/cache'

// { status: 'ok' | 'slow' | 'offline', lastSync: ms | null }
export function useConnection() {
  return useSyncExternalStore(subscribeConnection, getConnection)
}

// Richiama `reload` quando la cache viene aggiornata in background (dati
// arrivati dopo che la pagina aveva già mostrato quelli salvati).
export function useCacheRefresh(reload) {
  const ref = useRef(reload)
  useEffect(() => {
    ref.current = reload
  })
  useEffect(() => subscribeCacheUpdates(() => ref.current()), [])
}
