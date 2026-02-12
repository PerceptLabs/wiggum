import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs/LightningFSAdapter'
import { ShellExecutor } from '../executor'
import { registerAllCommands } from '../commands'

describe('ShellExecutor', () => {
  let fs: LightningFSAdapter
  let executor: ShellExecutor

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-shell-' + Date.now(), { wipe: true })
    // Set up test files
    await fs.mkdir('/project/src', { recursive: true })
    await fs.writeFile('/project/src/App.tsx', 'export default function App() {}')
    await fs.writeFile('/project/existing.txt', 'file content')

    executor = new ShellExecutor(fs)
    registerAllCommands(executor)
  })

  // === Existing behavior (must not break) ===

  describe('pipes', () => {
    it('flows stdout through pipeline', async () => {
      const result = await executor.execute('cat src/App.tsx | grep "export"', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('export')
    })
  })

  describe('redirect', () => {
    it('writes stdout to file', async () => {
      // Note: Wiggum harness only allows .tsx, .ts, .css, .json in src/
      await executor.execute('echo "test" > src/out.json', '/project')
      const content = await fs.readFile('/project/src/out.json', { encoding: 'utf8' })
      expect(content).toContain('test')
    })
  })

  describe('&& chains', () => {
    it('runs second command on success', async () => {
      const result = await executor.execute('echo "a" && echo "b"', '/project')
      expect(result.stdout).toContain('b')
    })

    it('skips second command on failure', async () => {
      const result = await executor.execute('cat missing.txt && echo "b"', '/project')
      expect(result.stdout).not.toContain('b')
      expect(result.exitCode).toBe(1)
    })
  })

  // === New behavior ===

  describe('cat -q flag', () => {
    it('returns exitCode 1 with empty stderr for missing file', async () => {
      const result = await executor.execute('cat -q missing.txt', '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('')
    })

    it('returns content for existing file', async () => {
      const result = await executor.execute('cat -q existing.txt', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('file content')
    })
  })

  describe('|| operator', () => {
    it('runs fallback on failure', async () => {
      const result = await executor.execute(
        'cat -q missing.txt || echo "fallback"',
        '/project'
      )
      expect(result.stdout).toContain('fallback')
    })

    it('skips fallback on success', async () => {
      const result = await executor.execute(
        'cat -q existing.txt || echo "fallback"',
        '/project'
      )
      expect(result.stdout).not.toContain('fallback')
      expect(result.stdout).toContain('file content')
    })
  })

  describe('replace -w flag', () => {
    beforeEach(async () => {
      // Note: Wiggum harness only allows .tsx, .ts, .css, .json in src/
      await fs.writeFile('/project/src/test.tsx', 'hello   world')
    })

    it('matches with flexible whitespace', async () => {
      const result = await executor.execute(
        'replace -w src/test.tsx "hello world" "hi"',
        '/project'
      )
      expect(result.exitCode).toBe(0)
      const content = await fs.readFile('/project/src/test.tsx', { encoding: 'utf8' })
      expect(content).toBe('hi')
    })

    it('handles multiple whitespace variations', async () => {
      await fs.writeFile('/project/src/multi.tsx', 'foo  bar\nfoo   bar\nfoo bar')
      const result = await executor.execute(
        'replace -w src/multi.tsx "foo bar" "baz"',
        '/project'
      )
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Replaced 3 occurrences')
      const content = await fs.readFile('/project/src/multi.tsx', { encoding: 'utf8' })
      expect(content).toBe('baz\nbaz\nbaz')
    })
  })

  describe('grep context flags', () => {
    beforeEach(async () => {
      await fs.writeFile('/project/src/App.tsx', [
        'import React from "react"',
        'import { Card } from "@wiggum/stack"',
        '',
        'export default function App() {',
        '  const [count, setCount] = React.useState(0)',
        '  return (',
        '    <Card>',
        '      <h1>Hello</h1>',
        '      <p>Count: {count}</p>',
        '    </Card>',
        '  )',
        '}',
      ].join('\n'))
    })

    it('parses -A flag and shows lines after match', async () => {
      const result = await executor.execute('grep -A 2 "import React" src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('import React')
      expect(result.stdout).toContain('import { Card }')
    })

    it('parses -B flag and shows lines before match', async () => {
      const result = await executor.execute('grep -B 1 "export default" src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('export default')
    })

    it('parses -C flag and shows context both directions', async () => {
      const result = await executor.execute('grep -C 1 "useState" src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('useState')
      // Should include at least surrounding lines
      expect(result.stdout).toContain('export default')
      expect(result.stdout).toContain('return')
    })

    it('parses combined form -A2', async () => {
      const result = await executor.execute('grep -A2 "import React" src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('import React')
      expect(result.stdout).toContain('import { Card }')
    })

    it('does not treat -A argument as filename', async () => {
      const result = await executor.execute('grep -A 5 "import" src/App.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stderr).not.toContain('5: No such file')
      expect(result.stdout).toContain('import React')
    })
  })

  describe('shell quoting', () => {
    it('handles single quotes inside double quotes', async () => {
      await fs.writeFile('/project/src/test.tsx', "const x = 'detail'\nconst y = 'gallery'")
      const result = await executor.execute('grep "x = \'detail\'" src/test.tsx', '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("x = 'detail'")
    })
  })

  describe('combined operators', () => {
    it('handles && followed by ||', async () => {
      // cat missing fails → && echo skipped → || echo runs
      const result = await executor.execute(
        'cat missing.txt && echo "yes" || echo "no"',
        '/project'
      )
      expect(result.stdout).toContain('no')
      expect(result.stdout).not.toContain('yes')
    })

    it('handles success case with && followed by ||', async () => {
      // cat exists succeeds → && echo runs → || echo skipped
      const result = await executor.execute(
        'cat existing.txt && echo "yes" || echo "no"',
        '/project'
      )
      expect(result.stdout).toContain('yes')
      expect(result.stdout).not.toContain('no')
    })
  })
})
