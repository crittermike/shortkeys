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

const outDir = resolve(__dirname, '../site/public')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2))
console.log(`Generated catalog.json with ${catalog.packs.length} packs`)

// --- Community packs catalog ---
const communityDir = resolve(__dirname, '../packs/community')
const communityFiles = readdirSync(communityDir).filter((f) => f.endsWith('.json'))

interface CommunityPackJson {
  name: string
  icon: string
  description: string
  author: string
  shortcuts: Array<{
    key: string
    action: string
    label?: string
    code?: string
    [key: string]: unknown
  }>
}

// Deterministic color palette for community packs
const COLOR_PALETTE = [
  '#4361ee', '#7c3aed', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#db2777', '#6366f1', '#0284c7', '#16a34a',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const communityPacks = communityFiles.map((file) => {
  const raw = readFileSync(resolve(communityDir, file), 'utf-8')
  const pack: CommunityPackJson = JSON.parse(raw)
  const id = `community-${file.replace(/\.json$/, '')}`
  const color = COLOR_PALETTE[hashString(pack.name) % COLOR_PALETTE.length]
  return {
    id,
    name: pack.name,
    icon: pack.icon,
    description: pack.description,
    color,
    author: pack.author,
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
