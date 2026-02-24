import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs/LightningFSAdapter'
import { ShellExecutor } from '../executor'
import { registerAllCommands } from '../commands'

describe('replace command', () => {
  let fs: LightningFSAdapter
  let executor: ShellExecutor

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-replace-' + Date.now(), { wipe: true })
    await fs.mkdir('/project/src', { recursive: true })
    await fs.writeFile(
      '/project/src/App.tsx',
      'export default function App() {\n  return <div>Hello</div>\n}\n',
    )

    executor = new ShellExecutor(fs)
    registerAllCommands(executor)
  })

  // ========================================================================
  // LINE MODE
  // ========================================================================

  describe('--line mode', () => {
    it('replaces a specific line by number', async () => {
      const result = await executor.execute(
        'replace src/App.tsx --line 2 "  return <div>World</div>"',
        '/project',
      )
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Replaced line 2')

      const content = await fs.readFile('/project/src/App.tsx', { encoding: 'utf8' })
      const lines = (content as string).split('\n')
      expect(lines[1]).toBe('  return <div>World</div>')
      // Other lines unchanged
      expect(lines[0]).toBe('export default function App() {')
    })

    it('returns error for line out of range', async () => {
      const result = await executor.execute(
        'replace src/App.tsx --line 99 "new content"',
        '/project',
      )
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('out of range')
      expect(result.stderr).toContain('99')
    })

    it('returns error for line 0', async () => {
      const result = await executor.execute(
        'replace src/App.tsx --line 0 "new content"',
        '/project',
      )
      expect(result.exitCode).toBe(1)
      // Zod .positive() catches 0 before execute() runs
      expect(result.stderr).toContain('too_small')
    })

    it('returns error for missing file', async () => {
      const result = await executor.execute(
        'replace src/Missing.tsx --line 1 "new content"',
        '/project',
      )
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })
  })

  // ========================================================================
  // STRING MODE (regression)
  // ========================================================================

  describe('string mode', () => {
    it('replaces exact string matches', async () => {
      const result = await executor.execute(
        'replace src/App.tsx "Hello" "Goodbye"',
        '/project',
      )
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Replaced 1 occurrence')

      const content = await fs.readFile('/project/src/App.tsx', { encoding: 'utf8' })
      expect(content).toContain('Goodbye')
      expect(content).not.toContain('Hello')
    })
  })

  // ========================================================================
  // USAGE ERROR
  // ========================================================================

  describe('usage error', () => {
    it('returns error when no old string and no --line', async () => {
      const result = await executor.execute('replace src/App.tsx', '/project')
      // CLI path: parseCliArgs produces old: '' → Zod .min(1) rejects
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBeTruthy()
    })
  })
})
