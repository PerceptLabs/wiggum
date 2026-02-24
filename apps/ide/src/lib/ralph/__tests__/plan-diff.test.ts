import { describe, it, expect } from 'vitest'
import { diffPlan, type DiffFileSystem, type SourceJsxNode, type SourceTsxParser } from '@wiggum/planning/diff'
import type { PlanNode } from '@wiggum/planning/validate'

// ============================================================================
// MOCK HELPERS
// ============================================================================

/** Create a mock DiffFileSystem from a flat file map */
function mockFS(files: Record<string, string>): DiffFileSystem {
  return {
    readFile: async (path) => {
      // Normalize path separators
      const normalized = path.replace(/\\/g, '/')
      for (const [key, val] of Object.entries(files)) {
        if (normalized.endsWith(key) || normalized === key) return val
      }
      throw new Error(`ENOENT: ${path}`)
    },
    readdir: async (path) => {
      const normalized = path.replace(/\\/g, '/')
      const entries: Array<{ name: string; type: string }> = []
      const seen = new Set<string>()
      for (const key of Object.keys(files)) {
        // Find entries directly under this path
        const prefix = normalized.endsWith('/') ? normalized : normalized + '/'
        if (!key.startsWith(prefix.replace(/^.*\/src\//, 'src/'))) continue
        const rest = key.slice(prefix.replace(/^.*\/src\//, 'src/').length)
        const firstSegment = rest.split('/')[0]
        if (!firstSegment || seen.has(firstSegment)) continue
        seen.add(firstSegment)
        const isDir = rest.includes('/')
        entries.push({ name: firstSegment, type: isDir ? 'dir' : 'file' })
      }
      if (entries.length === 0 && !Object.keys(files).some(k => k.startsWith('src/'))) {
        throw new Error(`ENOENT: ${path}`)
      }
      return entries
    },
  }
}

/**
 * Build a mock FS that resolves paths relative to cwd.
 * Files keys should be relative to project root (e.g. 'src/App.tsx')
 */
function projectFS(files: Record<string, string>): { fs: DiffFileSystem; cwd: string } {
  const cwd = '/project'
  const absoluteFiles: Record<string, string> = {}
  for (const [key, val] of Object.entries(files)) {
    absoluteFiles[`${cwd}/${key}`] = val
  }
  return {
    fs: {
      readFile: async (path) => {
        if (absoluteFiles[path]) return absoluteFiles[path]
        throw new Error(`ENOENT: ${path}`)
      },
      readdir: async (path) => {
        const prefix = path.endsWith('/') ? path : path + '/'
        const entries: Array<{ name: string; type: string }> = []
        const seen = new Set<string>()
        for (const key of Object.keys(absoluteFiles)) {
          if (!key.startsWith(prefix)) continue
          const rest = key.slice(prefix.length)
          const firstSegment = rest.split('/')[0]
          if (!firstSegment || seen.has(firstSegment)) continue
          seen.add(firstSegment)
          entries.push({ name: firstSegment, type: rest.includes('/') ? 'dir' : 'file' })
        }
        if (entries.length === 0) throw new Error(`ENOENT: ${path}`)
        return entries
      },
    },
    cwd,
  }
}

/** Create a mock parseTsx that returns predefined SourceJsxNode trees for any input */
function mockParser(trees: SourceJsxNode[]): SourceTsxParser {
  return async () => trees
}

// ============================================================================
// PLAN TREES
// ============================================================================

function makePlan(children: PlanNode[]): PlanNode {
  return { component: 'App', props: {}, line: 1, children }
}

function theme(mood?: string): PlanNode {
  return { component: 'Theme', props: mood ? { mood } : {}, line: 2, children: [] }
}

function screen(name: string, sections: PlanNode[]): PlanNode {
  return { component: 'Screen', props: { name }, line: 3, children: sections }
}

function section(gumdrop: string, children: PlanNode[] = []): PlanNode {
  return { component: 'Section', props: { gumdrop }, line: 4, children }
}

function field(name: string): PlanNode {
  return { component: 'Field', props: { name, type: 'text' }, line: 5, children: [] }
}

function column(fieldName: string): PlanNode {
  return { component: 'Column', props: { field: fieldName }, line: 5, children: [] }
}

function schemaNode(name: string): PlanNode {
  return { component: 'Schema', props: { name }, line: 6, children: [] }
}

// ============================================================================
// CSS CONTENT
// ============================================================================

const FULL_CSS = `:root {
  --primary: oklch(0.5 0.2 250);
  --primary-foreground: oklch(0.98 0 0);
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.1 0 0);
  --secondary: oklch(0.9 0.05 250);
  --secondary-foreground: oklch(0.1 0 0);
  --muted: oklch(0.9 0.02 250);
  --muted-foreground: oklch(0.4 0 0);
  --accent: oklch(0.8 0.1 250);
  --accent-foreground: oklch(0.1 0 0);
  --destructive: oklch(0.6 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.8 0 0);
  --input: oklch(0.85 0 0);
  --ring: oklch(0.5 0.2 250);
  --card: oklch(0.98 0 0);
  --card-foreground: oklch(0.1 0 0);
  --popover: oklch(0.98 0 0);
  --popover-foreground: oklch(0.1 0 0);
  --success: oklch(0.6 0.2 145);
  --success-foreground: oklch(0.98 0 0);
  --warning: oklch(0.7 0.15 85);
  --warning-foreground: oklch(0.1 0 0);
  --sidebar-background: oklch(0.95 0 0);
  --sidebar-foreground: oklch(0.1 0 0);
  --sidebar-primary: oklch(0.5 0.2 250);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.85 0.1 250);
  --sidebar-accent-foreground: oklch(0.1 0 0);
  --sidebar-border: oklch(0.8 0 0);
  --sidebar-ring: oklch(0.5 0.2 250);
  --chart-1: oklch(0.5 0.2 250);
  --chart-2: oklch(0.6 0.2 180);
  --chart-3: oklch(0.7 0.15 85);
  --chart-4: oklch(0.55 0.2 320);
  --chart-5: oklch(0.5 0.2 25);
}
.dark { --background: oklch(0.1 0 0); }`

// ============================================================================
// TESTS
// ============================================================================

describe('diffPlan', () => {
  it('1: all screens implemented', async () => {
    const { fs, cwd } = projectFS({
      'src/Dashboard.tsx': 'export function Dashboard() { return <div>Dashboard</div> }',
      'src/Settings.tsx': 'export function Settings() { return <div>Settings</div> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme('zen'),
      screen('Dashboard', [section('hero')]),
      screen('Settings', [section('form-layout')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const screenEntries = result.entries.filter(e => e.category === 'screen' && e.status === 'implemented')
    expect(screenEntries).toHaveLength(2)
  })

  it('2: missing screen', async () => {
    const { fs, cwd } = projectFS({
      'src/Dashboard.tsx': 'export function Dashboard() {}',
      'src/Settings.tsx': 'export function Settings() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('Dashboard', [section('hero')]),
      screen('Settings', [section('form-layout')]),
      screen('Analytics', [section('stats-dashboard')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const missing = result.entries.filter(e => e.category === 'screen' && e.status === 'missing')
    expect(missing).toHaveLength(1)
    expect(missing[0].planned).toBe('Analytics')
  })

  it('3: section gumdrop found', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'import Hero from "./Hero"\nexport default function App() { return <Hero /> }',
      'src/Hero.tsx': 'export default function Hero() { return <section>hero content</section> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('hero')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'hero')
    expect(sectionEntry?.status).toBe('implemented')
  })

  it('4: section gumdrop missing', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() { return <div>hello</div> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('stats-dashboard')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'stats-dashboard')
    expect(sectionEntry?.status).toBe('missing')
  })

  it('5: theme present', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme('zen'),
      screen('App', [section('hero')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const themeEntry = result.entries.find(e => e.category === 'theme')
    expect(themeEntry?.status).toBe('implemented')
    expect(themeEntry?.planned).toContain('zen')
  })

  it('6: theme missing', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() {}',
      'src/index.css': 'body { margin: 0; }',
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('hero')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const themeEntry = result.entries.find(e => e.category === 'theme')
    expect(themeEntry?.status).toBe('missing')
  })

  it('7: empty plan — only App and Theme', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([theme()])

    const result = await diffPlan(plan, fs, cwd)
    // Only theme entry, no screens/sections
    const screenEntries = result.entries.filter(e => e.category === 'screen' && e.status !== 'extra')
    const sectionEntries = result.entries.filter(e => e.category === 'section')
    expect(screenEntries).toHaveLength(0)
    expect(sectionEntries).toHaveLength(0)
  })

  it('8: report format has correct headings', async () => {
    const { fs, cwd } = projectFS({
      'src/Dashboard.tsx': 'export function Dashboard() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('Dashboard', [section('hero')]),
      screen('Missing', [section('stats')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    expect(result.report).toContain('# Plan Diff Report')
    expect(result.report).toContain('### Implemented')
    expect(result.report).toContain('### Missing')
  })

  it('9: extra source files detected', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() {}',
      'src/Unplanned.tsx': 'export function Unplanned() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('hero')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const extras = result.entries.filter(e => e.status === 'extra')
    expect(extras.length).toBeGreaterThan(0)
    expect(extras.some(e => e.found?.includes('Unplanned.tsx'))).toBe(true)
  })

  it('10: no src/ directory — all planned items missing', async () => {
    const fs: DiffFileSystem = {
      readFile: async () => { throw new Error('ENOENT') },
      readdir: async () => { throw new Error('ENOENT') },
    }
    const plan = makePlan([
      theme(),
      screen('Dashboard', [section('hero')]),
    ])

    const result = await diffPlan(plan, fs, '/project')
    const missing = result.entries.filter(e => e.status === 'missing')
    expect(missing.length).toBeGreaterThanOrEqual(2) // screen + section + theme
  })

  it('11: data/schema graceful skip when no shared/ dir', async () => {
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'export default function App() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('hero')]),
      { component: 'Data', props: {}, line: 10, children: [schemaNode('Recipe')] },
    ])

    const result = await diffPlan(plan, fs, cwd)
    // Schema should NOT appear as missing since shared/ doesn't exist
    const dataEntries = result.entries.filter(e => e.category === 'data')
    expect(dataEntries).toHaveLength(0)
  })

  it('12: name variant matching — "Dashboard Settings" found via DashboardSettings.tsx', async () => {
    const { fs, cwd } = projectFS({
      'src/DashboardSettings.tsx': 'export function DashboardSettings() {}',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('Dashboard Settings', [section('form-layout')]),
    ])

    const result = await diffPlan(plan, fs, cwd)
    const screenEntry = result.entries.find(e => e.category === 'screen' && e.planned === 'Dashboard Settings')
    expect(screenEntry?.status).toBe('implemented')
  })

  // ==========================================================================
  // FIELD/COLUMN AST-BASED TESTS (13-16)
  // ==========================================================================

  it('13: column field found — TableHeader with matching prop', async () => {
    const sourceTrees: SourceJsxNode[] = [
      {
        name: 'Table',
        props: {},
        children: [
          { name: 'TableHeader', props: { field: 'title' }, children: [] },
          { name: 'TableHeader', props: { field: 'author' }, children: [] },
        ],
      },
    ]
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'import { DataTable } from "./DataTable"\nexport default function App() { return <DataTable /> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('data-table', [column('title'), column('author')])]),
    ])

    const result = await diffPlan(plan, fs, cwd, mockParser(sourceTrees))
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'data-table')
    expect(sectionEntry?.status).toBe('implemented')
  })

  it('14: column field missing — no source component has matching prop', async () => {
    const sourceTrees: SourceJsxNode[] = [
      {
        name: 'Table',
        props: {},
        children: [
          { name: 'TableHeader', props: { field: 'title' }, children: [] },
        ],
      },
    ]
    const { fs, cwd } = projectFS({
      'src/App.tsx': 'import { DataTable } from "./DataTable"\nexport default function App() { return <DataTable /> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('data-table', [column('title'), column('rating')])]),
    ])

    const result = await diffPlan(plan, fs, cwd, mockParser(sourceTrees))
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'data-table')
    expect(sectionEntry?.status).toBe('deviation')
    expect(sectionEntry?.detail).toContain('rating')
  })

  it('15: field name found — Input with matching name prop', async () => {
    const sourceTrees: SourceJsxNode[] = [
      {
        name: 'form',
        props: {},
        children: [
          { name: 'Input', props: { name: 'email', type: 'email' }, children: [] },
          { name: 'Input', props: { name: 'password', type: 'password' }, children: [] },
        ],
      },
    ]
    const { fs, cwd } = projectFS({
      'src/App.tsx': '// form-layout component\nexport default function App() { return <form /> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('form-layout', [field('email'), field('password')])]),
    ])

    const result = await diffPlan(plan, fs, cwd, mockParser(sourceTrees))
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'form-layout')
    expect(sectionEntry?.status).toBe('implemented')
  })

  it('16: field name missing — no source component matches', async () => {
    const sourceTrees: SourceJsxNode[] = [
      {
        name: 'form',
        props: {},
        children: [
          { name: 'Input', props: { name: 'email' }, children: [] },
        ],
      },
    ]
    const { fs, cwd } = projectFS({
      'src/App.tsx': '// form-layout section\nexport default function App() { return <form /> }',
      'src/index.css': FULL_CSS,
    })
    const plan = makePlan([
      theme(),
      screen('App', [section('form-layout', [field('email'), field('phone'), field('address')])]),
    ])

    const result = await diffPlan(plan, fs, cwd, mockParser(sourceTrees))
    const sectionEntry = result.entries.find(e => e.category === 'section' && e.planned === 'form-layout')
    expect(sectionEntry?.status).toBe('deviation')
    expect(sectionEntry?.detail).toContain('phone')
    expect(sectionEntry?.detail).toContain('address')
  })
})
