// Genera le icone PNG della PWA da scripts/icon-source.svg.
// Uso: `npm run icons` (richiede la dipendenza dev `sharp`).
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, 'icon-source.svg')
const outDir = resolve(here, '..', 'public')

const svg = await readFile(src)

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon-180x180.png', size: 180, bg: '#efe9df' },
]

for (const t of targets) {
  let img = sharp(svg).resize(t.size, t.size)
  if (t.bg) img = img.flatten({ background: t.bg })
  await img.png().toFile(resolve(outDir, t.file))
  console.log('scritto', t.file)
}

// Maskable: icona con margine di sicurezza (~10% per lato) su fondo pieno.
const maskSize = 512
const inner = Math.round(maskSize * 0.78)
const pad = Math.round((maskSize - inner) / 2)
const innerPng = await sharp(svg).resize(inner, inner).png().toBuffer()
await sharp({
  create: {
    width: maskSize,
    height: maskSize,
    channels: 4,
    background: '#efe9df',
  },
})
  .composite([{ input: innerPng, top: pad, left: pad }])
  .png()
  .toFile(resolve(outDir, 'pwa-maskable-512x512.png'))
console.log('scritto pwa-maskable-512x512.png')
