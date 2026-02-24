import { describe, it, expect } from 'vitest'
import { scopeValidationGate, parseScopeMarkers, countHeuristicItems } from '../scope-gates'
import type { JSRuntimeFS } from '../../fs/types'
import type { GateContext } from '../../types/observability'

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Create a mock JSRuntimeFS from a flat file map.
 * Keys are absolute paths (e.g., '/project/src/App.tsx').
 */
function mockFS(files: Record<string, string>): JSRuntimeFS {
  return {
    readFile: async (path: string) => {
      if (files[path] !== undefined) return files[path]
      throw new Error(`ENOENT: ${path}`)
    },
    writeFile: async () => {},
    readdir: async (path: string, options?: { withFileTypes?: boolean }) => {
      const prefix = path.endsWith('/') ? path : path + '/'
      const seen = new Set<string>()
      const entries: Array<{ name: string; type: 'file' | 'dir' }> = []

      for (const key of Object.keys(files)) {
        if (!key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        const firstSegment = rest.split('/')[0]
        if (!firstSegment || seen.has(firstSegment)) continue
        seen.add(firstSegment)
        entries.push({ name: firstSegment, type: rest.includes('/') ? 'dir' : 'file' })
      }

      if (entries.length === 0) throw new Error(`ENOENT: ${path}`)

      if (options?.withFileTypes) return entries
      return entries.map(e => e.name)
    },
    mkdir: async () => {},
    rmdir: async () => {},
    unlink: async () => {},
    stat: async (path: string) => {
      if (files[path] !== undefined) {
        return { isFile: () => true, isDirectory: () => false, size: files[path].length, mtimeMs: 0, type: 'file' as const }
      }
      // Check if it's a directory prefix
      const prefix = path.endsWith('/') ? path : path + '/'
      if (Object.keys(files).some(k => k.startsWith(prefix))) {
        return { isFile: () => false, isDirectory: () => true, size: 0, mtimeMs: 0, type: 'dir' as const }
      }
      throw new Error(`ENOENT: ${path}`)
    },
    rename: async () => {},
  } as unknown as JSRuntimeFS
}

/**
 * Create a mock Git object for scope gate tests.
 * tagFiles maps tag names to file maps (filepath → content).
 */
function mockGit(tagFiles: Record<string, Record<string, string>>) {
  return {
    resolveRef: async (ref: string) => {
      if (tagFiles[ref]) return `oid-${ref}`
      throw new Error(`NotFoundError: ${ref}`)
    },
    readFileAtCommit: async (filepath: string, oid: string) => {
      // Find the tag from the oid
      const tag = Object.keys(tagFiles).find(t => `oid-${t}` === oid)
      if (!tag || !tagFiles[tag][filepath]) {
        throw new Error(`NotFoundError: ${filepath} at ${oid}`)
      }
      return new TextEncoder().encode(tagFiles[tag][filepath])
    },
    listTags: async () => Object.keys(tagFiles),
  }
}

// ============================================================================
// HELPER — generate source with N repeated Card components
// ============================================================================

function makeCardsSource(count: number): string {
  const cards = Array.from({ length: count }, (_, i) =>
    `      <Card key={${i}}><p>Item ${i + 1}</p></Card>`
  ).join('\n')
  return `import { Card } from '@wiggum/stack'\n\nfunction Features() {\n  return (\n    <div>\n${cards}\n    </div>\n  )\n}\n\nexport default Features`
}

// ============================================================================
// UNIT TESTS — parseScopeMarkers
// ============================================================================

describe('parseScopeMarkers', () => {
  it('extracts ADD marker with count', () => {
    const plan = `<Section gumdrop="features">\n  {/* TASK-3 [ADD]: 2 nighttime drink flavors */}\n</Section>`
    const markers = parseScopeMarkers(plan)
    expect(markers).toHaveLength(1)
    expect(markers[0].type).toBe('add')
    expect(markers[0].taskNumber).toBe(3)
    expect(markers[0].addCount).toBe(2)
    expect(markers[0].section).toBe('features')
  })

  it('extracts PRESERVED marker with count', () => {
    const plan = `<Section gumdrop="features">\n  {/* EXISTING 8 flavors PRESERVED */}\n</Section>`
    const markers = parseScopeMarkers(plan)
    expect(markers).toHaveLength(1)
    expect(markers[0].type).toBe('preserved')
    expect(markers[0].preservedCount).toBe(8)
    expect(markers[0].section).toBe('features')
  })

  it('extracts NO CHANGES marker', () => {
    const plan = `<Screen name="store">\n  {/* NO CHANGES for task-3 */}\n</Screen>`
    const markers = parseScopeMarkers(plan)
    expect(markers).toHaveLength(1)
    expect(markers[0].type).toBe('no-changes')
    expect(markers[0].taskNumber).toBe(3)
    expect(markers[0].section).toBe('store')
  })

  it('returns empty for plan without markers', () => {
    const plan = `<App><Screen name="home"><Section gumdrop="hero" /></Screen></App>`
    expect(parseScopeMarkers(plan)).toHaveLength(0)
  })
})

// ============================================================================
// UNIT TESTS — countHeuristicItems
// ============================================================================

describe('countHeuristicItems', () => {
  it('counts repeated JSX components', () => {
    expect(countHeuristicItems(makeCardsSource(8))).toBe(8)
  })

  it('counts array data items', () => {
    const src = `const items = [\n  { id: 1, name: 'A' },\n  { id: 2, name: 'B' },\n  { id: 3, name: 'C' },\n]`
    expect(countHeuristicItems(src)).toBe(3)
  })

  it('returns 0 for empty content', () => {
    expect(countHeuristicItems('')).toBe(0)
  })
})

// ============================================================================
// INTEGRATION TESTS — scopeValidationGate
// ============================================================================

describe('scopeValidationGate', () => {
  const CWD = '/project'

  it('1. passes when no plan.tsx exists', async () => {
    const fs = mockFS({
      [`${CWD}/src/App.tsx`]: 'export default function App() {}',
    })
    const result = await scopeValidationGate.check(fs, CWD)
    expect(result.pass).toBe(true)
    expect(result.feedback).toBeUndefined()
  })

  it('2. passes when plan has no markers', async () => {
    const plan = `import { App, Screen, Section } from '@wiggum/planning'\nexport default (\n<App name="test"><Screen name="home"><Section gumdrop="hero" /></Screen></App>\n)`
    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/App.tsx`]: 'export default function App() {}',
    })
    const result = await scopeValidationGate.check(fs, CWD)
    expect(result.pass).toBe(true)
  })

  it('3. ADD 2 — source count increases by 2 → pass', async () => {
    const plan = `<Section gumdrop="features">\n  {/* TASK-3 [ADD]: 2 new items */}\n</Section>`
    const preContent = makeCardsSource(8)
    const currentContent = makeCardsSource(10)

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Features.tsx`]: currentContent,
    })

    const git = mockGit({
      'task-3-pre': { 'src/Features.tsx': preContent },
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
  })

  it('4. ADD 2 — source count unchanged → fail', async () => {
    const plan = `<Section gumdrop="features">\n  {/* TASK-3 [ADD]: 2 new items */}\n</Section>`
    const content = makeCardsSource(8)

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Features.tsx`]: content,
    })

    const git = mockGit({
      'task-3-pre': { 'src/Features.tsx': content },
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(false)
    expect(result.feedback).toContain('ADD')
    expect(result.feedback).toContain('unchanged')
  })

  it('5. PRESERVED 8 — current has 8 → pass', async () => {
    const plan = `<Section gumdrop="features">\n  {/* TASK-3 [ADD]: 1 new item */}\n  {/* EXISTING 8 items PRESERVED */}\n</Section>`
    const currentContent = makeCardsSource(9) // 8 preserved + 1 added

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Features.tsx`]: currentContent,
    })

    const git = mockGit({
      'task-3-pre': { 'src/Features.tsx': makeCardsSource(8) },
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
  })

  it('6. PRESERVED 8 — current has 6 → fail', async () => {
    const plan = `<Section gumdrop="features">\n  {/* EXISTING 8 items PRESERVED */}\n</Section>`
    const currentContent = makeCardsSource(6)

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Features.tsx`]: currentContent,
    })

    const result = await scopeValidationGate.check(fs, CWD)
    expect(result.pass).toBe(false)
    expect(result.feedback).toContain('PRESERVED violation')
    expect(result.feedback).toContain('8')
    expect(result.feedback).toContain('6')
  })

  it('7. NO CHANGES — source file unmodified → pass', async () => {
    const plan = `<Screen name="store">\n  {/* NO CHANGES for task-3 */}\n</Screen>`
    const content = 'export default function Store() { return <div>Store</div> }'

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Store.tsx`]: content,
    })

    const git = mockGit({
      'task-3-pre': { 'src/Store.tsx': content },
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
    expect(result.feedback).toBeUndefined()
  })

  it('8. NO CHANGES — source file modified → pass with warning', async () => {
    const plan = `<Screen name="store">\n  {/* NO CHANGES for task-3 */}\n</Screen>`
    const preContent = 'export default function Store() { return <div>Store</div> }'
    const currentContent = 'export default function Store() { return <div>Store v2</div> }'

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Store.tsx`]: currentContent,
    })

    const git = mockGit({
      'task-3-pre': { 'src/Store.tsx': preContent },
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
    expect(result.feedback).toContain('NO CHANGES')
    expect(result.feedback).toContain('modified')
  })

  it('9. pre-tag does not exist — graceful degradation → pass', async () => {
    const plan = `<Section gumdrop="features">\n  {/* TASK-5 [ADD]: 2 new items */}\n</Section>`
    const currentContent = makeCardsSource(10)

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/Features.tsx`]: currentContent,
    })

    // Git has no task-5-pre tag
    const git = mockGit({})

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
  })

  it('10. section source file not found → pass with warning', async () => {
    const plan = `<Section gumdrop="nonexistent-widget">\n  {/* TASK-3 [ADD]: 2 new items */}\n</Section>`

    const fs = mockFS({
      [`${CWD}/.ralph/plan.tsx`]: plan,
      [`${CWD}/src/App.tsx`]: 'export default function App() {}',
    })

    const git = mockGit({
      'task-3-pre': {},
    })

    const context: GateContext = { git: git as unknown as GateContext['git'] }
    const result = await scopeValidationGate.check(fs, CWD, context)
    expect(result.pass).toBe(true)
    expect(result.feedback).toContain('Source file not found')
  })
})
