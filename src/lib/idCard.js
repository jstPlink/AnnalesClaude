// Finta "carta d'identità" nella barra laterale web (src/components/web/
// Sidebar.jsx): un numero di tessera e una firma disegnata, entrambi
// generati in modo deterministico da nome + email — stesso utente, sempre
// lo stesso risultato (stessa idea delle "mani" casuali dei titoli nota
// nella skin "Pagine": vedi src/lib/pagesSkin.js).

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function idKey(name, email) {
  return `${(name || '').trim().toLowerCase()}|${(email || '').trim().toLowerCase()}`
}

// "N° 048.213" — sempre 6 cifre.
export function fakeIdNumber(name, email) {
  const n = (hash(idKey(name, email)) % 900000) + 100000
  return 'N° ' + String(n).replace(/(\d{3})(\d{3})/, '$1.$2')
}

// 5 varianti di firma disegnata (path SVG, viewBox 0 0 56 20), scelta
// stabile in base a nome+email dell'utente.
const SIGNATURES = [
  'M2 15c2-8 4-10 5-6s0 8 2 6 3-9 5-9 1 7 3 7 2-5 4-5 2 4 4 3 3-6 5-6 2 5 4 4 2-3 4-2',
  'M2 12c3-10 6 2 8-4s2 12 5 6 1-14 5-8 2 10 6 4 1-8 4-4 3 6 6 2 2-5 5-3',
  'M2 10l4 6-3 4 6-8 3 8 4-10 3 9 5-8 2 6 5-9 3 7',
  'M2 16c2-6 3 4 5-2s1 8 4 2 2-10 5-4 1 8 4 2 3-9 5-3 2 7 4 1 2-5 4-2',
  'M2 14c4-9 8-9 12 0s8-9 12 0 8-9 12 0M44 6v10',
]
export function fakeSignature(name, email) {
  return SIGNATURES[hash(idKey(name, email) + '~sig') % SIGNATURES.length]
}
