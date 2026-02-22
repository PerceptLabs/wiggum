import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs/LightningFSAdapter'
import { Git } from '../../git'
import {
  readTaskCounter,
  writeTaskCounter,
  readPreviousSummary,
  appendTaskHistory,
  createPreSnapshot,
  createPostSnapshot,
} from '../task-lifecycle'

describe('task-lifecycle', () => {
  let fs: LightningFSAdapter
  let git: Git

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-lifecycle-' + Date.now(), { wipe: true })
    await fs.mkdir('/project/.ralph', { recursive: true })
    await fs.mkdir('/project/src', { recursive: true })

    git = new Git({ fs, dir: '/project' })
    await git.init()

    // Initial commit so we have a valid HEAD
    await fs.writeFile('/project/src/App.tsx', 'export default function App() {}')
    await git.add('src/App.tsx')
    await git.commit({ message: 'initial', author: { name: 'Test', email: 'test@test.com' } })
  })

  // --------------------------------------------------------------------------
  // COUNTER
  // --------------------------------------------------------------------------

  describe('readTaskCounter', () => {
    it('returns 0 when file missing', async () => {
      expect(await readTaskCounter(fs, '/project')).toBe(0)
    })

    it('reads written value', async () => {
      await writeTaskCounter(fs, '/project', 5)
      expect(await readTaskCounter(fs, '/project')).toBe(5)
    })

    it('returns 0 for non-numeric content', async () => {
      await fs.writeFile('/project/.ralph/task-counter.txt', 'garbage')
      expect(await readTaskCounter(fs, '/project')).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // PREVIOUS SUMMARY
  // --------------------------------------------------------------------------

  describe('readPreviousSummary', () => {
    it('returns "(no summary)" when file missing', async () => {
      expect(await readPreviousSummary(fs, '/project')).toBe('(no summary)')
    })

    it('returns "(no summary)" when file is empty', async () => {
      await fs.writeFile('/project/.ralph/summary.md', '')
      expect(await readPreviousSummary(fs, '/project')).toBe('(no summary)')
    })

    it('returns first line of summary', async () => {
      await fs.writeFile('/project/.ralph/summary.md', 'Built hero section\nWith gradient background')
      expect(await readPreviousSummary(fs, '/project')).toBe('Built hero section')
    })

    it('truncates to 100 chars', async () => {
      const longLine = 'A'.repeat(150)
      await fs.writeFile('/project/.ralph/summary.md', longLine)
      const result = await readPreviousSummary(fs, '/project')
      expect(result).toHaveLength(103) // 100 + '...'
      expect(result.endsWith('...')).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // TASK HISTORY
  // --------------------------------------------------------------------------

  describe('appendTaskHistory', () => {
    it('creates file with header when new', async () => {
      await appendTaskHistory(fs, '/project', 1, 'Built landing page')
      const content = await fs.readFile('/project/.ralph/task-history.md', { encoding: 'utf8' }) as string
      expect(content).toContain('# Task History')
      expect(content).toContain('**Task 1**: Built landing page')
    })

    it('appends to existing file', async () => {
      await appendTaskHistory(fs, '/project', 1, 'Built landing page')
      await appendTaskHistory(fs, '/project', 2, 'Fixed colors')
      const content = await fs.readFile('/project/.ralph/task-history.md', { encoding: 'utf8' }) as string
      expect(content).toContain('**Task 1**: Built landing page')
      expect(content).toContain('**Task 2**: Fixed colors')
    })

    it('accumulates multiple entries', async () => {
      await appendTaskHistory(fs, '/project', 1, 'First')
      await appendTaskHistory(fs, '/project', 2, 'Second')
      await appendTaskHistory(fs, '/project', 3, 'Third')
      const content = await fs.readFile('/project/.ralph/task-history.md', { encoding: 'utf8' }) as string
      const entries = content.match(/\*\*Task \d+\*\*/g)
      expect(entries).toHaveLength(3)
    })
  })

  // --------------------------------------------------------------------------
  // SNAPSHOTS
  // --------------------------------------------------------------------------

  describe('createPreSnapshot', () => {
    it('creates tag at HEAD when no changes', async () => {
      const tag = await createPreSnapshot(git, 2)
      expect(tag).toBe('task-2-pre')

      const tags = await git.listTags()
      expect(tags).toContain('task-2-pre')
    })

    it('commits + tags when changes exist', async () => {
      await fs.writeFile('/project/src/App.tsx', 'modified content')

      const tag = await createPreSnapshot(git, 3)
      expect(tag).toBe('task-3-pre')

      const tags = await git.listTags()
      expect(tags).toContain('task-3-pre')

      // Verify commit was created with snapshot author
      const logs = await git.log({ depth: 1 })
      expect(logs[0].commit.message).toContain('pre-task 3')
      expect(logs[0].commit.author.name).toBe('Wiggum Snapshot')
    })
  })

  describe('createPostSnapshot', () => {
    it('creates tag at HEAD when no changes', async () => {
      const tag = await createPostSnapshot(git, 1)
      expect(tag).toBe('task-1-post')

      const tags = await git.listTags()
      expect(tags).toContain('task-1-post')
    })

    it('commits + tags when changes exist', async () => {
      await fs.writeFile('/project/src/App.tsx', 'post-task content')

      const tag = await createPostSnapshot(git, 2)
      expect(tag).toBe('task-2-post')

      const logs = await git.log({ depth: 1 })
      expect(logs[0].commit.message).toContain('post-task 2')
    })
  })

  // --------------------------------------------------------------------------
  // FULL LIFECYCLE
  // --------------------------------------------------------------------------

  describe('full lifecycle', () => {
    it('first task: counter 0→1, no pre, post created', async () => {
      // Read counter — should be 0 (first task)
      const counter = await readTaskCounter(fs, '/project')
      expect(counter).toBe(0)

      const taskNumber = counter + 1

      // First task: skip pre-snapshot
      await writeTaskCounter(fs, '/project', taskNumber)

      // Simulate Ralph doing work
      await fs.writeFile('/project/src/App.tsx', 'task 1 output')

      // Post snapshot
      const postTag = await createPostSnapshot(git, taskNumber)
      expect(postTag).toBe('task-1-post')

      // Counter is now 1
      expect(await readTaskCounter(fs, '/project')).toBe(1)
    })

    it('second task: pre captures previous, history appended, counter incremented', async () => {
      // Setup: simulate task 1 completed
      await writeTaskCounter(fs, '/project', 1)
      await fs.writeFile('/project/.ralph/summary.md', 'Built hero section with gradient')
      await fs.writeFile('/project/src/App.tsx', 'task 1 final state')
      await git.add('.')
      await git.commit({ message: 'task 1 done', author: { name: 'Test', email: 'test@test.com' } })

      // Second message arrives
      const currentCounter = await readTaskCounter(fs, '/project')
      expect(currentCounter).toBe(1)
      const taskNumber = currentCounter + 1

      // Pre-snapshot of task 1 state
      const previousSummary = await readPreviousSummary(fs, '/project')
      expect(previousSummary).toBe('Built hero section with gradient')

      await appendTaskHistory(fs, '/project', currentCounter, previousSummary)
      const preTag = await createPreSnapshot(git, taskNumber)
      expect(preTag).toBe('task-2-pre')

      await writeTaskCounter(fs, '/project', taskNumber)
      expect(await readTaskCounter(fs, '/project')).toBe(2)

      // History has task 1 entry
      const history = await fs.readFile('/project/.ralph/task-history.md', { encoding: 'utf8' }) as string
      expect(history).toContain('**Task 1**: Built hero section with gradient')

      // Tags include pre-snapshot
      const tags = await git.listTags()
      expect(tags).toContain('task-2-pre')
    })
  })
})
