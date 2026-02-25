import { describe, it, expect, vi } from 'vitest'
import { QUALITY_GATES } from '../gates'
import { formatThemeCss } from '../../theme-generator/generator'
import { getPreset } from '../../theme-generator/index'
import type { JSRuntimeFS, StatResult } from '../../fs/types'

// Mock filesystem helper — same pattern as skills.test.ts
function createMockFS(files: Record<string, string>): JSRuntimeFS {
  return {
    readFile: vi.fn(async (path: string) => {
      if (files[path] === undefined) {
        throw new Error(`ENOENT: no such file or directory: ${path}`)
      }
      return files[path]
    }),
    writeFile: vi.fn(),
    readdir: vi.fn(async () => []),
    mkdir: vi.fn(),
    stat: vi.fn(async (path: string) => {
      if (files[path] !== undefined) {
        return {
          type: 'file',
          mode: 0o644,
          size: files[path].length,
          ino: 1,
          mtimeMs: Date.now(),
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
        } as StatResult
      }
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    rename: vi.fn(),
    symlink: vi.fn(),
    lstat: vi.fn(),
  } as unknown as JSRuntimeFS
}

function findGate(name: string) {
  const gate = QUALITY_GATES.find(g => g.name === name)
  if (!gate) throw new Error(`Gate "${name}" not found`)
  return gate
}

describe('css-theme-complete gate', () => {
  const gate = findGate('css-theme-complete')

  it('passes with valid CSS containing all 36 vars + .dark block', async () => {
    const result = getPreset('mono')!
    const css = formatThemeCss(result.theme)
    const fs = createMockFS({ '/cwd/src/index.css': css })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('fails when vars missing -- prefix (pre-fix failure mode)', async () => {
    // Simulate the bug: write CSS without -- prefix
    const badCss = `:root {
  background: oklch(0.98 0.004 200);
  foreground: oklch(0.21 0.015 200);
}
.dark {
  background: oklch(0.02 0.004 200);
}`
    const fs = createMockFS({ '/cwd/src/index.css': badCss })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('Missing')
  })

  it('fails when .dark block missing', async () => {
    const css = `:root {
  --background: oklch(0.98 0.004 200);
  --foreground: oklch(0.21 0.015 200);
  --card: oklch(0.99 0.002 200);
  --card-foreground: oklch(0.21 0.015 200);
  --popover: oklch(0.99 0.002 200);
  --popover-foreground: oklch(0.21 0.015 200);
  --primary: oklch(0.56 0.195 200);
  --primary-foreground: oklch(0.985 0.002 200);
  --secondary: oklch(0.61 0.115 200);
  --secondary-foreground: oklch(0.985 0.002 200);
  --muted: oklch(0.90 0.02 200);
  --muted-foreground: oklch(0.475 0.02 200);
  --accent: oklch(0.815 0.095 200);
  --accent-foreground: oklch(0.21 0.015 200);
  --destructive: oklch(0.60 0.215 25);
  --destructive-foreground: oklch(0.985 0.002 200);
  --border: oklch(0.885 0.007 200);
  --input: oklch(0.885 0.007 200);
  --ring: oklch(0.56 0.195 200);
  --sidebar-background: oklch(0.98 0.004 200);
  --sidebar-foreground: oklch(0.21 0.015 200);
  --sidebar-primary: oklch(0.56 0.195 200);
  --sidebar-primary-foreground: oklch(0.985 0.002 200);
  --sidebar-accent: oklch(0.815 0.095 200);
  --sidebar-accent-foreground: oklch(0.21 0.015 200);
  --sidebar-border: oklch(0.885 0.007 200);
  --sidebar-ring: oklch(0.56 0.195 200);
  --chart-1: oklch(0.56 0.195 200);
  --chart-2: oklch(0.61 0.115 200);
  --chart-3: oklch(0.815 0.095 200);
  --chart-4: oklch(0.55 0.15 200);
  --chart-5: oklch(0.50 0.20 200);
}`
    const fs = createMockFS({ '/cwd/src/index.css': css })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('.dark')
  })

  it('fails when CSS file missing entirely', async () => {
    const fs = createMockFS({})
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('Missing src/index.css')
  })

  it('integration: passes against formatThemeCss(getPreset("elegant-luxury"))', async () => {
    // This is the exact roundtrip that was failing before the -- prefix fix
    const result = getPreset('elegant-luxury')!
    const css = formatThemeCss(result.theme)
    const fs = createMockFS({ '/cwd/src/index.css': css })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })
})

describe('app-exists gate', () => {
  const gate = findGate('app-exists')

  it('passes when src/App.tsx exists', async () => {
    const fs = createMockFS({ '/cwd/src/App.tsx': 'export default function App() { return <div>Hello</div> }' })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('fails when src/App.tsx missing', async () => {
    const fs = createMockFS({})
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('Missing src/App.tsx')
  })
})

describe('css-no-tailwind-directives gate', () => {
  const gate = findGate('css-no-tailwind-directives')

  it('passes with normal CSS', async () => {
    const fs = createMockFS({ '/cwd/src/index.css': ':root { --background: white; }' })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('fails with @tailwind base', async () => {
    const fs = createMockFS({ '/cwd/src/index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;' })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('@tailwind')
  })
})

describe('app-has-content gate', () => {
  const gate = findGate('app-has-content')

  it('passes with real component using @wiggum/stack', async () => {
    const content = `import { Button, Card, Text } from '@wiggum/stack'
export default function App() {
  return <Card><Text>Hello</Text><Button>Click</Button></Card>
}`
    const fs = createMockFS({ '/cwd/src/App.tsx': content })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('fails with unchanged scaffold text', async () => {
    const scaffold = `export default function App() {
  return <div><p>Edit src/App.tsx to get started.</p></div>
}`
    const fs = createMockFS({ '/cwd/src/App.tsx': scaffold })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('default scaffold')
  })
})

describe('has-summary gate', () => {
  const gate = findGate('has-summary')

  it('passes with 20+ char summary', async () => {
    const fs = createMockFS({ '/cwd/.ralph/summary.md': 'Built a landing page with hero section and features grid.' })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('fails with empty summary', async () => {
    const fs = createMockFS({ '/cwd/.ralph/summary.md': '' })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
  })

  it('fails when summary file missing', async () => {
    const fs = createMockFS({})
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
  })
})

describe('plan-valid gate removal', () => {
  it('does not include plan-valid gate (moved to loop phase handler)', () => {
    const gateNames = QUALITY_GATES.map(g => g.name)
    expect(gateNames).not.toContain('plan-valid')
  })

  it('still includes plan-diff gate (informational, runs during BUILD)', () => {
    const gateNames = QUALITY_GATES.map(g => g.name)
    expect(gateNames).toContain('plan-diff')
  })
})

// Skipped gates:
// - build-succeeds: requires esbuild-wasm which is a heavy dependency not suitable for unit tests
// - runtime-errors: requires browser context (errorCollector from preview iframe)
// - console-capture: informational only, always passes
// - rendered-structure: reads snapshot file from disk, informational only
