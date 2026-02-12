import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs/LightningFSAdapter'
import { ShellExecutor } from '../executor'
import { registerAllCommands } from '../commands'

describe('New Shell Commands', () => {
  let fs: LightningFSAdapter
  let executor: ShellExecutor

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-new-cmds-' + Date.now(), { wipe: true })
    await fs.mkdir('/project/src', { recursive: true })
    await fs.mkdir('/project/src/sections', { recursive: true })
    await fs.writeFile('/project/src/App.tsx', 'export default function App() {\n  return <div>Hello</div>\n}\n')
    await fs.writeFile('/project/src/index.css', ':root {\n  --primary: blue;\n}\n')
    await fs.writeFile('/project/src/sections/Hero.tsx', 'export function Hero() {\n  return <h1>Hero</h1>\n}\n')

    executor = new ShellExecutor(fs)
    registerAllCommands(executor)
  })

  // === true / false ===

  describe('true', () => {
    it('exits with code 0', async () => {
      const result = await executor.execute('true', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
    })
  })

  describe('false', () => {
    it('exits with code 1', async () => {
      const result = await executor.execute('false', '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
    })
  })

  describe('|| true chaining', () => {
    it('recovers from failure with || true', async () => {
      const result = await executor.execute('cat missing.txt || true', '/project')
      expect(result.exitCode).toBe(0)
    })
  })

  // === basename / dirname ===

  describe('basename', () => {
    it('extracts filename from path', async () => {
      const result = await executor.execute('basename src/sections/Hero.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('Hero.tsx')
    })

    it('removes suffix', async () => {
      const result = await executor.execute('basename src/sections/Hero.tsx .tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('Hero')
    })

    it('reads from stdin', async () => {
      const result = await executor.execute('echo "src/sections/Hero.tsx" | basename', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('Hero.tsx')
    })
  })

  describe('dirname', () => {
    it('extracts directory from path', async () => {
      const result = await executor.execute('dirname src/sections/Hero.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('src/sections')
    })

    it('returns . for bare filename', async () => {
      const result = await executor.execute('dirname App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('.')
    })
  })

  // === tac ===

  describe('tac', () => {
    it('reverses lines from file', async () => {
      const result = await executor.execute('tac src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.trim().split('\n')
      expect(lines[0]).toBe('}')
      expect(lines[lines.length - 1]).toBe('export default function App() {')
    })

    it('reverses piped input', async () => {
      const result = await executor.execute('echo "a\nb\nc" | tac', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('c\nb\na')
    })
  })

  // === stat ===

  describe('stat', () => {
    it('shows file info', async () => {
      const result = await executor.execute('stat src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('File: App.tsx')
      expect(result.stdout).toContain('regular file')
    })

    it('fails on missing file', async () => {
      const result = await executor.execute('stat missing.txt', '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })
  })

  // === sed (Layer 1 — standard) ===

  describe('sed', () => {
    it('substitutes first match per line', async () => {
      const result = await executor.execute("echo \"hello hello\" | sed 's/hello/world/'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('world hello\n')
    })

    it('substitutes globally with /g', async () => {
      const result = await executor.execute("echo \"hello hello\" | sed 's/hello/world/g'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('world world\n')
    })

    it('substitutes case-insensitive with /i', async () => {
      const result = await executor.execute("echo \"Hello HELLO\" | sed 's/hello/world/gi'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('world world\n')
    })

    it('in-place edit with -i', async () => {
      await executor.execute("sed -i 's/Hello/Goodbye/' src/App.tsx", '/project')
      const content = await fs.readFile('/project/src/App.tsx', { encoding: 'utf8' })
      expect(content).toContain('Goodbye')
      expect(content).not.toContain('Hello')
    })

    it('prints line range with -n and p', async () => {
      await fs.writeFile('/project/src/data.ts', 'line1\nline2\nline3\nline4\nline5\n')
      const result = await executor.execute("sed -n '2,4p' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('line2\nline3\nline4')
    })

    it('deletes a specific line', async () => {
      await fs.writeFile('/project/src/data.ts', 'aaa\nbbb\nccc\n')
      const result = await executor.execute("sed '2d' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain('bbb')
      expect(result.stdout).toContain('aaa')
      expect(result.stdout).toContain('ccc')
    })

    it('deletes lines matching pattern', async () => {
      await fs.writeFile('/project/src/data.ts', 'keep\nremove this\nkeep\n')
      const result = await executor.execute("sed '/remove/d' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain('remove')
      expect(result.stdout.trim().split('\n')).toEqual(['keep', 'keep'])
    })

    it('line-scoped substitution', async () => {
      await fs.writeFile('/project/src/data.ts', 'aaa\nbbb\nccc\n')
      const result = await executor.execute("sed '2s/bbb/xxx/' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('xxx')
      expect(result.stdout).not.toContain('bbb')
    })

    it('pattern-scoped substitution', async () => {
      await fs.writeFile('/project/src/data.ts', 'foo bar\nbaz bar\nqux bar\n')
      const result = await executor.execute("sed '/baz/s/bar/quux/' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      // Only the line matching /baz/ should have substitution
      const lines = result.stdout.trim().split('\n')
      expect(lines[0]).toBe('foo bar')
      expect(lines[1]).toBe('baz quux')
      expect(lines[2]).toBe('qux bar')
    })

    it('uses alternate delimiters', async () => {
      const result = await executor.execute("echo \"path/old/file\" | sed 's|path/old|path/new|'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('path/new/file')
    })

    it('prints to end with $', async () => {
      await fs.writeFile('/project/src/data.ts', 'line1\nline2\nline3\nline4\n')
      const result = await executor.execute("sed -n '3,$p' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('line3\nline4')
    })

    it('pattern range print', async () => {
      await fs.writeFile('/project/src/data.ts', 'before\nSTART\nmiddle\nEND\nafter\n')
      const result = await executor.execute("sed -n '/START/,/END/p' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.trim().split('\n')
      expect(lines).toEqual(['START', 'middle', 'END'])
    })

    it('whitespace-tolerant matching with -w', async () => {
      await fs.writeFile('/project/src/data.ts', 'const   foo  =  bar\n')
      const result = await executor.execute("sed -w 's/const foo = bar/const foo = baz/' src/data.ts", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('const foo = baz')
    })
  })

  // === cut ===

  describe('cut', () => {
    it('extracts fields by delimiter', async () => {
      const result = await executor.execute("echo \"a,b,c,d\" | cut -d, -f1,3", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('a,c')
    })

    it('extracts character range', async () => {
      const result = await executor.execute("echo \"hello\" | cut -c1-3", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('hel')
    })
  })

  // === tr ===

  describe('tr', () => {
    it('translates characters', async () => {
      const result = await executor.execute("echo \"hello\" | tr 'helo' 'HELO'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('HELLO')
    })

    it('deletes characters with -d', async () => {
      const result = await executor.execute("echo \"hello world\" | tr -d 'lo'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('he wrd')
    })

    it('squeezes repeated characters with -s', async () => {
      const result = await executor.execute("echo \"aabbcc\" | tr -s 'abc'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('abc')
    })

    it('handles POSIX classes', async () => {
      const result = await executor.execute("echo \"hello\" | tr '[:lower:]' '[:upper:]'", '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('HELLO')
    })
  })

  // === which ===

  describe('which', () => {
    it('finds known commands', async () => {
      const result = await executor.execute('which grep', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('grep: shell built-in')
    })

    it('reports unknown commands', async () => {
      const result = await executor.execute('which npm', '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain('npm: not found')
    })
  })

  // === date ===

  describe('date', () => {
    it('outputs current date', async () => {
      const result = await executor.execute('date', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.length).toBeGreaterThan(10)
    })

    it('formats with specifiers', async () => {
      const result = await executor.execute('date +%Y', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toMatch(/^\d{4}$/)
    })
  })

  // === env / whoami / clear ===

  describe('env', () => {
    it('lists environment variables', async () => {
      const result = await executor.execute('env', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('USER=ralph')
      expect(result.stdout).toContain('SHELL=wiggum')
      expect(result.stdout).toContain('PWD=/project')
    })
  })

  describe('whoami', () => {
    it('returns ralph', async () => {
      const result = await executor.execute('whoami', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('ralph')
    })
  })

  describe('clear', () => {
    it('outputs __CLEAR__ marker', async () => {
      const result = await executor.execute('clear', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('__CLEAR__')
    })
  })

  // === Crash guards (Step 0H) ===

  describe('crash guards', () => {
    it('handles empty command gracefully', async () => {
      const result = await executor.execute('', '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('empty or invalid')
    })
  })
})
