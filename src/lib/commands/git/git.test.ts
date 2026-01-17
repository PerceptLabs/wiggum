import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../../fs'
import { Git } from '../../git'
import { GitCommand } from './index'

describe('GitCommand', () => {
  let fs: LightningFSAdapter
  let gitCommand: GitCommand

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-git-cmd-' + Date.now(), { wipe: true })
    await fs.mkdir('/repo', { recursive: true })

    gitCommand = new GitCommand(fs, (dir) => new Git({ fs, dir }))
  })

  describe('init', () => {
    it('should initialize a repository', async () => {
      const result = await gitCommand.execute(['init'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initialized')
    })
  })

  describe('status', () => {
    it('should show clean status', async () => {
      await gitCommand.execute(['init'], '/repo')
      const result = await gitCommand.execute(['status'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('On branch')
    })

    it('should show untracked files', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      const result = await gitCommand.execute(['status'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Untracked files')
    })
  })

  describe('add', () => {
    it('should add a file', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      const result = await gitCommand.execute(['add', 'file.txt'], '/repo')
      expect(result.exitCode).toBe(0)
    })

    it('should add all files with .', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file1.txt', 'content1')
      await fs.writeFile('/repo/file2.txt', 'content2')
      const result = await gitCommand.execute(['add', '.'], '/repo')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('commit', () => {
    it('should create a commit', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      const result = await gitCommand.execute(['commit', '-m', 'Initial commit'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initial commit')
    })

    it('should require a message', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      const result = await gitCommand.execute(['commit'], '/repo')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('requires a value')
    })
  })

  describe('log', () => {
    it('should show commits', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial commit'], '/repo')
      const result = await gitCommand.execute(['log'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initial commit')
    })

    it('should support --oneline', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial commit'], '/repo')
      const result = await gitCommand.execute(['log', '--oneline'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initial commit')
      // Oneline format is shorter
      expect(result.stdout.split('\n').length).toBeLessThan(5)
    })
  })

  describe('branch', () => {
    it('should list branches', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      const result = await gitCommand.execute(['branch'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('main')
    })

    it('should create a branch', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      await gitCommand.execute(['branch', 'feature'], '/repo')
      const result = await gitCommand.execute(['branch'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('feature')
    })
  })

  describe('checkout', () => {
    it('should switch branches', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      await gitCommand.execute(['branch', 'feature'], '/repo')
      const result = await gitCommand.execute(['checkout', 'feature'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Switched to branch')
    })

    it('should create and switch with -b', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      const result = await gitCommand.execute(['checkout', '-b', 'feature2'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('new branch')
    })
  })

  describe('diff', () => {
    it('should show no diff for clean repo', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      const result = await gitCommand.execute(['diff'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
    })

    it('should show diff for modified file', async () => {
      await gitCommand.execute(['init'], '/repo')
      await fs.writeFile('/repo/file.txt', 'content')
      await gitCommand.execute(['add', 'file.txt'], '/repo')
      await gitCommand.execute(['commit', '-m', 'Initial'], '/repo')
      await fs.writeFile('/repo/file.txt', 'modified')
      const result = await gitCommand.execute(['diff'], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('file.txt')
    })
  })

  describe('unknown subcommand', () => {
    it('should return error for unknown command', async () => {
      const result = await gitCommand.execute(['unknown'], '/repo')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('is not a git command')
    })
  })

  describe('no subcommand', () => {
    it('should show usage', async () => {
      const result = await gitCommand.execute([], '/repo')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('usage: git')
    })
  })
})
