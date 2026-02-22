import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs/LightningFSAdapter'
import { Git } from '../../git'
import { SnapshotCommand } from '../commands/snapshot'
import type { ShellOptions } from '../types'

describe('SnapshotCommand', () => {
  let fs: LightningFSAdapter
  let git: Git
  let cmd: SnapshotCommand
  let options: ShellOptions

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-snapshot-' + Date.now(), { wipe: true })
    await fs.mkdir('/project/src', { recursive: true })

    git = new Git({ fs, dir: '/project' })
    await git.init()

    // Create initial file and commit so we have a valid HEAD
    await fs.writeFile('/project/src/App.tsx', 'export default function App() {}')
    await git.add('src/App.tsx')
    await git.commit({ message: 'initial commit', author: { name: 'Test', email: 'test@test.com' } })

    cmd = new SnapshotCommand()
    options = { cwd: '/project', fs, git }
  })

  // --------------------------------------------------------------------------
  // SAVE
  // --------------------------------------------------------------------------

  describe('save', () => {
    it('creates commit + tag with default message', async () => {
      // Make a change so there's something to commit
      await fs.writeFile('/project/src/App.tsx', 'export default function App() { return null }')

      const result = await cmd.execute(
        { action: 'save' },
        options
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Snapshot saved: manual-')
      expect(result.stdout).toContain('Message: manual snapshot')

      // Verify tag was created
      const tags = await git.listTags()
      expect(tags.some(t => t.startsWith('manual-'))).toBe(true)
    })

    it('saves with custom message', async () => {
      await fs.writeFile('/project/src/App.tsx', 'changed content')

      const result = await cmd.execute(
        { action: 'save', message: 'before CTA redesign' },
        options
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Message: before CTA redesign')

      // Verify commit message
      const logs = await git.log({ depth: 1 })
      expect(logs[0].commit.message).toContain('snapshot: before CTA redesign')
    })

    it('handles nothing to commit', async () => {
      // No changes since initial commit
      const result = await cmd.execute(
        { action: 'save' },
        options
      )

      // Should not fail — just report nothing to snapshot
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('nothing')
    })
  })

  // --------------------------------------------------------------------------
  // LIST
  // --------------------------------------------------------------------------

  describe('list', () => {
    it('shows snapshot tags', async () => {
      // Create two snapshots
      await fs.writeFile('/project/src/App.tsx', 'change 1')
      await git.add('.')
      await git.commit({ message: 'snapshot: first', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('manual-1000')

      await fs.writeFile('/project/src/App.tsx', 'change 2')
      await git.add('.')
      await git.commit({ message: 'snapshot: second', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('task-1-pre')

      const result = await cmd.execute({ action: 'list' }, options)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('manual-1000')
      expect(result.stdout).toContain('task-1-pre')
    })

    it('filters out non-snapshot tags', async () => {
      await fs.writeFile('/project/src/App.tsx', 'change')
      await git.add('.')
      await git.commit({ message: 'test', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('v1.0.0')
      await git.tag('manual-2000')

      const result = await cmd.execute({ action: 'list' }, options)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('manual-2000')
      expect(result.stdout).not.toContain('v1.0.0')
    })

    it('handles no snapshots', async () => {
      const result = await cmd.execute({ action: 'list' }, options)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('No snapshots found')
    })
  })

  // --------------------------------------------------------------------------
  // ROLLBACK
  // --------------------------------------------------------------------------

  describe('rollback', () => {
    it('restores to tagged state', async () => {
      // Create a snapshot
      await fs.writeFile('/project/src/App.tsx', 'original state')
      await git.add('.')
      await git.commit({ message: 'snapshot: original', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('manual-3000')

      // Make more changes
      await fs.writeFile('/project/src/App.tsx', 'modified state')
      await git.add('.')
      await git.commit({ message: 'later change', author: { name: 'Test', email: 'test@test.com' } })

      // Rollback
      const result = await cmd.execute(
        { action: 'rollback', tag: 'manual-3000' },
        options
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Restored to manual-3000')

      // Verify file is restored
      const content = await fs.readFile('/project/src/App.tsx', { encoding: 'utf8' })
      expect(content).toBe('original state')
    })

    it('rejects unknown tag', async () => {
      const result = await cmd.execute(
        { action: 'rollback', tag: 'nonexistent-tag' },
        options
      )

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not found')
    })

    it('requires tag parameter', async () => {
      const result = await cmd.execute(
        { action: 'rollback' },
        options
      )

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('tag name required')
    })
  })

  // --------------------------------------------------------------------------
  // DIFF
  // --------------------------------------------------------------------------

  describe('diff', () => {
    it('shows changes since tag', async () => {
      // Create snapshot
      await fs.writeFile('/project/src/App.tsx', 'snapshot state')
      await git.add('.')
      await git.commit({ message: 'snapshot', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('manual-4000')

      // Make committed changes
      await fs.writeFile('/project/src/App.tsx', 'modified state')
      await fs.writeFile('/project/src/New.tsx', 'new file')
      await git.add('.')
      await git.commit({ message: 'changes', author: { name: 'Test', email: 'test@test.com' } })

      const result = await cmd.execute(
        { action: 'diff', tag: 'manual-4000' },
        options
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('M src/App.tsx')
      expect(result.stdout).toContain('A src/New.tsx')
    })

    it('requires tag parameter', async () => {
      const result = await cmd.execute(
        { action: 'diff' },
        options
      )

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('tag name required')
    })

    it('reports no changes when identical', async () => {
      await git.tag('manual-5000')

      const result = await cmd.execute(
        { action: 'diff', tag: 'manual-5000' },
        options
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('No changes')
    })
  })

  // --------------------------------------------------------------------------
  // STATUS
  // --------------------------------------------------------------------------

  describe('status', () => {
    it('shows uncommitted changes count', async () => {
      // Modify a file and stage (add) but don't commit.
      // We must add('.') because fake-indexeddb doesn't track file mtime,
      // so statusMatrix's workdir column won't detect raw writes.
      // After add('.'), HEAD=1 vs STAGE=2 → detected as a change.
      await fs.writeFile('/project/src/App.tsx', 'uncommitted change')
      await git.add('.')

      const result = await cmd.execute({ action: 'status' }, options)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Uncommitted changes:')
      // Should show at least 1 uncommitted change
      expect(result.stdout).not.toContain('Uncommitted changes: 0')
    })

    it('shows snapshot count', async () => {
      // Create a snapshot tag
      await fs.writeFile('/project/src/App.tsx', 'change')
      await git.add('.')
      await git.commit({ message: 'snap', author: { name: 'Test', email: 'test@test.com' } })
      await git.tag('manual-6000')

      const result = await cmd.execute({ action: 'status' }, options)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Total snapshots: 1')
      expect(result.stdout).toContain('Latest: manual-6000')
    })
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns error when git not available', async () => {
      const noGitOptions: ShellOptions = { cwd: '/project', fs }

      const result = await cmd.execute({ action: 'status' }, noGitOptions)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('git not available')
    })
  })

  // --------------------------------------------------------------------------
  // PARSE CLI ARGS
  // --------------------------------------------------------------------------

  describe('parseCliArgs', () => {
    it('maps save with message', () => {
      const result = cmd.parseCliArgs(['save', 'before', 'CTA', 'redesign'])
      expect(result).toEqual({ action: 'save', message: 'before CTA redesign' })
    })

    it('maps save without message', () => {
      const result = cmd.parseCliArgs(['save'])
      expect(result).toEqual({ action: 'save', message: undefined })
    })

    it('maps rollback with tag', () => {
      const result = cmd.parseCliArgs(['rollback', 'task-2-post'])
      expect(result).toEqual({ action: 'rollback', tag: 'task-2-post' })
    })

    it('maps diff with tag', () => {
      const result = cmd.parseCliArgs(['diff', 'manual-1234'])
      expect(result).toEqual({ action: 'diff', tag: 'manual-1234' })
    })

    it('maps list', () => {
      const result = cmd.parseCliArgs(['list'])
      expect(result).toEqual({ action: 'list' })
    })

    it('maps status', () => {
      const result = cmd.parseCliArgs(['status'])
      expect(result).toEqual({ action: 'status' })
    })
  })

  // --------------------------------------------------------------------------
  // SCHEMA VALIDATION
  // --------------------------------------------------------------------------

  describe('schema validation', () => {
    it('validates action enum', () => {
      const result = cmd.argsSchema.safeParse({ action: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('accepts valid save action', () => {
      const result = cmd.argsSchema.safeParse({ action: 'save', message: 'test' })
      expect(result.success).toBe(true)
    })

    it('accepts action without optional fields', () => {
      const result = cmd.argsSchema.safeParse({ action: 'list' })
      expect(result.success).toBe(true)
    })
  })
})
