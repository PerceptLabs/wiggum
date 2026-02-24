/**
 * @wiggum/planning — Plan-to-implementation diffing
 *
 * Compares a parsed plan.tsx tree against source files to identify
 * missing screens, sections, fields, and theme deviations.
 * Produces a markdown report for .ralph/plan-diff.md.
 *
 * IDE-independent: receives abstract FS + optional JSX parser via injection.
 */
import type { PlanNode } from './validate'
import { collectNodes, getSectionsInOrder } from './validate'

// ============================================================================
// TYPES
// ============================================================================

export interface DiffFileSystem {
  readFile(path: string, opts: { encoding: 'utf8' }): Promise<string | Uint8Array>
  readdir(path: string, opts: { withFileTypes: true }): Promise<Array<{ name: string; type: string }>>
}

export interface SourceJsxNode {
  name: string
  props: Record<string, string | number | boolean>
  children: SourceJsxNode[]
}

export type SourceTsxParser = (content: string) => Promise<SourceJsxNode[]>

export type DiffStatus = 'implemented' | 'deviation' | 'missing' | 'extra'

export interface DiffEntry {
  status: DiffStatus
  category: 'screen' | 'section' | 'theme' | 'data'
  planned: string
  found?: string
  detail?: string
}

export interface PlanDiffResult {
  entries: DiffEntry[]
  report: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLUMN_COMPONENTS = new Set(['TableHeader', 'TableHead', 'th', 'Column', 'DataColumn'])
const FIELD_COMPONENTS = new Set(['Input', 'Label', 'Select', 'Textarea', 'Checkbox', 'Radio', 'Switch', 'Slider', 'Field', 'FormField'])
const FIELD_PROP_KEYS = new Set(['name', 'field', 'label', 'id', 'htmlFor', 'placeholder', 'header', 'accessor'])

const REQUIRED_THEME_VARS = ['--primary', '--background', '--foreground', '--secondary', '--muted', '--accent', '--border', '--ring']

// ============================================================================
// MAIN
// ============================================================================

export async function diffPlan(
  root: PlanNode,
  fs: DiffFileSystem,
  cwd: string,
  parseTsx?: SourceTsxParser,
): Promise<PlanDiffResult> {
  const entries: DiffEntry[] = []

  // 1. Collect source inventory
  const sourceFiles = await collectSourceFiles(fs, `${cwd}/src`)
  const sourceContent = new Map<string, string>()
  for (const [relPath, content] of sourceFiles) {
    sourceContent.set(relPath, typeof content === 'string' ? content : new TextDecoder().decode(content as Uint8Array))
  }

  // 2. Parse all source JSX trees (for Field/Column checks)
  const parsedSourceJsx = new Map<string, SourceJsxNode[]>()
  if (parseTsx) {
    for (const [relPath, content] of sourceContent) {
      if (relPath.endsWith('.tsx') || relPath.endsWith('.jsx')) {
        try {
          const trees = await parseTsx(content)
          if (trees.length > 0) parsedSourceJsx.set(relPath, trees)
        } catch {
          // Parse failure — skip this file for AST checks
        }
      }
    }
  }

  // Flatten all JSX trees for broad field/column search
  const allSourceJsx: SourceJsxNode[] = [...parsedSourceJsx.values()].flat()

  // Track which source files are "claimed" by plan items
  const claimedFiles = new Set<string>()

  // 3. Check Screens
  const screens = root.children.filter(c => c.component === 'Screen')
  for (const screen of screens) {
    const name = String(screen.props.name ?? '')
    if (!name) continue
    const variants = nameVariants(name)
    let found = false
    for (const [relPath, content] of sourceContent) {
      const fileName = relPath.split('/').pop() ?? ''
      const fileBase = fileName.replace(/\.[^.]+$/, '')
      if (variants.some(v => fileBase.toLowerCase() === v.toLowerCase())) {
        entries.push({ status: 'implemented', category: 'screen', planned: name, found: relPath })
        claimedFiles.add(relPath)
        found = true
        break
      }
      if (variants.some(v => content.includes(v))) {
        entries.push({ status: 'implemented', category: 'screen', planned: name, found: relPath })
        claimedFiles.add(relPath)
        found = true
        break
      }
    }
    if (!found) {
      entries.push({ status: 'missing', category: 'screen', planned: name })
    }
  }

  // 4. Check Sections (with Field/Column sub-checks)
  for (const screen of screens) {
    const sections = getSectionsInOrder(screen)
    for (const section of sections) {
      const gumdrop = String(section.props.gumdrop ?? '')
      if (!gumdrop) continue
      const variants = nameVariants(gumdrop)

      let sectionFound = false
      for (const [relPath, content] of sourceContent) {
        if (variants.some(v => content.toLowerCase().includes(v.toLowerCase()))) {
          claimedFiles.add(relPath)
          sectionFound = true
          break
        }
      }

      // Check Field/Column children via AST
      const plannedFields = collectPlannedFields(section)
      const missingFields: string[] = []

      if (plannedFields.length > 0 && parseTsx && allSourceJsx.length > 0) {
        for (const field of plannedFields) {
          if (!sourceHasField(allSourceJsx, field.name, field.kind)) {
            missingFields.push(field.name)
          }
        }
      }

      if (sectionFound && missingFields.length === 0) {
        entries.push({ status: 'implemented', category: 'section', planned: gumdrop })
      } else if (sectionFound && missingFields.length > 0) {
        entries.push({
          status: 'deviation',
          category: 'section',
          planned: gumdrop,
          detail: `Fields not found in source: ${missingFields.join(', ')}`,
        })
      } else {
        entries.push({ status: 'missing', category: 'section', planned: gumdrop })
      }
    }
  }

  // 5. Check Theme
  const themes = root.children.filter(c => c.component === 'Theme')
  if (themes.length > 0) {
    const cssContent = sourceContent.get('index.css') ?? ''
    const foundVars = REQUIRED_THEME_VARS.filter(v => cssContent.includes(v))
    const missingVars = REQUIRED_THEME_VARS.filter(v => !cssContent.includes(v))

    if (foundVars.length === REQUIRED_THEME_VARS.length) {
      const mood = themes[0].props.mood
      entries.push({
        status: 'implemented',
        category: 'theme',
        planned: mood ? `Theme (mood: ${mood})` : 'Theme',
      })
    } else if (foundVars.length > 0) {
      entries.push({
        status: 'deviation',
        category: 'theme',
        planned: 'Theme',
        detail: `Missing CSS vars: ${missingVars.join(', ')}`,
      })
    } else {
      entries.push({ status: 'missing', category: 'theme', planned: 'Theme' })
    }
  }

  // 6. Check Data (graceful skip if dirs don't exist)
  const schemas = collectNodes(root, 'Schema')
  for (const schema of schemas) {
    const name = String(schema.props.name ?? '')
    if (!name) continue
    let found = false
    for (const [relPath, content] of sourceContent) {
      if (relPath.startsWith('shared/') && content.includes(name)) {
        found = true
        break
      }
    }
    if (found) {
      entries.push({ status: 'implemented', category: 'data', planned: `Schema: ${name}` })
    }
    // If shared/ doesn't exist, skip silently — not a Phase 6 concern
  }

  // 7. Detect extras
  const utilFiles = new Set(['main.tsx', 'main.ts', 'index.css', 'vite-env.d.ts'])
  for (const relPath of sourceContent.keys()) {
    if (!claimedFiles.has(relPath) && !utilFiles.has(relPath)) {
      entries.push({ status: 'extra', category: 'screen', planned: '(unplanned)', found: relPath })
    }
  }

  // 8. Format report
  const report = formatReport(entries)

  return { entries, report }
}

// ============================================================================
// FIELD/COLUMN MATCHING
// ============================================================================

function collectPlannedFields(section: PlanNode): Array<{ name: string; kind: 'field' | 'column' }> {
  const fields: Array<{ name: string; kind: 'field' | 'column' }> = []
  function walk(node: PlanNode) {
    if (node.component === 'Field' && typeof node.props?.name === 'string') {
      fields.push({ name: node.props.name as string, kind: 'field' })
    }
    if (node.component === 'Column' && typeof node.props?.field === 'string') {
      fields.push({ name: node.props.field as string, kind: 'column' })
    }
    for (const child of node.children) walk(child)
  }
  for (const child of section.children) walk(child)
  return fields
}

function sourceHasField(trees: SourceJsxNode[], fieldName: string, kind: 'field' | 'column'): boolean {
  const targetComponents = kind === 'column' ? COLUMN_COMPONENTS : FIELD_COMPONENTS
  function walk(node: SourceJsxNode): boolean {
    // Check 1: known component with matching prop value
    if (targetComponents.has(node.name)) {
      for (const val of Object.values(node.props)) {
        if (String(val) === fieldName) return true
      }
    }
    // Check 2: any component with a field-related prop matching the name
    for (const [key, val] of Object.entries(node.props)) {
      if (FIELD_PROP_KEYS.has(key) && String(val) === fieldName) return true
    }
    return node.children.some(c => walk(c))
  }
  return trees.some(t => walk(t))
}

// ============================================================================
// NAME MATCHING
// ============================================================================

function nameVariants(name: string): string[] {
  // "Dashboard Settings" → ['DashboardSettings', 'dashboardSettings', 'dashboard-settings', 'dashboard_settings']
  const words = name.split(/[\s-_]+/).filter(Boolean)
  if (words.length === 0) return [name]

  const pascal = words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
  const camel = pascal[0].toLowerCase() + pascal.slice(1)
  const kebab = words.map(w => w.toLowerCase()).join('-')
  const snake = words.map(w => w.toLowerCase()).join('_')

  return [...new Set([name, pascal, camel, kebab, snake])]
}

// ============================================================================
// SOURCE INVENTORY
// ============================================================================

async function collectSourceFiles(
  fs: DiffFileSystem,
  srcPath: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>()

  async function walk(dir: string, prefix: string) {
    let entries: Array<{ name: string; type: string }>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return // Directory doesn't exist
    }

    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.type === 'dir') {
        await walk(fullPath, relPath)
      } else if (/\.(tsx?|css|jsx?)$/.test(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, { encoding: 'utf8' })
          files.set(relPath, typeof content === 'string' ? content : new TextDecoder().decode(content as Uint8Array))
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await walk(srcPath, '')
  return files
}

// ============================================================================
// REPORT FORMATTER
// ============================================================================

function formatReport(entries: DiffEntry[]): string {
  const implemented = entries.filter(e => e.status === 'implemented')
  const deviations = entries.filter(e => e.status === 'deviation')
  const missing = entries.filter(e => e.status === 'missing')
  const extras = entries.filter(e => e.status === 'extra')

  const lines: string[] = ['# Plan Diff Report\n']

  if (implemented.length > 0) {
    lines.push('### Implemented\n')
    for (const e of implemented) {
      const suffix = e.found ? ` (${e.found})` : ''
      lines.push(`- [x] ${e.category}: ${e.planned}${suffix}`)
    }
    lines.push('')
  }

  if (deviations.length > 0) {
    lines.push('### Deviations\n')
    for (const e of deviations) {
      lines.push(`- [ ] ${e.category}: ${e.planned}`)
      if (e.detail) lines.push(`  - ${e.detail}`)
    }
    lines.push('')
  }

  if (missing.length > 0) {
    lines.push('### Missing\n')
    for (const e of missing) {
      lines.push(`- [ ] ${e.category}: ${e.planned}`)
    }
    lines.push('')
  }

  if (extras.length > 0) {
    lines.push('### Extra (unplanned)\n')
    for (const e of extras) {
      lines.push(`- ${e.found ?? e.planned}`)
    }
    lines.push('')
  }

  if (entries.length === 0) {
    lines.push('No plan items to diff.\n')
  }

  return lines.join('\n')
}
