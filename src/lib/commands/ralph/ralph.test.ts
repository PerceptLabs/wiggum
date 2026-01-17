import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LightningFSAdapter } from '../../fs'
import { Git } from '../../git'
import { RalphCommand } from './index'
import { buildIterationPrompt } from './run'
import { readRalphState } from './status'
import { RALPH_FILES } from './types'
import type { RalphState } from './types'

describe('RalphCommand', () => {
  let fs: LightningFSAdapter
  let ralphCommand: RalphCommand
  let mockSendMessage: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-ralph-' + Date.now(), { wipe: true })
    await fs.mkdir('/project', { recursive: true })

    mockSendMessage = vi.fn().mockResolvedValue('AI response: Made some progress')

    ralphCommand = new RalphCommand(
      fs,
      (dir) => new Git({ fs, dir }),
      mockSendMessage
    )
  })

  describe('help', () => {
    it('should show usage with --help', async () => {
      const result = await ralphCommand.execute(['--help'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ralph')
      expect(result.stdout).toContain('init')
      expect(result.stdout).toContain('run')
      expect(result.stdout).toContain('status')
    })

    it('should show usage with no args', async () => {
      const result = await ralphCommand.execute([], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Subcommands')
    })
  })

  describe('init', () => {
    it('should initialize .ralph directory', async () => {
      const result = await ralphCommand.execute(['init'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initialized ralph')

      // Verify files exist
      const task = await fs.readFile('/project/.ralph/task.md', { encoding: 'utf8' })
      expect(task).toContain('# Task')

      const status = await fs.readFile('/project/.ralph/status.txt', { encoding: 'utf8' })
      expect(status).toBe('idle')

      const iteration = await fs.readFile('/project/.ralph/iteration.txt', { encoding: 'utf8' })
      expect(iteration).toBe('0')
    })

    it('should accept task description', async () => {
      const result = await ralphCommand.execute(
        ['init', 'Build a REST API'],
        '/project'
      )
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Build a REST API')

      const task = await fs.readFile('/project/.ralph/task.md', { encoding: 'utf8' })
      expect(task).toContain('Build a REST API')
    })

    it('should reject reinit without --force', async () => {
      await ralphCommand.execute(['init'], '/project')
      const result = await ralphCommand.execute(['init'], '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('already exists')
    })

    it('should allow reinit with --force', async () => {
      await ralphCommand.execute(['init'], '/project')
      const result = await ralphCommand.execute(['init', '--force'], '/project')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('status', () => {
    it('should error if not initialized', async () => {
      const result = await ralphCommand.execute(['status'], '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not initialized')
    })

    it('should show current status', async () => {
      await ralphCommand.execute(['init', 'Test task'], '/project')
      const result = await ralphCommand.execute(['status'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Status:     idle')
      expect(result.stdout).toContain('Iteration:  0')
      expect(result.stdout).toContain('Test task')
    })

    it('should show verbose output with -v', async () => {
      await ralphCommand.execute(['init', 'Test task'], '/project')
      await fs.writeFile('/project/.ralph/progress.md', '# Progress\n\n## Iterations\n\nSome progress here')
      const result = await ralphCommand.execute(['status', '-v'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Progress:')
    })
  })

  describe('run', () => {
    beforeEach(async () => {
      await ralphCommand.execute(['init', 'Test task'], '/project')
    })

    it('should run iterations', async () => {
      mockSendMessage.mockImplementation(async () => {
        // Simulate AI marking complete after first iteration
        await fs.writeFile('/project/.ralph/status.txt', 'complete')
        return 'Task completed!'
      })

      const result = await ralphCommand.execute(['run', '--max-iterations', '3'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Completed 1 iteration')
      expect(result.stdout).toContain('Task marked complete')
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should stop on waiting status', async () => {
      mockSendMessage.mockImplementation(async () => {
        await fs.writeFile('/project/.ralph/status.txt', 'waiting')
        return 'Need human input'
      })

      const result = await ralphCommand.execute(['run', '--max-iterations', '3'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('waiting for human input')
    })

    it('should respect max iterations', async () => {
      mockSendMessage.mockResolvedValue('Made progress')

      const result = await ralphCommand.execute(['run', '--max-iterations', '2'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Completed 2 iteration')
      expect(result.stdout).toContain('Reached max iterations')
      expect(mockSendMessage).toHaveBeenCalledTimes(2)
    })

    it('should update iteration count', async () => {
      mockSendMessage.mockImplementation(async () => {
        await fs.writeFile('/project/.ralph/status.txt', 'complete')
        return 'Done'
      })

      await ralphCommand.execute(['run'], '/project')
      const iteration = await fs.readFile('/project/.ralph/iteration.txt', { encoding: 'utf8' })
      expect(iteration).toBe('1')
    })

    it('should update progress file', async () => {
      mockSendMessage.mockImplementation(async () => {
        await fs.writeFile('/project/.ralph/status.txt', 'complete')
        return 'Made some changes'
      })

      await ralphCommand.execute(['run'], '/project')
      const progress = await fs.readFile('/project/.ralph/progress.md', { encoding: 'utf8' })
      expect(progress).toContain('Iteration 1')
      expect(progress).toContain('Made some changes')
    })
  })

  describe('resume', () => {
    beforeEach(async () => {
      await ralphCommand.execute(['init', 'Test task'], '/project')
    })

    it('should resume from waiting status', async () => {
      await fs.writeFile('/project/.ralph/status.txt', 'waiting')
      await fs.writeFile('/project/.ralph/iteration.txt', '5')

      mockSendMessage.mockImplementation(async () => {
        await fs.writeFile('/project/.ralph/status.txt', 'complete')
        return 'Resumed and done'
      })

      const result = await ralphCommand.execute(['resume'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Completed')
    })

    it('should indicate if already complete', async () => {
      await fs.writeFile('/project/.ralph/status.txt', 'complete')
      const result = await ralphCommand.execute(['resume'], '/project')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('already complete')
    })
  })

  describe('unknown subcommand', () => {
    it('should error for unknown subcommand', async () => {
      const result = await ralphCommand.execute(['unknown'], '/project')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not a ralph command')
    })
  })
})

describe('buildIterationPrompt', () => {
  it('should include task description', () => {
    const state: RalphState = {
      task: '# Task\n\nBuild a feature',
      progress: '',
      feedback: '',
      iteration: 0,
      status: 'running',
    }

    const prompt = buildIterationPrompt(state, 1)
    expect(prompt).toContain('Build a feature')
    expect(prompt).toContain('Iteration 1')
  })

  it('should include progress from recent iterations', () => {
    const state: RalphState = {
      task: '# Task\n\nBuild a feature',
      progress: '# Progress\n\n### Iteration 1\n\nDid step 1\n\n### Iteration 2\n\nDid step 2',
      feedback: '',
      iteration: 2,
      status: 'running',
    }

    const prompt = buildIterationPrompt(state, 3)
    expect(prompt).toContain('Iteration 1')
    expect(prompt).toContain('Iteration 2')
  })

  it('should include feedback when present', () => {
    const state: RalphState = {
      task: '# Task\n\nBuild a feature',
      progress: '',
      feedback: '# Feedback\n\nPlease fix the bug in file.ts',
      iteration: 1,
      status: 'running',
    }

    const prompt = buildIterationPrompt(state, 2)
    expect(prompt).toContain('Please fix the bug')
  })

  it('should include instructions', () => {
    const state: RalphState = {
      task: '# Task\n\nBuild a feature',
      progress: '',
      feedback: '',
      iteration: 0,
      status: 'running',
    }

    const prompt = buildIterationPrompt(state, 1)
    expect(prompt).toContain('Instructions')
    expect(prompt).toContain('ONE clear step')
    expect(prompt).toContain('status.txt')
  })
})

describe('readRalphState', () => {
  let fs: LightningFSAdapter

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-ralph-state-' + Date.now(), { wipe: true })
    await fs.mkdir('/project/.ralph', { recursive: true })
  })

  it('should read state from files', async () => {
    await fs.writeFile('/project/.ralph/task.md', '# Task\n\nTest task')
    await fs.writeFile('/project/.ralph/progress.md', '# Progress')
    await fs.writeFile('/project/.ralph/feedback.md', '')
    await fs.writeFile('/project/.ralph/iteration.txt', '5')
    await fs.writeFile('/project/.ralph/status.txt', 'running')

    const state = await readRalphState(fs, '/project')
    expect(state.task).toContain('Test task')
    expect(state.iteration).toBe(5)
    expect(state.status).toBe('running')
  })

  it('should use defaults for missing files', async () => {
    const state = await readRalphState(fs, '/project')
    expect(state.task).toBe('')
    expect(state.iteration).toBe(0)
    expect(state.status).toBe('idle')
  })
})
