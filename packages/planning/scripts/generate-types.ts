/**
 * Generate constrained union types from codebase source-of-truth registries
 *
 * Reads: personality.ts, personalities.ts, presets.ts, patterns.ts,
 *        gumdrops/**\/*.md frontmatter, packages/stack/src/components/ui/index.ts
 * Writes: packages/planning/src/generated-types.ts
 *
 * Run: pnpm --filter @wiggum/planning generate-types
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../../..')
const ideDir = resolve(rootDir, 'apps/ide/src')
const stackDir = resolve(rootDir, 'packages/stack/src')
const outputFile = resolve(__dirname, '../src/generated-types.ts')

// API gumdrops without .md files yet — remove when Phase D creates them
const API_FORWARD_DECL = [
  'api-crud', 'api-auth', 'api-upload',
  'api-webhook', 'api-realtime', 'api-search',
]

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

function extractFonts(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/personality.ts'), 'utf8')
  const matches = src.matchAll(/\{\s*name:\s*'([^']+)'/g)
  return [...matches].map(m => m[1])
}

function extractMoods(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/personalities.ts'), 'utf8')
  const arrayMatch = src.match(/MOOD_NAMES:\s*MoodName\[\]\s*=\s*\[([\s\S]*?)\]/)
  if (!arrayMatch) return []
  const matches = arrayMatch[1].matchAll(/'([^']+)'/g)
  return [...matches].map(m => m[1])
}

function extractPresets(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/presets.ts'), 'utf8')
  const recordMatch = src.match(/export const PRESETS[\s\S]*?\{([\s\S]*)\}/)
  if (!recordMatch) return []
  // Match quoted keys at first indent level: '  'key-name': {'
  const matches = recordMatch[1].matchAll(/^\s{2}'([^']+)':\s*\{/gm)
  return [...matches].map(m => m[1])
}

function extractPatterns(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/patterns.ts'), 'utf8')
  const recordMatch = src.match(/export const PATTERNS[\s\S]*?\{([\s\S]*)\}/)
  if (!recordMatch) return []
  // Match bare identifier keys at first indent level: '  monochromatic: {'
  const matches = recordMatch[1].matchAll(/^\s{2}(\w+):\s*\{/gm)
  return [...matches].map(m => m[1])
}

function extractShadows(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/personality.ts'), 'utf8')
  // Extract SHADOW_PROFILES block — keys are bare identifiers before ':'
  const blockMatch = src.match(/export const SHADOW_PROFILES[^{]*\{([\s\S]*?)\n\}/)
  if (!blockMatch) return []
  const matches = blockMatch[1].matchAll(/^\s{2}(\w+):/gm)
  return [...matches].map(m => m[1])
}

function extractRadii(): string[] {
  const src = readFileSync(resolve(ideDir, 'lib/theme-generator/personality.ts'), 'utf8')
  // Extract RADIUS_STOPS block — keys are bare identifiers before ':'
  const blockMatch = src.match(/export const RADIUS_STOPS[^{]*\{([\s\S]*?)\n\}/)
  if (!blockMatch) return []
  const matches = blockMatch[1].matchAll(/^\s{2}(\w+):/gm)
  return [...matches].map(m => m[1])
}

function extractGumdrops(): string[] {
  const gumdropsDir = resolve(ideDir, 'skills/gumdrops')
  const names: string[] = []

  const domains = readdirSync(gumdropsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const domain of domains) {
    const files = readdirSync(join(gumdropsDir, domain.name))
      .filter(f => f.endsWith('.md'))
    for (const file of files) {
      const content = readFileSync(join(gumdropsDir, domain.name, file), 'utf8')
      const match = content.match(/^name:\s*(.+)$/m)
      if (match) names.push(match[1].trim())
    }
  }

  // Add API forward-declarations (no .md files yet)
  for (const api of API_FORWARD_DECL) {
    if (!names.includes(api)) names.push(api)
  }

  return names.sort()
}

function extractStackComponents(): string[] {
  const src = readFileSync(resolve(stackDir, 'components/ui/index.ts'), 'utf8')
  const matches = src.matchAll(/export \* from '\.\/([^']+)'/g)
  return [...matches].map(m => kebabToPascal(m[1])).sort()
}

// ============================================================================
// HELPERS
// ============================================================================

function kebabToPascal(s: string): string {
  return s.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('')
}

function validate(label: string, values: string[]): void {
  if (values.length === 0) {
    throw new Error(`[generate-types] ${label} extracted 0 values — source file missing or regex broken`)
  }
}

function formatUnion(
  name: string,
  values: string[],
  opts?: { escapeHatch?: boolean, comment?: string, perLine?: number }
): string {
  const perLine = opts?.perLine ?? 4
  const lines: string[] = []
  if (opts?.comment) lines.push(`/** ${opts.comment} */`)
  lines.push(`export type ${name} =`)

  for (let i = 0; i < values.length; i += perLine) {
    const chunk = values.slice(i, i + perLine)
    lines.push('  | ' + chunk.map(v => `'${v}'`).join(' | '))
  }

  if (opts?.escapeHatch) {
    lines.push('  | (string & {})')
  }

  return lines.join('\n')
}

// ============================================================================
// MAIN
// ============================================================================

async function generateTypes() {
  console.log('Generating @wiggum/planning types from codebase registries...\n')

  const fonts = extractFonts()
  const moods = extractMoods()
  const presets = extractPresets()
  const patterns = extractPatterns()
  const shadows = extractShadows()
  const radii = extractRadii()
  const gumdrops = extractGumdrops()
  const stackComponents = extractStackComponents()

  // Validate — error immediately if any extraction is empty
  console.log('Extracted:')
  validate('fonts', fonts)
  console.log(`  fonts: ${fonts.length}`)
  validate('moods', moods)
  console.log(`  moods: ${moods.length}`)
  validate('presets', presets)
  console.log(`  presets: ${presets.length}`)
  validate('patterns', patterns)
  console.log(`  patterns: ${patterns.length}`)
  validate('shadows', shadows)
  console.log(`  shadows: ${shadows.length}`)
  validate('radii', radii)
  console.log(`  radii: ${radii.length}`)
  validate('gumdrops', gumdrops)
  console.log(`  gumdrops: ${gumdrops.length}`)
  validate('stackComponents', stackComponents)
  console.log(`  stackComponents: ${stackComponents.length}`)

  // Assemble output
  const sections = [
    `/**
 * AUTO-GENERATED — DO NOT EDIT
 *
 * Generated by: pnpm --filter @wiggum/planning generate-types
 * Sources: personality.ts, personalities.ts, presets.ts, patterns.ts,
 *          gumdrops/ *.md (all domains), stack/src/components/ui/index.ts
 */`,
    '',
    formatUnion('MoodName', moods, { comment: `${moods.length} personality moods from personalities.ts` }),
    '',
    formatUnion('PresetName', presets, { comment: `${presets.length} curated presets from presets.ts` }),
    '',
    formatUnion('PatternName', patterns, { comment: `${patterns.length} geometry patterns from patterns.ts` }),
    '',
    formatUnion('FontName', fonts, { comment: `${fonts.length} curated fonts from FONT_REGISTRY` }),
    '',
    formatUnion('ShadowProfile', shadows, { comment: `${shadows.length} shadow profiles` }),
    '',
    formatUnion('RadiusStop', radii, { comment: `${radii.length} radius stops` }),
    '',
    formatUnion('GumDropName', gumdrops, {
      comment: `${gumdrops.length} gumdrops from skills/gumdrops + API forward-declarations`,
      escapeHatch: true,
      perLine: 5,
    }),
    '',
    formatUnion('StackComponent', stackComponents, {
      comment: `${stackComponents.length} components from @wiggum/stack`,
      escapeHatch: true,
      perLine: 5,
    }),
    '',
  ]

  const output = sections.join('\n')
  writeFileSync(outputFile, output)
  console.log(`\nWrote ${outputFile} (${output.length} bytes)`)
}

generateTypes().catch((err) => {
  console.error('Failed to generate types:', err)
  process.exit(1)
})
