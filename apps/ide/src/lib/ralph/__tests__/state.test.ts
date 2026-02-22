import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs'
import { initRalphDir, getRalphState } from '../state'

describe('initRalphDir', () => {
  let fs: LightningFSAdapter

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-state-' + Date.now(), { wipe: true })
    await fs.mkdir('/project', { recursive: true })
  })

  describe('first run', () => {
    it('creates .ralph/ directory and state files', async () => {
      await initRalphDir(fs, '/project', 'Build a landing page')
      const stat = await fs.stat('/project/.ralph')
      expect(stat.isDirectory()).toBe(true)
    })

    it('writes task.md with provided task text', async () => {
      await initRalphDir(fs, '/project', 'Build a landing page')
      const task = await fs.readFile('/project/.ralph/task.md', { encoding: 'utf8' }) as string
      expect(task).toContain('Build a landing page')
    })

    it('creates origin.md with original prompt', async () => {
      await initRalphDir(fs, '/project', 'Build a landing page')
      const origin = await fs.readFile('/project/.ralph/origin.md', { encoding: 'utf8' }) as string
      expect(origin).toContain('# Project Origin')
      expect(origin).toContain('Build a landing page')
    })

    it('creates empty intent/plan/summary files', async () => {
      await initRalphDir(fs, '/project', 'Build something')
      const intent = await fs.readFile('/project/.ralph/intent.md', { encoding: 'utf8' }) as string
      const plan = await fs.readFile('/project/.ralph/plan.md', { encoding: 'utf8' }) as string
      const summary = await fs.readFile('/project/.ralph/summary.md', { encoding: 'utf8' }) as string
      expect(intent).toBe('')
      expect(plan).toBe('')
      expect(summary).toBe('')
    })

    it('sets iteration to 0 and status to running', async () => {
      await initRalphDir(fs, '/project', 'Build something')
      const iteration = await fs.readFile('/project/.ralph/iteration.txt', { encoding: 'utf8' }) as string
      const status = await fs.readFile('/project/.ralph/status.txt', { encoding: 'utf8' }) as string
      expect(iteration).toBe('0')
      expect(status).toBe('running')
    })
  })

  describe('continuation run', () => {
    beforeEach(async () => {
      // First run
      await initRalphDir(fs, '/project', 'Build a landing page')
      // Simulate Ralph writing to intent/plan/summary during the run
      await fs.writeFile('/project/.ralph/intent.md', 'Build a modern landing page with hero section')
      await fs.writeFile('/project/.ralph/plan.md', '1. Create Hero\n2. Create Features\n3. Apply theme')
      await fs.writeFile('/project/.ralph/summary.md', 'Built hero section with gradient background')
      await fs.writeFile('/project/.ralph/iteration.txt', '3')
      await fs.writeFile('/project/.ralph/status.txt', 'complete')
      await fs.writeFile('/project/.ralph/feedback.md', 'Gate passed')
    })

    it('preserves non-empty intent.md', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const intent = await fs.readFile('/project/.ralph/intent.md', { encoding: 'utf8' }) as string
      expect(intent).toBe('Build a modern landing page with hero section')
    })

    it('preserves non-empty plan.md', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const plan = await fs.readFile('/project/.ralph/plan.md', { encoding: 'utf8' }) as string
      expect(plan).toContain('Create Hero')
    })

    it('clears summary.md on continuation run', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const summary = await fs.readFile('/project/.ralph/summary.md', { encoding: 'utf8' }) as string
      expect(summary).toBe('')
    })

    it('resets task.md to new prompt', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const task = await fs.readFile('/project/.ralph/task.md', { encoding: 'utf8' }) as string
      expect(task).toContain('Fix the colors')
      expect(task).not.toContain('Build a landing page')
    })

    it('resets feedback.md, iteration, and status', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const feedback = await fs.readFile('/project/.ralph/feedback.md', { encoding: 'utf8' }) as string
      const iteration = await fs.readFile('/project/.ralph/iteration.txt', { encoding: 'utf8' }) as string
      const status = await fs.readFile('/project/.ralph/status.txt', { encoding: 'utf8' }) as string
      expect(feedback).toBe('')
      expect(iteration).toBe('0')
      expect(status).toBe('running')
    })

    it('appends to origin.md', async () => {
      await initRalphDir(fs, '/project', 'Fix the colors')
      const origin = await fs.readFile('/project/.ralph/origin.md', { encoding: 'utf8' }) as string
      expect(origin).toContain('Build a landing page')
      expect(origin).toContain('Fix the colors')
    })
  })

  describe('edge cases', () => {
    it('blanks whitespace-only files (trim check)', async () => {
      await initRalphDir(fs, '/project', 'First run')
      // Write whitespace-only content
      await fs.writeFile('/project/.ralph/intent.md', '   \n  \n  ')
      await initRalphDir(fs, '/project', 'Second run')
      const intent = await fs.readFile('/project/.ralph/intent.md', { encoding: 'utf8' }) as string
      expect(intent).toBe('')
    })
  })
})

describe('getRalphState', () => {
  let fs: LightningFSAdapter

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-getstate-' + Date.now(), { wipe: true })
    await fs.mkdir('/project', { recursive: true })
  })

  it('reads all state fields', async () => {
    await initRalphDir(fs, '/project', 'Test task')
    await fs.writeFile('/project/.ralph/intent.md', 'intent content')
    await fs.writeFile('/project/.ralph/plan.md', 'plan content')
    await fs.writeFile('/project/.ralph/summary.md', 'summary content')

    const state = await getRalphState(fs, '/project')
    expect(state.task).toContain('Test task')
    expect(state.intent).toBe('intent content')
    expect(state.plan).toBe('plan content')
    expect(state.summary).toBe('summary content')
    expect(state.iteration).toBe(0)
    expect(state.status).toBe('running')
  })

  it('returns defaults for missing files', async () => {
    await fs.mkdir('/project/.ralph', { recursive: true })
    const state = await getRalphState(fs, '/project')
    expect(state.task).toBe('')
    expect(state.intent).toBe('')
    expect(state.iteration).toBe(0)
    expect(state.status).toBe('running')
  })
})
