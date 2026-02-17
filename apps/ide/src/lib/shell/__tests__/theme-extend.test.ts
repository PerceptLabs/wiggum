import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleExtend, generateExtendedColor, parseExtendedNames } from '../../shell/commands/theme-extend'
import { contrastRatio } from '../../theme-generator/oklch'
import type { JSRuntimeFS, StatResult } from '../../fs/types'
import type { ShellOptions } from '../../shell/types'

// ============================================================================
// Mock FS with read-patch-write support
// ============================================================================

function createMockFS(files: Record<string, string> = {}): JSRuntimeFS {
  const store = { ...files }
  return {
    readFile: vi.fn(async (path: string) => {
      if (store[path] === undefined) throw new Error(`ENOENT: ${path}`)
      return store[path]
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      store[path] = content
    }),
    readdir: vi.fn(async () => []),
    mkdir: vi.fn(),
    stat: vi.fn(async (path: string) => {
      if (store[path] !== undefined) {
        return {
          type: 'file', mode: 0o644, size: store[path].length, ino: 1, mtimeMs: Date.now(),
          isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false,
        } as unknown as StatResult
      }
      throw new Error(`ENOENT: ${path}`)
    }),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    rename: vi.fn(),
    symlink: vi.fn(),
    lstat: vi.fn(),
  } as unknown as JSRuntimeFS
}

function makeOptions(fs: JSRuntimeFS): ShellOptions {
  return { cwd: '/project', fs, stdin: undefined }
}

/** Minimal tokens.json with a primary color for chroma reference */
const TOKENS_JSON = JSON.stringify({
  $metadata: { generator: 'wiggum-theme' },
  color: {
    primary: {
      $value: { colorSpace: 'oklch', components: [0.55, 0.18, 250] },
      $type: 'color',
      $description: 'brand accent',
      $extensions: { wiggum: { role: 'brand', cssVar: '--primary' } },
    },
  },
})

/** Minimal index.css for testing */
const INDEX_CSS = `:root {
  --background: oklch(0.98 0.002 0);
  --primary: oklch(0.55 0.18 250);
}

.dark {
  --background: oklch(0.12 0.002 0);
  --primary: oklch(0.65 0.15 250);
}

body { margin: 0; }
`

// ============================================================================
// generateExtendedColor
// ============================================================================

describe('generateExtendedColor', () => {
  it('generates valid OKLCH at specified hue', () => {
    const result = generateExtendedColor(300, 0.18, 0.55)
    expect(result.light.base.h).toBeCloseTo(300, 0)
    expect(result.dark.base.h).toBeCloseTo(300, 0)
    expect(result.light.base.l).toBeGreaterThan(0)
    expect(result.light.base.l).toBeLessThan(1)
  })

  it('achieves >= 4.5:1 contrast in light mode', () => {
    const result = generateExtendedColor(300, 0.18, 0.55)
    const cr = contrastRatio(result.light.foreground, result.light.base)
    expect(cr).toBeGreaterThanOrEqual(4.5)
  })

  it('achieves >= 4.5:1 contrast in dark mode', () => {
    const result = generateExtendedColor(300, 0.18, 0.55)
    const cr = contrastRatio(result.dark.foreground, result.dark.base)
    expect(cr).toBeGreaterThanOrEqual(4.5)
  })

  it('dark mode inverts lightness', () => {
    const result = generateExtendedColor(200, 0.15, 0.55)
    // Light base L ~0.55, dark base L ~0.45
    expect(result.dark.base.l).toBeLessThan(result.light.base.l)
  })

  it('scales chroma from primary', () => {
    const lowChroma = generateExtendedColor(200, 0.05, 0.55)
    const highChroma = generateExtendedColor(200, 0.25, 0.55)
    expect(lowChroma.light.base.c).toBeLessThan(highChroma.light.base.c)
  })
})

// ============================================================================
// handleExtend — --name --hue
// ============================================================================

describe('handleExtend', () => {
  let fs: JSRuntimeFS
  let options: ShellOptions

  beforeEach(() => {
    fs = createMockFS({
      '/project/.ralph/tokens.json': TOKENS_JSON,
      '/project/src/index.css': INDEX_CSS,
    })
    options = makeOptions(fs)
  })

  it('adds markers in both :root and .dark', async () => {
    const result = await handleExtend(['--name', 'grape', '--hue', '300'], options)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('grape')

    const css = await fs.readFile('/project/src/index.css', { encoding: 'utf8' }) as string
    expect(css).toContain('/* theme-extended: grape */')
    expect(css).toContain('/* /theme-extended: grape */')
    expect(css).toContain('--grape:')
    expect(css).toContain('--grape-foreground:')

    // Both :root and .dark should have the markers
    const rootBlock = css.split('.dark')[0]
    const darkBlock = css.split('.dark')[1]
    expect(rootBlock).toContain('--grape:')
    expect(darkBlock).toContain('--grape:')
  })

  it('patches tokens.json with extended section', async () => {
    await handleExtend(['--name', 'ocean', '--hue', '200'], options)

    const raw = await fs.readFile('/project/.ralph/tokens.json', { encoding: 'utf8' }) as string
    const tokens = JSON.parse(raw)
    expect(tokens.extended).toBeDefined()
    expect(tokens.extended.ocean).toEqual({ hue: 200 })
  })

  it('is idempotent (re-adding same name updates, not duplicates)', async () => {
    await handleExtend(['--name', 'grape', '--hue', '300'], options)
    await handleExtend(['--name', 'grape', '--hue', '310'], options)

    const css = await fs.readFile('/project/src/index.css', { encoding: 'utf8' }) as string
    const markers = css.match(/theme-extended: grape/g)
    // 2 start + 2 end markers (one in :root, one in .dark)
    expect(markers?.length).toBe(4)
  })

  it('errors on missing --name', async () => {
    const result = await handleExtend(['--hue', '300'], options)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--name')
  })

  it('errors on missing --hue', async () => {
    const result = await handleExtend(['--name', 'grape'], options)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--hue')
  })

  it('errors when no tokens.json exists', async () => {
    const emptyFS = createMockFS({
      '/project/src/index.css': INDEX_CSS,
    })
    const result = await handleExtend(['--name', 'grape', '--hue', '300'], makeOptions(emptyFS))
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('tokens.json')
  })
})

// ============================================================================
// handleExtend — --remove
// ============================================================================

describe('handleExtend --remove', () => {
  it('removes markers from CSS', async () => {
    const fs = createMockFS({
      '/project/.ralph/tokens.json': TOKENS_JSON,
      '/project/src/index.css': INDEX_CSS,
    })
    const options = makeOptions(fs)

    // Add then remove
    await handleExtend(['--name', 'grape', '--hue', '300'], options)
    const result = await handleExtend(['--remove', 'grape'], options)
    expect(result.exitCode).toBe(0)

    const css = await fs.readFile('/project/src/index.css', { encoding: 'utf8' }) as string
    expect(css).not.toContain('theme-extended: grape')
    expect(css).not.toContain('--grape:')
  })

  it('removes entry from tokens.json extended section', async () => {
    const fs = createMockFS({
      '/project/.ralph/tokens.json': TOKENS_JSON,
      '/project/src/index.css': INDEX_CSS,
    })
    const options = makeOptions(fs)

    await handleExtend(['--name', 'grape', '--hue', '300'], options)
    await handleExtend(['--remove', 'grape'], options)

    const raw = await fs.readFile('/project/.ralph/tokens.json', { encoding: 'utf8' }) as string
    const tokens = JSON.parse(raw)
    expect(tokens.extended.grape).toBeUndefined()
  })

  it('errors when name not found', async () => {
    const fs = createMockFS({
      '/project/src/index.css': INDEX_CSS,
    })
    const result = await handleExtend(['--remove', 'nonexistent'], makeOptions(fs))
    expect(result.exitCode).toBe(1)
  })
})

// ============================================================================
// handleExtend — --list
// ============================================================================

describe('handleExtend --list', () => {
  it('shows extended colors', async () => {
    const fs = createMockFS({
      '/project/.ralph/tokens.json': TOKENS_JSON,
      '/project/src/index.css': INDEX_CSS,
    })
    const options = makeOptions(fs)

    await handleExtend(['--name', 'grape', '--hue', '300'], options)
    const result = await handleExtend(['--list'], options)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('grape')
  })

  it('shows empty message when no extended colors', async () => {
    const fs = createMockFS({
      '/project/src/index.css': INDEX_CSS,
    })
    const result = await handleExtend(['--list'], makeOptions(fs))
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No extended colors')
  })
})

// ============================================================================
// parseExtendedNames
// ============================================================================

describe('parseExtendedNames', () => {
  it('extracts names from markers', () => {
    const css = `
  /* theme-extended: grape */
  --grape: oklch(0.55 0.16 300);
  /* /theme-extended: grape */
  /* theme-extended: ocean */
  --ocean: oklch(0.55 0.14 200);
  /* /theme-extended: ocean */`
    expect(parseExtendedNames(css)).toEqual(['grape', 'ocean'])
  })

  it('returns empty for no markers', () => {
    expect(parseExtendedNames(':root { --primary: oklch(0.5 0.2 250); }')).toEqual([])
  })

  it('deduplicates names', () => {
    const css = `/* theme-extended: grape */\n/* theme-extended: grape */`
    expect(parseExtendedNames(css)).toEqual(['grape'])
  })
})
