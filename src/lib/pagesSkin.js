// Helpers condivisi dalla skin "Pagine" (vista mese: src/pages/web/MonthPages.jsx
// e vista giorno: src/pages/web/DayPages.jsx). Tutto deterministico: stessa
// nota/chiave -> sempre lo stesso risultato, così l'aspetto non "salta" tra
// un render e l'altro.

import { useEffect, useState } from 'react'

const HANDS = ['a', 'b', 'c', 'd']

// Indice che avanza da solo ogni `intervalMs`, per far scorrere più
// foto/luoghi/canzoni nello stesso piccolo spazio (i badge mobili della
// skin "Pagine": una sola "diapositiva" per foto, targhetta del luogo,
// musicassetta). Con 0 o 1 elemento non fa nulla (niente timer sprecati).
export function useCarouselIndex(length, intervalMs = 2800) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (length <= 1) return
    const id = setInterval(() => {
      setI((v) => (v + 1) % length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [length, intervalMs])
  // Modulo qui (non nell'effetto): se `length` si riduce fra un render e
  // l'altro, l'indice resta comunque dentro i limiti senza uno setState in più.
  return length > 0 ? i % length : 0
}

// Hash stabile di una stringa (mano, inclinazione, tinta... tutto ne deriva).
export function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return ((h % 1e9) + 1e9) % 1e9
}

// "Mano" stabile per una nota: stesso id -> stesso font, sempre.
export function handFor(id) {
  return HANDS[hash(id) % HANDS.length]
}

// Inclinazione stabile per chiave, in circa [-spread, +spread] gradi.
export function tilt(key, spread) {
  return ((hash(key) % 1000) / 1000) * spread * 2 - spread
}

// PRNG deterministico da un seme (per posizionare i frammenti di sfondo in
// modo stabile per ogni giorno).
export function rng(seed) {
  let x = seed % 2147483647
  if (x <= 0) x += 2147483646
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

// Tile OSM che contiene (lat, lon) allo zoom dato, più lo scostamento in px
// per centrare il punto esatto dentro il francobollo (la mappa reale del
// luogo). Un solo tile 256px: leggero e senza chiave API.
export function osmTileFor(lat, lon, z) {
  const n = 2 ** z
  const xf = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const yf =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const px = Math.round((xf - Math.floor(xf)) * 256 - 128)
  const py = Math.round((yf - Math.floor(yf)) * 256 - 128)
  return {
    url: `https://tile.openstreetmap.org/${z}/${Math.floor(xf)}/${Math.floor(yf)}.png`,
    pos: `calc(50% - ${px}px) calc(50% - ${py}px)`,
  }
}

// Fascia d'umore -> forma della linguetta/colore del cartoncino + disegnino
// di sfondo. Le soglie seguono gli stop di colore in lib/mood.js (corallo,
// giallo, verde, blu), così forma e colore vanno d'accordo.
export function moodKind(value) {
  const m = Number(value)
  if (Number.isNaN(m)) return null
  if (m < 0.3) return 'coral'
  if (m < 0.5) return 'yellow'
  if (m < 0.7) return 'green'
  return 'blue'
}

// Tinte tenui per le targhette dei nomi (sfondo / testo / bordo già abbinati),
// scelte in modo stabile dall'id della persona.
export const TAPE_TINTS = [
  { bg: '#d7dee6', ink: '#3f5262', edge: '#8397a6' },
  { bg: '#e7dbc8', ink: '#6b5940', edge: '#a58e6a' },
  { bg: '#dde3cf', ink: '#4f6139', edge: '#8a9c6a' },
  { bg: '#e5d4da', ink: '#6d4f5e', edge: '#a889a0' },
  { bg: '#e6ddc6', ink: '#6a5c3f', edge: '#a89465' },
  { bg: '#dbd7e4', ink: '#4d4762', edge: '#9089ac' },
  { bg: '#cfe0dc', ink: '#3f5f5a', edge: '#7ea6a0' },
  { bg: '#eed7cb', ink: '#7a4f3c', edge: '#c19077' },
  { bg: '#dde2ea', ink: '#4a566c', edge: '#8b98b3' },
  { bg: '#e8dbe0', ink: '#65505f', edge: '#b39cae' },
  { bg: '#d9e2cd', ink: '#556641', edge: '#93a575' },
  { bg: '#e9e0c8', ink: '#6d5f3a', edge: '#b9a874' },
]
export function tapeTint(id) {
  return TAPE_TINTS[hash(id) % TAPE_TINTS.length]
}
