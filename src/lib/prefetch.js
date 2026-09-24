// Precarica in locale (IndexedDB + Cache Storage) tutto ciò che serve per
// usare l'app con poca rete: note (testo e metadati), persone, tag, luoghi e
// le miniature delle immagini. Parte all'apertura (dopo il login) e a ogni
// ritorno della rete; le letture vere passano da src/lib/cache.js.

import { pb, fileUrl } from './pocketbase'
import { cacheSet, markOk, markSlow } from './cache'
import { isNetworkError } from './offlineQueue'

const THUMBS_CACHE = 'annales-thumbs'
const THUMB_SIZES = ['300x300', '400x400']
let running = false

async function prefetchThumbs(notes) {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(THUMBS_CACHE)
  const urls = []
  for (const n of notes) {
    for (const name of n.images || []) {
      for (const thumb of THUMB_SIZES) urls.push(fileUrl(n, name, { thumb }))
    }
  }
  let i = 0
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++]
      try {
        if (await cache.match(url)) continue
        const res = await fetch(url, { mode: 'cors' })
        if (res.ok) await cache.put(url, res)
      } catch {
        // miniatura non scaricabile ora: si riprova al prossimo avvio
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}

export async function prefetchAll() {
  if (running || !pb.authStore.isValid) return
  running = true
  try {
    const [notes, people, tags, places] = await Promise.all([
      pb.collection('note').getFullList({ sort: 'timeStart' }),
      pb.collection('people').getFullList({ sort: 'name' }),
      pb.collection('tags').getFullList({ sort: 'name' }),
      pb.collection('places').getFullList({ sort: 'name' }),
    ])
    await Promise.all([
      cacheSet('notes:all', notes),
      cacheSet('people', people),
      cacheSet('tags', tags),
      cacheSet('places', places),
      cacheSet('count', notes.length),
      ...notes.map((n) => cacheSet(`note:${n.id}`, n)),
    ])
    markOk()
    await prefetchThumbs(notes)
  } catch (err) {
    if (isNetworkError(err)) markSlow()
  } finally {
    running = false
  }
}
