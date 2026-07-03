/**
 * Optional utility: convert the brand SVGs in /public/logo to PNGs.
 *
 * Requires the `sharp` package (not a project dependency by default):
 *   npm i -D sharp
 *   node scripts/svg-to-png.mjs
 *
 * If `sharp` isn't installed, the script prints guidance and exits cleanly.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoDir = join(__dirname, '..', 'public', 'logo')

const targets = [
  { src: 'logo-light.svg', out: 'logo-light.png', width: 744 },
  { src: 'logo-dark.svg', out: 'logo-dark.png', width: 744 },
  { src: 'logo-icon.svg', out: 'logo-icon.png', width: 512 },
]

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.log('\n[svg-to-png] `sharp` is not installed.')
  console.log('Install it then re-run:')
  console.log('  npm i -D sharp && node scripts/svg-to-png.mjs')
  console.log('Alternatively, open public/logo/preview.html and export from the browser.\n')
  process.exit(0)
}

for (const t of targets) {
  const svg = await readFile(join(logoDir, t.src))
  const png = await sharp(svg, { density: 384 }).resize({ width: t.width }).png().toBuffer()
  await writeFile(join(logoDir, t.out), png)
  console.log(`[svg-to-png] wrote ${t.out}`)
}
console.log('[svg-to-png] done.')
