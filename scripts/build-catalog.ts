/**
 * Script to generate the community catalog.json from built-in packs.
 * Run: npx tsx scripts/build-catalog.ts
 */
import { ALL_PACKS } from '../src/packs/index.js'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const catalog = {
  version: 1,
  updated: new Date().toISOString(),
  packs: ALL_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    icon: pack.icon,
    description: pack.description,
    color: pack.color,
    shortcutCount: pack.shortcuts.length,
    shortcuts: pack.shortcuts.map((s) => ({
      key: s.key,
      action: s.action,
      label: s.label || s.action,
    })),
    fullShortcuts: pack.shortcuts,
  })),
}

const outDir = resolve(__dirname, '../site')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2))
console.log(`Generated catalog.json with ${catalog.packs.length} packs`)
