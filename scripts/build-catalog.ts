/**
 * Script to generate catalog.json from built-in packs and community.json from community packs.
 * Run: npx tsx scripts/build-catalog.ts
 */
import { ALL_PACKS } from '../src/packs/index.js'
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Built-in packs catalog ---
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

// --- Community packs catalog ---
const communityDir = resolve(__dirname, '../community-packs')
const communityFiles = readdirSync(communityDir).filter((f) => f.endsWith('.json'))

interface CommunityPackJson {
  id: string
  name: string
  icon: string
  description: string
  color: string
  author: string
  category?: string
  tags?: string[]
  shortcuts: Array<{
    key: string
    action: string
    label?: string
    code?: string
    [key: string]: unknown
  }>
}

const communityPacks = communityFiles.map((file) => {
  const raw = readFileSync(resolve(communityDir, file), 'utf-8')
  const pack: CommunityPackJson = JSON.parse(raw)
  return {
    id: pack.id,
    name: pack.name,
    icon: pack.icon,
    description: pack.description,
    color: pack.color,
    author: pack.author,
    category: pack.category || 'uncategorized',
    tags: pack.tags || [],
    shortcutCount: pack.shortcuts.length,
    hasJavaScript: pack.shortcuts.some((s) => s.action === 'javascript'),
    shortcuts: pack.shortcuts.map((s) => ({
      key: s.key,
      action: s.action,
      label: s.label || s.action,
    })),
    fullShortcuts: pack.shortcuts,
  }
})

const communityCatalog = {
  version: 1,
  updated: new Date().toISOString(),
  packs: communityPacks,
}

writeFileSync(resolve(outDir, 'community.json'), JSON.stringify(communityCatalog, null, 2))
console.log(`Generated community.json with ${communityPacks.length} community packs`)
