/**
 * @wiggum/planning — Plan validation
 *
 * Validates a parsed plan tree against codebase registries.
 * Used by the plan-valid quality gate in apps/ide.
 */
import {
  MOOD_NAMES,
  PRESET_NAMES,
  PATTERN_NAMES,
  FONT_NAMES,
  SHADOW_PROFILES,
  RADIUS_STOPS,
  GUMDROP_NAMES,
} from './generated-values'

// ============================================================================
// TYPES
// ============================================================================

/** A node in the parsed plan tree */
export interface PlanNode {
  component: string
  props: Record<string, string | number | boolean>
  children: PlanNode[]
  line: number
}

/** Registry values for validation — defaults from generated-values.ts */
export interface PlanRegistries {
  moods: readonly string[]
  presets: readonly string[]
  patterns: readonly string[]
  fonts: readonly string[]
  shadows: readonly string[]
  radii: readonly string[]
  gumdrops: readonly string[]
}

/** A single validation check result */
export interface ValidationCheck {
  id: string
  message: string
}

/** Combined validation results */
export interface ValidationResult {
  failures: ValidationCheck[]
  warnings: ValidationCheck[]
}

// ============================================================================
// SEMANTIC LISTS (hand-maintained)
// ============================================================================

/** Gumdrops that typically display data in a grid/card layout */
const GRID_HEAVY_GUMDROPS = new Set([
  'blog-grid', 'gallery', 'grid-list', 'pricing', 'features',
  'team', 'testimonials', 'portfolio', 'stats-dashboard',
])

/** Gumdrops that require a data model to be meaningful */
const STATEFUL_GUMDROPS = new Set([
  'data-table', 'kanban-board', 'calendar-view',
  'chat-messaging', 'activity-feed', 'file-browser',
])

// ============================================================================
// HELPERS
// ============================================================================

/** Recursively collect all descendants matching a component name */
export function collectNodes(node: PlanNode, name: string): PlanNode[] {
  const result: PlanNode[] = []
  if (node.component === name) result.push(node)
  for (const child of node.children) {
    result.push(...collectNodes(child, name))
  }
  return result
}

/** Check if a node has any Section descendants (handles Content wrapper) */
export function hasSectionDescendant(node: PlanNode): boolean {
  for (const child of node.children) {
    if (child.component === 'Section') return true
    if (hasSectionDescendant(child)) return true
  }
  return false
}

/** Get direct Section children or Sections inside Content */
export function getSectionsInOrder(node: PlanNode): PlanNode[] {
  const sections: PlanNode[] = []
  for (const child of node.children) {
    if (child.component === 'Section') {
      sections.push(child)
    } else if (child.component === 'Content') {
      for (const grandchild of child.children) {
        if (grandchild.component === 'Section') {
          sections.push(grandchild)
        }
      }
    }
  }
  return sections
}

/** Single-row Levenshtein distance (no external dependency) */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i - 1
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/** Suggest nearest valid names by edit distance */
function suggestNearest(name: string, valid: readonly string[], count = 3): string[] {
  return [...valid]
    .map(v => ({ v, d: levenshtein(name.toLowerCase(), v.toLowerCase()) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .filter(x => x.d <= Math.max(name.length * 0.6, 4))
    .map(x => x.v)
}

/** Normalize a name for schema-endpoint matching */
function normalizeResourceName(name: string): string {
  let n = name.toLowerCase()
  if (n.endsWith('s')) n = n.slice(0, -1)
  return n
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a parsed plan tree against registries.
 *
 * @param root - The root PlanNode from the parser (null if parse failed)
 * @param registries - Optional override registries for testing
 */
export function validatePlan(
  root: PlanNode | null,
  registries?: PlanRegistries
): ValidationResult {
  const reg: PlanRegistries = registries ?? {
    moods: MOOD_NAMES,
    presets: PRESET_NAMES,
    patterns: PATTERN_NAMES,
    fonts: FONT_NAMES,
    shadows: SHADOW_PROFILES,
    radii: RADIUS_STOPS,
    gumdrops: GUMDROP_NAMES,
  }

  const failures: ValidationCheck[] = []
  const warnings: ValidationCheck[] = []

  // --- FAIL: parseable ---
  if (!root) {
    failures.push({ id: 'parseable', message: 'plan.tsx could not be parsed' })
    return { failures, warnings }
  }

  // --- FAIL: has-app-root ---
  if (root.component !== 'App') {
    failures.push({
      id: 'has-app-root',
      message: `plan.tsx must have a single <App> root, found <${root.component}>`,
    })
    return { failures, warnings }
  }

  // --- FAIL: has-theme ---
  const themes = root.children.filter(c => c.component === 'Theme')
  if (themes.length === 0) {
    failures.push({
      id: 'has-theme',
      message: "Missing <Theme> — run `theme generate` or add one",
    })
  }

  // --- FAIL: has-screens ---
  const screens = root.children.filter(c => c.component === 'Screen')
  if (screens.length === 0) {
    failures.push({
      id: 'has-screens',
      message: 'No <Screen> elements — plan needs at least one page',
    })
  }

  // --- FAIL: valid-mood ---
  const validMoods = new Set([...reg.moods, ...reg.presets])
  for (const theme of themes) {
    const mood = theme.props.mood
    if (mood !== undefined && typeof mood === 'string' && !validMoods.has(mood)) {
      failures.push({
        id: 'valid-mood',
        message: `Unknown mood '${mood}' — valid: ${[...reg.moods, ...reg.presets].join(', ')}`,
      })
    }
  }

  // --- FAIL: valid-font ---
  const validFonts = new Set(reg.fonts)
  for (const theme of themes) {
    const font = theme.props.font
    if (font !== undefined && typeof font === 'string' && !validFonts.has(font)) {
      failures.push({
        id: 'valid-font',
        message: `Unknown font '${font}' — not in curated registry`,
      })
    }
    const monoFont = theme.props.monoFont
    if (monoFont !== undefined && typeof monoFont === 'string' && !validFonts.has(monoFont)) {
      failures.push({
        id: 'valid-font',
        message: `Unknown monoFont '${monoFont}' — not in curated registry`,
      })
    }
  }

  // --- FAIL: valid-gumdrops ---
  const validGumdrops = new Set(reg.gumdrops)
  const allGumdropsUsed: string[] = []

  function walkForGumdrops(node: PlanNode) {
    const gumdrop = node.props.gumdrop
    if (gumdrop !== undefined && typeof gumdrop === 'string') {
      allGumdropsUsed.push(gumdrop)
      if (!validGumdrops.has(gumdrop)) {
        const suggestions = suggestNearest(String(gumdrop), reg.gumdrops)
        const hint = suggestions.length > 0 ? `\n  Did you mean: ${suggestions.join(', ')}?` : ''
        failures.push({
          id: 'valid-gumdrops',
          message: `Unknown gumdrop '${gumdrop}' in <${node.component}> (line ${node.line})${hint}`,
        })
      }
    }
    const use = node.props.use
    if (use !== undefined && typeof use === 'string') {
      allGumdropsUsed.push(use)
      if (!validGumdrops.has(use)) {
        const suggestions = suggestNearest(String(use), reg.gumdrops)
        const hint = suggestions.length > 0 ? `\n  Did you mean: ${suggestions.join(', ')}?` : ''
        failures.push({
          id: 'valid-gumdrops',
          message: `Unknown gumdrop '${use}' in <${node.component}> (line ${node.line})${hint}`,
        })
      }
    }
    for (const child of node.children) {
      walkForGumdrops(child)
    }
  }
  walkForGumdrops(root)

  // --- FAIL: sections-have-gumdrops ---
  const allSections = collectNodes(root, 'Section')
  for (const section of allSections) {
    if (section.props.gumdrop === undefined) {
      failures.push({
        id: 'sections-have-gumdrops',
        message: `Section at line ${section.line} has no gumdrop — what recipe should Ralph follow?`,
      })
    }
  }

  // --- FAIL: no-empty-screens ---
  for (const screen of screens) {
    if (!hasSectionDescendant(screen)) {
      const name = screen.props.name ?? 'unnamed'
      failures.push({
        id: 'no-empty-screens',
        message: `Screen '${name}' is empty — add sections`,
      })
    }
  }

  // --- FAIL: schema-endpoint-match ---
  const schemas = collectNodes(root, 'Schema')
  const endpoints = collectNodes(root, 'Endpoint')
  const schemaNames = new Set(schemas.map(s => normalizeResourceName(String(s.props.name ?? ''))))

  for (const endpoint of endpoints) {
    const resource = String(endpoint.props.resource ?? '')
    if (resource && !schemaNames.has(normalizeResourceName(resource))) {
      failures.push({
        id: 'schema-endpoint-match',
        message: `Endpoint '${resource}' references a schema that isn't declared in <Data>`,
      })
    }
  }

  // --- WARN: adjacent-grids ---
  for (const screen of screens) {
    const sections = getSectionsInOrder(screen)
    for (let i = 0; i < sections.length - 1; i++) {
      const a = String(sections[i].props.gumdrop ?? '')
      const b = String(sections[i + 1].props.gumdrop ?? '')
      if (GRID_HEAVY_GUMDROPS.has(a) && GRID_HEAVY_GUMDROPS.has(b)) {
        warnings.push({
          id: 'adjacent-grids',
          message: `Sections '${a}' and '${b}' in Screen '${screen.props.name ?? 'unnamed'}' are both grid-based — consider varying layout`,
        })
      }
    }
  }

  // --- WARN: low-diversity ---
  const distinctGumdrops = new Set(allGumdropsUsed)
  if (allSections.length > 0 && distinctGumdrops.size < 3) {
    warnings.push({
      id: 'low-diversity',
      message: `Only ${distinctGumdrops.size} gumdrop type(s) used — consider more variety`,
    })
  }

  // --- WARN: missing-nav ---
  if (screens.length > 1) {
    const navs = collectNodes(root, 'Nav')
    if (navs.length === 0) {
      warnings.push({
        id: 'missing-nav',
        message: 'No navigation declared — most multi-screen apps need nav',
      })
    }
  }

  // --- WARN: no-data-for-stateful ---
  const hasData = collectNodes(root, 'Data').length > 0
  if (!hasData) {
    for (const gumdrop of allGumdropsUsed) {
      if (STATEFUL_GUMDROPS.has(gumdrop)) {
        warnings.push({
          id: 'no-data-for-stateful',
          message: `Using '${gumdrop}' but no data model declared — consider adding <Data>`,
        })
        break // One warning is enough
      }
    }
  }

  return { failures, warnings }
}
