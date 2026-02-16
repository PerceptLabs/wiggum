/**
 * Layered Snapshot — Three-layer visual feedback for Ralph.
 *
 * Layer 1 (Theme): reads .ralph/tokens.json or falls back to src/index.css
 * Layer 2 (Structure): reads source files + build metadata
 * Layer 3 (Render): from iframe probe via postMessage (optional)
 *
 * Each layer is independent — failures don't block other layers.
 */

import type { JSRuntimeFS } from '../fs/types'
import type { DtcgOutput } from '../theme-generator/dtcg'
import type { BuildResult } from '../build/types'

// ============================================================================
// Types
// ============================================================================

export interface SnapshotResult {
  report: string
  layers: { theme: boolean; structure: boolean; render: boolean }
}

export interface BuildMeta {
  moduleCount?: number
  bundleSize?: number
  dependencies?: string[]
  warnings?: number
  errors?: number
  duration?: number
}

export interface IframeProbeResult {
  rendered: boolean
  sections: SectionInfo[]
  interactions: InteractionInfo[]
  layoutIssues: LayoutIssue[]
  computedTheme: Record<string, string>
}

export interface SectionInfo {
  tag: string
  id?: string
  className?: string
  rect: { x: number; y: number; width: number; height: number }
  childCount: number
}

export interface InteractionInfo {
  tag: string
  type: string
  text?: string
  hasHandler: boolean
}

export interface LayoutIssue {
  type: 'overlap' | 'overflow' | 'zero-size'
  element: string
  details: string
}

// ============================================================================
// Extract BuildMeta from esbuild metafile
// ============================================================================

export function extractBuildMeta(
  metafile?: BuildResult['metafile'],
  result?: Partial<Pick<BuildResult, 'duration' | 'warnings' | 'errors'>>
): BuildMeta | undefined {
  if (!metafile) return undefined

  const inputs = Object.entries(metafile.inputs)
  const outputs = Object.values(metafile.outputs)

  // Extract dependencies from esm.sh paths
  const deps = new Set<string>()
  for (const [inputPath] of inputs) {
    const match = inputPath.match(/^https:\/\/esm\.sh\/([^@/]+)/)
    if (match) deps.add(match[1])
  }

  return {
    moduleCount: inputs.length,
    bundleSize: outputs.reduce((sum, o) => sum + o.bytes, 0),
    dependencies: [...deps].sort(),
    warnings: result?.warnings?.length ?? 0,
    errors: result?.errors?.length ?? 0,
    duration: result?.duration,
  }
}

// ============================================================================
// Layer 1: Theme
// ============================================================================

async function snapshotTheme(fs: JSRuntimeFS, cwd: string): Promise<string> {
  // Rich path: .ralph/tokens.json
  try {
    const raw = await fs.readFile(`${cwd}/.ralph/tokens.json`, { encoding: 'utf8' }) as string
    const tokens: DtcgOutput = JSON.parse(raw)
    return formatThemeFromTokens(tokens)
  } catch { /* fall through */ }

  // Fallback: parse src/index.css
  try {
    const css = await fs.readFile(`${cwd}/src/index.css`, { encoding: 'utf8' }) as string
    return formatThemeFromCss(css)
  } catch { /* fall through */ }

  return ''
}

function formatThemeFromTokens(tokens: DtcgOutput): string {
  const lines: string[] = ['## Theme']
  const meta = tokens.$metadata

  // Source line
  const parts = [`Source: DTCG tokens.json`]
  if (meta.preset) parts.push(`preset: ${meta.preset}`)
  if (meta.mood) parts.push(`mood: ${meta.mood}`)
  lines.push(parts.join(', '))
  lines.push('')

  // S1: Role-grouped palette tables
  const roleGroups: Record<string, Array<[string, typeof tokens.color[string]]>> = {
    brand: [], surface: [], text: [], semantic: [],
  }
  for (const [name, token] of Object.entries(tokens.color)) {
    const role = token.$extensions.wiggum.role
    if (roleGroups[role]) roleGroups[role].push([name, token])
  }

  for (const [role, entries] of Object.entries(roleGroups)) {
    if (entries.length === 0) continue
    lines.push(`### ${role.charAt(0).toUpperCase() + role.slice(1)} Palette`)
    lines.push('| Token | L | C | H | Description |')
    lines.push('|-------|---|---|---|-------------|')
    for (const [name, token] of entries) {
      const [l, c, h] = token.$value.components
      lines.push(`| ${name} | ${l.toFixed(2)} | ${c.toFixed(3)} | ${h.toFixed(0)} | ${token.$description} |`)
    }
    lines.push('')
  }

  // Contrast table + S2: WCAG summary
  const contrastTokens = Object.entries(tokens.color).filter(([, t]) =>
    t.$extensions.wiggum.contrastPairs && t.$extensions.wiggum.contrastPairs.length > 0
  )
  if (contrastTokens.length > 0) {
    lines.push('### Contrast')
    lines.push('| Foreground | Background | Ratio | WCAG |')
    lines.push('|-----------|-----------|-------|------|')
    let aaa = 0, aa = 0, aaLarge = 0, fail = 0
    for (const [name, token] of contrastTokens) {
      for (const pair of token.$extensions.wiggum.contrastPairs!) {
        lines.push(`| ${name} | ${pair.against} | ${pair.ratio} | ${pair.wcag} |`)
        if (pair.wcag === 'AAA') aaa++
        else if (pair.wcag === 'AA') aa++
        else if (pair.wcag === 'AA-large') aaLarge++
        else fail++
      }
    }
    const total = aaa + aa + aaLarge + fail
    const passing = aaa + aa
    lines.push('')
    lines.push(`${passing}/${total} pairs pass AA (${aaa} AAA, ${aa} AA, ${aaLarge} AA-large, ${fail} FAIL)`)
    lines.push('')
  }

  // S5: Dark mode summary
  if (tokens.colorDark && Object.keys(tokens.colorDark).length > 0) {
    const darkCount = Object.keys(tokens.colorDark).length
    lines.push('### Dark Mode')
    lines.push(`${darkCount} dark tokens.`)

    // Top 5 tokens with largest lightness delta
    const deltas: Array<{ name: string; lightL: number; darkL: number; delta: number }> = []
    for (const [name, darkToken] of Object.entries(tokens.colorDark)) {
      const lightToken = tokens.color[name]
      if (!lightToken) continue
      const lightL = lightToken.$value.components[0]
      const darkL = darkToken.$value.components[0]
      deltas.push({ name, lightL, darkL, delta: Math.abs(lightL - darkL) })
    }
    deltas.sort((a, b) => b.delta - a.delta)
    if (deltas.length > 0) {
      lines.push('Key inversions (largest L delta):')
      for (const d of deltas.slice(0, 5)) {
        lines.push(`- ${d.name}: L ${d.lightL.toFixed(2)} → ${d.darkL.toFixed(2)} (delta ${d.delta.toFixed(2)})`)
      }
    }
    lines.push('')
  }

  // Font section (all families)
  const fontEntries = Object.entries(tokens.fontFamily)
  if (fontEntries.length > 0) {
    lines.push('### Fonts')
    for (const [key, fontToken] of fontEntries) {
      lines.push(`- **${key}**: ${fontToken.$value}`)
      if (fontToken.$extensions) {
        const ext = fontToken.$extensions.wiggum
        lines.push(`  Category: ${ext.registryCategory}, weights: ${ext.weights.join(',')}`)
      }
    }
    lines.push('')
  }

  // Visual section + S6: shadow character
  lines.push('### Visual')
  const radius = tokens.dimension['radius']
  const shadow = tokens.shadow['profile']
  if (radius) lines.push(`- Radius: ${radius.$description}`)
  if (shadow) lines.push(`- Shadow: ${shadow.$description}`)

  // S6: Shadow character from primitives
  if (tokens.shadowPrimitives && Object.keys(tokens.shadowPrimitives).length > 0) {
    const sp = tokens.shadowPrimitives
    const profile = tokens.shadow?.['profile']?.$value ?? 'unknown'
    const primParts: string[] = []
    if (sp['opacity']) primParts.push(`opacity=${sp['opacity'].$value}`)
    if (sp['blur']) primParts.push(`blur=${sp['blur'].$value}`)
    if (sp['spread']) primParts.push(`spread=${sp['spread'].$value}`)
    if (sp['offsetY']) primParts.push(`offset-y=${sp['offsetY'].$value}`)
    if (sp['offsetX']) primParts.push(`offset-x=${sp['offsetX'].$value}`)
    if (primParts.length > 0) {
      lines.push(`- Shadow character: ${profile} (${primParts.join(', ')})`)
    }
  }

  // S3: Spacing + letter-spacing
  const spacing = tokens.dimension['spacing']
  const letterSpacing = tokens.dimension['letterSpacing']
  if (spacing) lines.push(`- Spacing: ${spacing.$value}`)
  if (letterSpacing) lines.push(`- Letter spacing: ${letterSpacing.$value}`)
  lines.push('')

  // S3: Shadow scale
  if (tokens.shadowScale && Object.keys(tokens.shadowScale).length > 0) {
    lines.push('### Shadow Scale')
    lines.push('| Level | Value |')
    lines.push('|-------|-------|')
    for (const [level, token] of Object.entries(tokens.shadowScale)) {
      const truncated = token.$value.length > 60 ? token.$value.slice(0, 57) + '...' : token.$value
      lines.push(`| ${level} | ${truncated} |`)
    }
    lines.push('')
  }

  // S4: Mood personality (animation + typography tables)
  if (meta.personality) {
    const p = meta.personality
    lines.push(`### Mood: ${p.mood}`)
    lines.push(`> ${p.philosophy}`)
    lines.push('')

    if (p.typography.length > 0) {
      lines.push('**Typography**')
      lines.push('| Element | Size | Weight | Tracking |')
      lines.push('|---------|------|--------|----------|')
      for (const t of p.typography) {
        lines.push(`| ${t.element} | ${t.size} | ${t.weight} | ${t.tracking} |`)
      }
      lines.push('')
    }

    if (p.animation.length > 0) {
      lines.push('**Animation**')
      lines.push('| Type | Duration | Easing |')
      lines.push('|------|----------|--------|')
      for (const a of p.animation) {
        lines.push(`| ${a.type} | ${a.duration} | ${a.easing} |`)
      }
      lines.push('')
    }

    lines.push(`**Spacing**: base=${p.spacing.base}, section=${p.spacing.section}, card=${p.spacing.cardPadding}`)
    lines.push(`**Rhythm**: ${p.spacing.rhythm}`)
    lines.push('')
  }

  return lines.join('\n')
}

function formatThemeFromCss(css: string): string {
  const lines: string[] = ['## Theme', 'Source: src/index.css (no DTCG tokens)', '']

  // Extract oklch values from :root block
  const oklchPattern = /--([\w-]+):\s*oklch\(([^)]+)\)/g
  const tokens: Array<{ name: string; value: string }> = []
  let match
  while ((match = oklchPattern.exec(css)) !== null) {
    tokens.push({ name: match[1], value: `oklch(${match[2]})` })
  }

  if (tokens.length > 0) {
    lines.push('### Palette (raw)')
    lines.push(`${tokens.length} OKLCH variables defined`)
    // Show first 8
    for (const t of tokens.slice(0, 8)) {
      lines.push(`- --${t.name}: ${t.value}`)
    }
    if (tokens.length > 8) lines.push(`- ... and ${tokens.length - 8} more`)
  } else {
    lines.push('No OKLCH tokens found in index.css')
  }

  return lines.join('\n')
}

// ============================================================================
// Layer 2: Structure
// ============================================================================

async function snapshotStructure(
  fs: JSRuntimeFS,
  cwd: string,
  buildMeta?: BuildMeta
): Promise<string> {
  const sections: string[] = ['## Structure']

  // Read and analyze App.tsx
  try {
    const appSrc = await fs.readFile(`${cwd}/src/App.tsx`, { encoding: 'utf8' }) as string
    sections.push(analyzeComponent(appSrc))
  } catch { /* no App.tsx */ }

  // Design brief alignment
  try {
    const brief = await fs.readFile(`${cwd}/.ralph/design-brief.md`, { encoding: 'utf8' }) as string
    const moodMatch = brief.match(/^#\s+(.+)/m)
    if (moodMatch) sections.push(`### Design Brief\nMood: ${moodMatch[1]}`)
  } catch { /* no brief */ }

  // Build metadata
  if (buildMeta) {
    sections.push(formatBuildMeta(buildMeta))
  }

  return sections.length > 1 ? sections.join('\n\n') : ''
}

function analyzeComponent(source: string): string {
  const lines: string[] = ['### Components']

  // Extract imports
  const importPattern = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g
  const imports: Array<{ names: string[]; from: string }> = []
  let match
  while ((match = importPattern.exec(source)) !== null) {
    const names = match[1]
      ? match[1].split(',').map(s => s.trim()).filter(Boolean)
      : [match[2]]
    imports.push({ names, from: match[3] })
  }

  // Group by source
  const wiggumImports = imports.filter(i => i.from.includes('@wiggum/stack'))
  const reactImports = imports.filter(i => i.from === 'react')
  const localImports = imports.filter(i => i.from.startsWith('.'))

  if (wiggumImports.length > 0) {
    lines.push(`@wiggum/stack: ${wiggumImports.flatMap(i => i.names).join(', ')}`)
  }
  if (reactImports.length > 0) {
    lines.push(`react: ${reactImports.flatMap(i => i.names).join(', ')}`)
  }
  if (localImports.length > 0) {
    lines.push(`local: ${localImports.map(i => i.from).join(', ')}`)
  }

  // Extract Tailwind classes
  const classes = extractTailwindClasses(source)
  if (classes.total > 0) {
    lines.push('')
    lines.push('### Tailwind Usage')
    if (classes.layout.length > 0) lines.push(`- Layout: ${classes.layout.slice(0, 15).join(', ')}`)
    if (classes.typography.length > 0) lines.push(`- Typography: ${classes.typography.slice(0, 10).join(', ')}`)
    if (classes.color.length > 0) lines.push(`- Color: ${classes.color.slice(0, 10).join(', ')}`)
    if (classes.interaction.length > 0) lines.push(`- Interactions: ${classes.interaction.join(', ')}`)
  }

  // Count JSX elements
  const jsxTags = new Set<string>()
  const tagPattern = /<([A-Z]\w+)/g
  while ((match = tagPattern.exec(source)) !== null) {
    jsxTags.add(match[1])
  }
  if (jsxTags.size > 0) {
    lines.push('')
    lines.push(`### JSX Components Used`)
    lines.push([...jsxTags].sort().join(', '))
  }

  return lines.join('\n')
}

interface ClassCategories {
  layout: string[]
  typography: string[]
  color: string[]
  interaction: string[]
  total: number
}

function extractTailwindClasses(source: string): ClassCategories {
  const allClasses = new Set<string>()

  // Match className="...", className={'...'}, className={`...`}, cn("...")
  const patterns = [
    /className="([^"]*)"/g,
    /className=\{'([^']*)'\}/g,
    /className=\{`([^`]*)`\}/g,
    /cn\(\s*["'`]([^"'`]*)["'`]/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source)) !== null) {
      for (const cls of match[1].split(/\s+/)) {
        const trimmed = cls.trim()
        if (trimmed && !trimmed.startsWith('$') && !trimmed.startsWith('{')) {
          allClasses.add(trimmed)
        }
      }
    }
  }

  const layout: string[] = []
  const typography: string[] = []
  const color: string[] = []
  const interaction: string[] = []

  for (const cls of allClasses) {
    const base = cls.replace(/^(hover:|focus:|active:|disabled:|group-hover:|dark:)+/, '')

    if (cls.startsWith('hover:') || cls.startsWith('focus:') || cls.startsWith('active:') ||
        cls.startsWith('disabled:') || cls.startsWith('group-hover:') ||
        base.startsWith('transition') || base.startsWith('animate-') || base.startsWith('cursor-')) {
      interaction.push(cls)
    } else if (/^(flex|grid|gap-|p[xytblr]?-|m[xytblr]?-|w-|h-|max-|min-|items-|justify-|space-|col-|row-|absolute|relative|fixed|sticky|inset|top-|right-|bottom-|left-|container|block|inline|hidden|overflow|z-|order-)/.test(base)) {
      layout.push(cls)
    } else if (/^(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|left|center|right|wrap)|font-|tracking-|leading-|truncate|line-clamp|uppercase|lowercase|capitalize|whitespace)/.test(base)) {
      typography.push(cls)
    } else if (/^(bg-|text-|border|ring|outline|shadow|from-|to-|via-|opacity-|accent-)/.test(base)) {
      color.push(cls)
    } else {
      layout.push(cls) // default bucket
    }
  }

  return { layout, typography, color, interaction, total: allClasses.size }
}

function formatBuildMeta(meta: BuildMeta): string {
  const lines = ['## Build']
  if (meta.moduleCount != null) lines.push(`- Modules: ${meta.moduleCount}`)
  if (meta.bundleSize != null) lines.push(`- Bundle size: ${(meta.bundleSize / 1024).toFixed(1)} KB`)
  if (meta.dependencies && meta.dependencies.length > 0) {
    lines.push(`- Dependencies: ${meta.dependencies.join(', ')}`)
  }
  if (meta.warnings != null) lines.push(`- Warnings: ${meta.warnings}`)
  if (meta.duration != null) lines.push(`- Duration: ${meta.duration}ms`)
  return lines.join('\n')
}

// ============================================================================
// Layer 3: Render (from iframe probe)
// ============================================================================

function snapshotRender(probe: IframeProbeResult): string {
  if (!probe.rendered) return '## Render\nIframe not rendered — preview tab may not be open.'

  const lines: string[] = ['## Render']

  // Theme validation
  const themeVarCount = Object.keys(probe.computedTheme).length
  if (themeVarCount > 0) {
    lines.push(`### Computed Theme`)
    lines.push(`${themeVarCount} CSS variables resolved in iframe`)
  }

  // Layout
  if (probe.sections.length > 0) {
    lines.push('')
    lines.push('### Layout')
    lines.push(`${probe.sections.length} sections detected`)
    for (const s of probe.sections.slice(0, 10)) {
      const size = `${s.rect.width}x${s.rect.height}`
      const id = s.id ? `#${s.id}` : ''
      lines.push(`- <${s.tag}${id}> ${size} (${s.childCount} children)`)
    }
  }

  // Interactions
  if (probe.interactions.length > 0) {
    lines.push('')
    lines.push('### Interactions')
    for (const i of probe.interactions) {
      const handler = i.hasHandler ? 'has handler' : 'no handler'
      lines.push(`- <${i.tag}> ${i.type}${i.text ? `: "${i.text}"` : ''} (${handler})`)
    }
  }

  // Layout issues
  if (probe.layoutIssues.length > 0) {
    lines.push('')
    lines.push('### Layout Issues')
    for (const issue of probe.layoutIssues) {
      lines.push(`- ${issue.type}: ${issue.element} — ${issue.details}`)
    }
  } else {
    lines.push('')
    lines.push('No layout issues detected.')
  }

  return lines.join('\n')
}

// ============================================================================
// Main: generateSnapshot
// ============================================================================

export async function generateSnapshot(
  fs: JSRuntimeFS,
  cwd: string,
  buildMeta?: BuildMeta,
  probeResult?: IframeProbeResult
): Promise<SnapshotResult> {
  const sections: string[] = []
  const layers = { theme: false, structure: false, render: false }

  // Layer 1: Theme
  try {
    const themeSection = await snapshotTheme(fs, cwd)
    if (themeSection) {
      sections.push(themeSection)
      layers.theme = true
    }
  } catch { /* layer failure is non-fatal */ }

  // Layer 2: Structure
  try {
    const structureSection = await snapshotStructure(fs, cwd, buildMeta)
    if (structureSection) {
      sections.push(structureSection)
      layers.structure = true
    }
  } catch { /* layer failure is non-fatal */ }

  // Layer 3: Render (from iframe probe)
  if (probeResult) {
    try {
      const renderSection = snapshotRender(probeResult)
      if (renderSection) {
        sections.push(renderSection)
        layers.render = true
      }
    } catch { /* layer failure is non-fatal */ }
  }

  const report = sections.join('\n\n---\n\n') + '\n'
  return { report, layers }
}
