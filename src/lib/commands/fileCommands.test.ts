import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../fs'
import { CatCommand } from './cat'
import { LsCommand } from './ls'
import { CdCommand } from './cd'
import { PwdCommand } from './pwd'
import { MkdirCommand } from './mkdir'
import { TouchCommand } from './touch'
import { RmCommand } from './rm'
import { CpCommand } from './cp'
import { MvCommand } from './mv'

describe('File Commands', () => {
  let fs: LightningFSAdapter

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-commands-' + Date.now(), { wipe: true })
    // Create a basic directory structure
    await fs.mkdir('/home', { recursive: true })
    await fs.mkdir('/home/user', { recursive: true })
    await fs.writeFile('/home/user/test.txt', 'Hello World')
    await fs.writeFile('/home/user/.hidden', 'secret')
  })

  describe('CatCommand', () => {
    it('should read a file', async () => {
      const cat = new CatCommand(fs)
      const result = await cat.execute(['test.txt'], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('Hello World')
    })

    it('should read multiple files', async () => {
      await fs.writeFile('/home/user/file2.txt', ' and Goodbye')
      const cat = new CatCommand(fs)
      const result = await cat.execute(['test.txt', 'file2.txt'], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('Hello World and Goodbye')
    })

    it('should handle absolute paths', async () => {
      const cat = new CatCommand(fs)
      const result = await cat.execute(['/home/user/test.txt'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('Hello World')
    })

    it('should return error for missing file', async () => {
      const cat = new CatCommand(fs)
      const result = await cat.execute(['nonexistent.txt'], '/home/user')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })

    it('should handle pipe input', async () => {
      const cat = new CatCommand(fs)
      const result = await cat.execute([], '/home/user', 'piped content')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('piped content')
    })
  })

  describe('LsCommand', () => {
    it('should list directory contents', async () => {
      const ls = new LsCommand(fs)
      const result = await ls.execute([], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test.txt')
    })

    it('should show hidden files with -a', async () => {
      const ls = new LsCommand(fs)
      const result = await ls.execute(['-a'], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('.hidden')
    })

    it('should not show hidden files without -a', async () => {
      const ls = new LsCommand(fs)
      const result = await ls.execute([], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain('.hidden')
    })

    it('should show long format with -l', async () => {
      const ls = new LsCommand(fs)
      const result = await ls.execute(['-l'], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test.txt')
      expect(result.stdout).toContain('user')
    })

    it('should return error for nonexistent directory', async () => {
      const ls = new LsCommand(fs)
      const result = await ls.execute(['/nonexistent'], '/')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })
  })

  describe('CdCommand', () => {
    it('should change to directory', async () => {
      const cd = new CdCommand(fs)
      const result = await cd.execute(['/home'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.newCwd).toBe('/home')
    })

    it('should handle relative paths', async () => {
      const cd = new CdCommand(fs)
      const result = await cd.execute(['user'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.newCwd).toBe('/home/user')
    })

    it('should handle ..', async () => {
      const cd = new CdCommand(fs)
      const result = await cd.execute(['..'], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.newCwd).toBe('/home')
    })

    it('should return error for nonexistent directory', async () => {
      const cd = new CdCommand(fs)
      const result = await cd.execute(['/nonexistent'], '/')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })

    it('should return error for file', async () => {
      const cd = new CdCommand(fs)
      const result = await cd.execute(['test.txt'], '/home/user')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Not a directory')
    })
  })

  describe('PwdCommand', () => {
    it('should print working directory', async () => {
      const pwd = new PwdCommand()
      const result = await pwd.execute([], '/home/user')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('/home/user')
    })
  })

  describe('MkdirCommand', () => {
    it('should create a directory', async () => {
      const mkdir = new MkdirCommand(fs)
      const result = await mkdir.execute(['newdir'], '/home/user')
      expect(result.exitCode).toBe(0)

      const stat = await fs.stat('/home/user/newdir')
      expect(stat.isDirectory()).toBe(true)
    })

    it('should create nested directories with -p', async () => {
      const mkdir = new MkdirCommand(fs)
      const result = await mkdir.execute(['-p', 'a/b/c'], '/home/user')
      expect(result.exitCode).toBe(0)

      const stat = await fs.stat('/home/user/a/b/c')
      expect(stat.isDirectory()).toBe(true)
    })

    it('should fail without -p for nested', async () => {
      const mkdir = new MkdirCommand(fs)
      const result = await mkdir.execute(['x/y/z'], '/home/user')
      expect(result.exitCode).toBe(1)
    })
  })

  describe('TouchCommand', () => {
    it('should create an empty file', async () => {
      const touch = new TouchCommand(fs)
      const result = await touch.execute(['newfile.txt'], '/home/user')
      expect(result.exitCode).toBe(0)

      const content = await fs.readFile('/home/user/newfile.txt', { encoding: 'utf8' })
      expect(content).toBe('')
    })

    it('should not fail on existing file', async () => {
      const touch = new TouchCommand(fs)
      const result = await touch.execute(['test.txt'], '/home/user')
      expect(result.exitCode).toBe(0)

      // Content should be unchanged
      const content = await fs.readFile('/home/user/test.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello World')
    })
  })

  describe('RmCommand', () => {
    it('should remove a file', async () => {
      const rm = new RmCommand(fs)
      const result = await rm.execute(['test.txt'], '/home/user')
      expect(result.exitCode).toBe(0)

      await expect(fs.stat('/home/user/test.txt')).rejects.toThrow()
    })

    it('should fail on directory without -r', async () => {
      await fs.mkdir('/home/user/dir')
      const rm = new RmCommand(fs)
      const result = await rm.execute(['dir'], '/home/user')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Is a directory')
    })

    it('should remove directory with -r', async () => {
      await fs.mkdir('/home/user/dir')
      await fs.writeFile('/home/user/dir/file.txt', 'content')
      const rm = new RmCommand(fs)
      const result = await rm.execute(['-r', 'dir'], '/home/user')
      expect(result.exitCode).toBe(0)

      await expect(fs.stat('/home/user/dir')).rejects.toThrow()
    })

    it('should not fail with -f on nonexistent', async () => {
      const rm = new RmCommand(fs)
      const result = await rm.execute(['-f', 'nonexistent'], '/home/user')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('CpCommand', () => {
    it('should copy a file', async () => {
      const cp = new CpCommand(fs)
      const result = await cp.execute(['test.txt', 'copy.txt'], '/home/user')
      expect(result.exitCode).toBe(0)

      const content = await fs.readFile('/home/user/copy.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello World')
    })

    it('should copy file to directory', async () => {
      await fs.mkdir('/home/user/dest')
      const cp = new CpCommand(fs)
      const result = await cp.execute(['test.txt', 'dest'], '/home/user')
      expect(result.exitCode).toBe(0)

      const content = await fs.readFile('/home/user/dest/test.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello World')
    })

    it('should copy directory with -r', async () => {
      await fs.mkdir('/home/user/srcdir')
      await fs.writeFile('/home/user/srcdir/file.txt', 'content')
      const cp = new CpCommand(fs)
      const result = await cp.execute(['-r', 'srcdir', 'destdir'], '/home/user')
      expect(result.exitCode).toBe(0)

      const content = await fs.readFile('/home/user/destdir/file.txt', { encoding: 'utf8' })
      expect(content).toBe('content')
    })

    it('should fail on directory without -r', async () => {
      await fs.mkdir('/home/user/srcdir')
      const cp = new CpCommand(fs)
      const result = await cp.execute(['srcdir', 'destdir'], '/home/user')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('-r not specified')
    })
  })

  describe('MvCommand', () => {
    it('should rename a file', async () => {
      const mv = new MvCommand(fs)
      const result = await mv.execute(['test.txt', 'renamed.txt'], '/home/user')
      expect(result.exitCode).toBe(0)

      await expect(fs.stat('/home/user/test.txt')).rejects.toThrow()
      const content = await fs.readFile('/home/user/renamed.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello World')
    })

    it('should move file to directory', async () => {
      await fs.mkdir('/home/user/dest')
      const mv = new MvCommand(fs)
      const result = await mv.execute(['test.txt', 'dest'], '/home/user')
      expect(result.exitCode).toBe(0)

      await expect(fs.stat('/home/user/test.txt')).rejects.toThrow()
      const content = await fs.readFile('/home/user/dest/test.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello World')
    })

    it('should fail on nonexistent source', async () => {
      const mv = new MvCommand(fs)
      const result = await mv.execute(['nonexistent', 'dest'], '/home/user')
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file')
    })
  })
})
