import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../fs'
import { ShellTool } from './ShellTool'

describe('ShellTool', () => {
  let fs: LightningFSAdapter
  let shell: ShellTool

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-shell-tool-' + Date.now(), { wipe: true })
    await fs.mkdir('/home', { recursive: true })
    await fs.writeFile('/home/test.txt', 'hello world')
    shell = new ShellTool({ fs, cwd: '/home' })
  })

  describe('parseCommand', () => {
    it('should parse simple command', () => {
      const result = shell.parseCommand('ls -la /home')
      expect(result.name).toBe('ls')
      expect(result.args).toEqual(['-la', '/home'])
    })

    it('should handle single quotes', () => {
      const result = shell.parseCommand("echo 'hello world'")
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(['hello world'])
    })

    it('should handle double quotes', () => {
      const result = shell.parseCommand('echo "hello world"')
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(['hello world'])
    })

    it('should handle escape sequences', () => {
      const result = shell.parseCommand('echo hello\\ world')
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(['hello world'])
    })

    it('should handle mixed quotes', () => {
      const result = shell.parseCommand(`echo "it's" 'a "test"'`)
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(["it's", 'a "test"'])
    })

    it('should parse redirect >', () => {
      const result = shell.parseCommand('echo hello > out.txt')
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(['hello'])
      expect(result.redirect).toEqual({ type: '>', path: 'out.txt' })
    })

    it('should parse redirect >>', () => {
      const result = shell.parseCommand('echo world >> out.txt')
      expect(result.name).toBe('echo')
      expect(result.args).toEqual(['world'])
      expect(result.redirect).toEqual({ type: '>>', path: 'out.txt' })
    })

    it('should handle empty command', () => {
      const result = shell.parseCommand('')
      expect(result.name).toBe('')
      expect(result.args).toEqual([])
    })
  })

  describe('parseCompoundCommand', () => {
    it('should parse && operator', () => {
      const result = shell.parseCompoundCommand('cmd1 && cmd2')
      expect(result).toHaveLength(2)
      expect(result[0].command.name).toBe('cmd1')
      expect(result[0].operator).toBe('&&')
      expect(result[1].command.name).toBe('cmd2')
      expect(result[1].operator).toBeNull()
    })

    it('should parse || operator', () => {
      const result = shell.parseCompoundCommand('cmd1 || cmd2')
      expect(result).toHaveLength(2)
      expect(result[0].operator).toBe('||')
    })

    it('should parse pipe operator', () => {
      const result = shell.parseCompoundCommand('cat file | grep pattern')
      expect(result).toHaveLength(2)
      expect(result[0].command.name).toBe('cat')
      expect(result[0].operator).toBe('|')
      expect(result[1].command.name).toBe('grep')
    })

    it('should parse semicolon operator', () => {
      const result = shell.parseCompoundCommand('cmd1; cmd2')
      expect(result).toHaveLength(2)
      expect(result[0].operator).toBe(';')
    })

    it('should handle multiple operators', () => {
      const result = shell.parseCompoundCommand('cmd1 && cmd2 || cmd3')
      expect(result).toHaveLength(3)
      expect(result[0].operator).toBe('&&')
      expect(result[1].operator).toBe('||')
      expect(result[2].operator).toBeNull()
    })

    it('should not split on operators inside quotes', () => {
      const result = shell.parseCompoundCommand('echo "a && b" && cmd2')
      expect(result).toHaveLength(2)
      expect(result[0].command.args).toEqual(['a && b'])
    })
  })

  describe('executeSingleCommand', () => {
    it('should execute echo command', async () => {
      const parsed = shell.parseCommand('echo hello')
      const result = await shell.executeSingleCommand(parsed)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello')
    })

    it('should execute pwd command', async () => {
      const parsed = shell.parseCommand('pwd')
      const result = await shell.executeSingleCommand(parsed)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('/home')
    })

    it('should handle command not found', async () => {
      const parsed = shell.parseCommand('nonexistent')
      const result = await shell.executeSingleCommand(parsed)
      expect(result.exitCode).toBe(127)
      expect(result.stderr).toContain('command not found')
    })

    it('should handle piped input', async () => {
      const parsed = shell.parseCommand('grep hello')
      const result = await shell.executeSingleCommand(parsed, 'hello world\ngoodbye')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello world')
    })

    it('should handle redirect >', async () => {
      const parsed = shell.parseCommand('echo test > output.txt')
      const result = await shell.executeSingleCommand(parsed)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
      const content = await fs.readFile('/home/output.txt', { encoding: 'utf8' })
      expect(content).toBe('test')
    })

    it('should handle redirect >>', async () => {
      await fs.writeFile('/home/append.txt', 'line1\n')
      const parsed = shell.parseCommand('echo line2 >> append.txt')
      const result = await shell.executeSingleCommand(parsed)
      expect(result.exitCode).toBe(0)
      const content = await fs.readFile('/home/append.txt', { encoding: 'utf8' })
      expect(content).toBe('line1\nline2')
    })

    it('should update cwd on cd command', async () => {
      await fs.mkdir('/home/sub', { recursive: true })
      const parsed = shell.parseCommand('cd sub')
      await shell.executeSingleCommand(parsed)
      expect(shell.getCurrentWorkingDirectory()).toBe('/home/sub')
    })
  })

  describe('executeCompoundCommands', () => {
    it('should execute && chain on success', async () => {
      const commands = shell.parseCompoundCommand('echo hello && echo world')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('world')
    })

    it('should stop && chain on failure', async () => {
      const commands = shell.parseCompoundCommand('nonexistent && echo hello')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(127)
      expect(result.stdout).toBe('')
    })

    it('should execute || on failure', async () => {
      const commands = shell.parseCompoundCommand('nonexistent || echo fallback')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('fallback')
    })

    it('should skip || on success', async () => {
      const commands = shell.parseCompoundCommand('echo hello || echo fallback')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello')
    })

    it('should pipe output between commands', async () => {
      await fs.writeFile('/home/lines.txt', 'apple\nbanana\ncherry')
      const commands = shell.parseCompoundCommand('cat lines.txt | grep banana')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('banana')
    })

    it('should execute ; regardless of exit code', async () => {
      const commands = shell.parseCompoundCommand('nonexistent; echo hello')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('hello')
    })

    it('should handle complex pipe chain', async () => {
      await fs.writeFile('/home/data.txt', 'line1\nline2\nline3\nline4\nline5')
      const commands = shell.parseCompoundCommand('cat data.txt | head -n 3 | tail -n 1')
      const result = await shell.executeCompoundCommands(commands)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line3')
    })
  })

  describe('execute', () => {
    it('should execute a command via Tool interface', async () => {
      const result = await shell.execute({ command: 'echo hello' })
      expect(result.content).toBe('hello')
      expect(result.cost).toBe(1)
    })

    it('should handle errors', async () => {
      const result = await shell.execute({ command: 'nonexistent' })
      expect(result.content).toContain('command not found')
    })
  })

  describe('getAvailableCommands', () => {
    it('should list all commands', () => {
      const commands = shell.getAvailableCommands()
      const names = commands.map((c) => c.name)
      expect(names).toContain('cat')
      expect(names).toContain('ls')
      expect(names).toContain('git')
      expect(names).toContain('grep')
    })
  })

  describe('cwd management', () => {
    it('should get and set cwd', () => {
      expect(shell.getCurrentWorkingDirectory()).toBe('/home')
      shell.setCurrentWorkingDirectory('/tmp')
      expect(shell.getCurrentWorkingDirectory()).toBe('/tmp')
    })
  })

  describe('sendMessage callback', () => {
    it('should call sendMessage when provided', async () => {
      const messages: string[] = []
      const shellWithCallback = new ShellTool({
        fs,
        cwd: '/home',
        sendMessage: async (msg) => {
          messages.push(msg)
          return 'AI response'
        },
      })
      const result = await shellWithCallback.sendRalphMessage('test message')
      expect(messages).toEqual(['test message'])
      expect(result).toBe('AI response')
    })

    it('should not fail when sendMessage is not provided', async () => {
      const result = await shell.sendRalphMessage('test')
      expect(result).toBe('')
    })
  })

  describe('ralph integration', () => {
    it('should register ralph command when sendMessage provided', () => {
      const shellWithRalph = new ShellTool({
        fs,
        cwd: '/home',
        sendMessage: async () => 'response',
      })
      expect(shellWithRalph.hasRalph()).toBe(true)
      const commands = shellWithRalph.getAvailableCommands()
      const names = commands.map((c) => c.name)
      expect(names).toContain('ralph')
    })

    it('should not register ralph command without sendMessage', () => {
      expect(shell.hasRalph()).toBe(false)
      const commands = shell.getAvailableCommands()
      const names = commands.map((c) => c.name)
      expect(names).not.toContain('ralph')
    })

    it('should execute ralph commands', async () => {
      const shellWithRalph = new ShellTool({
        fs,
        cwd: '/home',
        sendMessage: async () => 'response',
      })
      const result = await shellWithRalph.execute({ command: 'ralph --help' })
      expect(result.content).toContain('ralph')
      expect(result.content).toContain('init')
    })
  })
})
