import { describe, it, expect, vi } from 'vitest'
import { noHardcodedColorsGate, TW_COLOR_RE, RAW_COLOR_RE, HEX_RE } from '../color-gate'
import type { JSRuntimeFS, StatResult } from '../../fs/types'

/**
 * Build a mock FS that supports recursive directory scanning.
 * Files live under /cwd/src/. Keys are relative to /cwd/src/ (e.g. 'App.tsx').
 */
function createScanFS(srcFiles: Record<string, string>): JSRuntimeFS {
  // Build directory listing map
  const dirs = new Map<string, string[]>()
  dirs.set('/cwd/src', [])

  for (const relPath of Object.keys(srcFiles)) {
    const parts = relPath.split('/')
    // Register each intermediate directory
    let current = '/cwd/src'
    for (let i = 0; i < parts.length - 1; i++) {
      const next = `${current}/${parts[i]}`
      const entries = dirs.get(current) ?? []
      if (!entries.includes(parts[i])) entries.push(parts[i])
      dirs.set(current, entries)
      if (!dirs.has(next)) dirs.set(next, [])
      current = next
    }
    // Register file in its parent
    const fileName = parts[parts.length - 1]
    const parentEntries = dirs.get(current) ?? []
    if (!parentEntries.includes(fileName)) parentEntries.push(fileName)
    dirs.set(current, parentEntries)
  }

  const fullPaths = new Set(
    Object.keys(srcFiles).map(r => `/cwd/src/${r}`)
  )
  const dirPaths = new Set(dirs.keys())

  return {
    readFile: vi.fn(async (path: string) => {
      const rel = path.replace('/cwd/src/', '')
      if (srcFiles[rel] !== undefined) return srcFiles[rel]
      throw new Error(`ENOENT: ${path}`)
    }),
    readdir: vi.fn(async (path: string) => {
      if (dirs.has(path)) return dirs.get(path)!
      throw new Error(`ENOENT: ${path}`)
    }),
    stat: vi.fn(async (path: string) => {
      if (dirPaths.has(path)) {
        return {
          type: 'dir', mode: 0o755, size: 0, ino: 1, mtimeMs: Date.now(),
          isFile: () => !dirs.has(path) || fullPaths.has(path) ? false : false,
          isDirectory: () => true,
          isSymbolicLink: () => false,
        } as unknown as StatResult
      }
      if (fullPaths.has(path)) {
        return {
          type: 'file', mode: 0o644, size: 100, ino: 1, mtimeMs: Date.now(),
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
        } as unknown as StatResult
      }
      throw new Error(`ENOENT: ${path}`)
    }),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    rename: vi.fn(),
    symlink: vi.fn(),
    lstat: vi.fn(),
  } as unknown as JSRuntimeFS
}

describe('noHardcodedColorsGate', () => {
  const gate = noHardcodedColorsGate

  it('catches Tailwind color utilities (text-lime-400)', async () => {
    const fs = createScanFS({
      'App.tsx': 'export default () => <div className="text-lime-400">hi</div>',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('text-lime-400')
  })

  it('catches Tailwind bg color with opacity (bg-cyan-500)', async () => {
    const fs = createScanFS({
      'Card.tsx': 'export const Card = () => <div className="bg-cyan-500/20" />',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('bg-cyan-500')
  })

  it('catches raw oklch() values', async () => {
    const fs = createScanFS({
      'Box.tsx': 'const style = { color: "oklch(0.85 0.22 145)" }',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('oklch(0.85 0.22 145)')
  })

  it('catches raw hsl() values', async () => {
    const fs = createScanFS({
      'Box.tsx': 'const shadow = "0 2px 8px hsl(145 100% 50% / 0.4)"',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('hsl(145 100% 50% / 0.4)')
  })

  it('catches hex color literals', async () => {
    const fs = createScanFS({
      'Theme.tsx': 'const color = "#ff0000"',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(false)
    expect(r.feedback).toContain('#ff0000')
  })

  it('passes with semantic token classes (text-primary, bg-accent)', async () => {
    const fs = createScanFS({
      'App.tsx': 'export default () => <div className="text-primary bg-accent border-muted">ok</div>',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('passes with success/warning semantic tokens', async () => {
    const fs = createScanFS({
      'Badge.tsx': 'export const B = () => <span className="bg-success text-success-foreground">ok</span>',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('passes with extended color names (bg-grape, text-ocean)', async () => {
    const fs = createScanFS({
      'Chart.tsx': 'export const C = () => <div className="bg-grape text-ocean-foreground">data</div>',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('passes with white/black (neutral extremes)', async () => {
    const fs = createScanFS({
      'Dialog.tsx': 'export const D = () => <div className="text-white bg-black/80">modal</div>',
    })
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })

  it('passes with empty or missing src/', async () => {
    // No files at all — readdir throws
    const fs = {
      readFile: vi.fn(async () => { throw new Error('ENOENT') }),
      readdir: vi.fn(async () => { throw new Error('ENOENT') }),
      stat: vi.fn(async () => { throw new Error('ENOENT') }),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
      rmdir: vi.fn(),
      rename: vi.fn(),
      symlink: vi.fn(),
      lstat: vi.fn(),
    } as unknown as JSRuntimeFS
    const r = await gate.check(fs, '/cwd')
    expect(r.pass).toBe(true)
  })
})

describe('regex patterns', () => {
  it('TW_COLOR_RE matches shade patterns', () => {
    expect('text-red-500'.match(TW_COLOR_RE)).toBeTruthy()
    expect('bg-lime-400'.match(TW_COLOR_RE)).toBeTruthy()
    expect('border-slate-200'.match(TW_COLOR_RE)).toBeTruthy()
    expect('from-purple-900'.match(TW_COLOR_RE)).toBeTruthy()
  })

  it('TW_COLOR_RE does not match semantic classes', () => {
    expect('text-primary'.match(TW_COLOR_RE)).toBeFalsy()
    expect('bg-accent'.match(TW_COLOR_RE)).toBeFalsy()
    expect('border-muted'.match(TW_COLOR_RE)).toBeFalsy()
    expect('bg-success'.match(TW_COLOR_RE)).toBeFalsy()
  })

  it('RAW_COLOR_RE matches color functions', () => {
    expect('oklch(0.5 0.2 180)'.match(RAW_COLOR_RE)).toBeTruthy()
    expect('hsl(180 50% 50%)'.match(RAW_COLOR_RE)).toBeTruthy()
    expect('rgb(255, 0, 0)'.match(RAW_COLOR_RE)).toBeTruthy()
    expect('rgba(0,0,0,0.5)'.match(RAW_COLOR_RE)).toBeTruthy()
  })

  it('HEX_RE matches hex in value context', () => {
    expect('"#ff0000"'.match(HEX_RE)).toBeTruthy()
    expect("'#abc'".match(HEX_RE)).toBeTruthy()
    expect(': #123456'.match(HEX_RE)).toBeTruthy()
  })
})
