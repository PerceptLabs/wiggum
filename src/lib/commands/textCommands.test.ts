import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from '../fs'
import { EchoCommand } from './echo'
import { GrepCommand } from './grep'
import { HeadCommand } from './head'
import { TailCommand } from './tail'
import { WcCommand } from './wc'
import { SortCommand } from './sort'
import { UniqCommand } from './uniq'
import { CutCommand } from './cut'
import { SedCommand } from './sed'
import { TrCommand } from './tr'
import { FindCommand } from './find'

describe('Text Processing Commands', () => {
  let fs: LightningFSAdapter

  beforeEach(async () => {
    fs = new LightningFSAdapter('test-text-commands-' + Date.now(), { wipe: true })
    await fs.mkdir('/home', { recursive: true })
    await fs.writeFile('/home/test.txt', 'line1\nline2\nline3\nline4\nline5')
    await fs.writeFile('/home/data.csv', 'a,b,c\n1,2,3\n4,5,6')
  })

  describe('EchoCommand', () => {
    it('should echo arguments', async () => {
      const echo = new EchoCommand()
      const result = await echo.execute(['hello', 'world'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello world')
    })

    it('should handle -e for escape sequences', async () => {
      const echo = new EchoCommand()
      const result = await echo.execute(['-e', 'hello\\nworld'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('\n')
    })
  })

  describe('GrepCommand', () => {
    it('should find matching lines', async () => {
      const grep = new GrepCommand(fs)
      const result = await grep.execute(['line2', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line2')
    })

    it('should support case insensitive search', async () => {
      await fs.writeFile('/home/case.txt', 'Hello\nhello\nHELLO')
      const grep = new GrepCommand(fs)
      const result = await grep.execute(['-i', 'hello', 'case.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout.split('\n').length).toBe(3)
    })

    it('should support line numbers', async () => {
      const grep = new GrepCommand(fs)
      const result = await grep.execute(['-n', 'line3', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('3:line3')
    })

    it('should work with pipe input', async () => {
      const grep = new GrepCommand(fs)
      const result = await grep.execute(['2'], '/', 'line1\nline2\nline3')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line2')
    })
  })

  describe('HeadCommand', () => {
    it('should show first 10 lines by default', async () => {
      const head = new HeadCommand(fs)
      const result = await head.execute(['test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line1\nline2\nline3\nline4\nline5')
    })

    it('should respect -n option', async () => {
      const head = new HeadCommand(fs)
      const result = await head.execute(['-n', '2', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line1\nline2')
    })

    it('should work with pipe input', async () => {
      const head = new HeadCommand(fs)
      const result = await head.execute(['-n', '2'], '/', 'a\nb\nc\nd')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('a\nb')
    })
  })

  describe('TailCommand', () => {
    it('should show last lines', async () => {
      const tail = new TailCommand(fs)
      const result = await tail.execute(['-n', '2', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('line4\nline5')
    })

    it('should work with pipe input', async () => {
      const tail = new TailCommand(fs)
      const result = await tail.execute(['-n', '2'], '/', 'a\nb\nc\nd')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('c\nd')
    })
  })

  describe('WcCommand', () => {
    it('should count lines, words, and chars', async () => {
      const wc = new WcCommand(fs)
      const result = await wc.execute(['test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('5') // lines
      expect(result.stdout).toContain('test.txt')
    })

    it('should support -l for lines only', async () => {
      const wc = new WcCommand(fs)
      const result = await wc.execute(['-l', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('5')
    })
  })

  describe('SortCommand', () => {
    it('should sort lines', async () => {
      await fs.writeFile('/home/unsorted.txt', 'c\na\nb')
      const sort = new SortCommand(fs)
      const result = await sort.execute(['unsorted.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('a\nb\nc')
    })

    it('should support reverse sort', async () => {
      await fs.writeFile('/home/unsorted.txt', 'a\nb\nc')
      const sort = new SortCommand(fs)
      const result = await sort.execute(['-r', 'unsorted.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('c\nb\na')
    })

    it('should support unique', async () => {
      await fs.writeFile('/home/dups.txt', 'a\na\nb')
      const sort = new SortCommand(fs)
      const result = await sort.execute(['-u', 'dups.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('a\nb')
    })
  })

  describe('UniqCommand', () => {
    it('should remove adjacent duplicates', async () => {
      await fs.writeFile('/home/dups.txt', 'a\na\nb\nb\na')
      const uniq = new UniqCommand(fs)
      const result = await uniq.execute(['dups.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('a\nb\na')
    })

    it('should count with -c', async () => {
      await fs.writeFile('/home/dups.txt', 'a\na\nb')
      const uniq = new UniqCommand(fs)
      const result = await uniq.execute(['-c', 'dups.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('2')
    })
  })

  describe('CutCommand', () => {
    it('should extract fields', async () => {
      const cut = new CutCommand(fs)
      const result = await cut.execute(['-d', ',', '-f', '2', 'data.csv'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('b\n2\n5')
    })

    it('should work with pipe input', async () => {
      const cut = new CutCommand(fs)
      const result = await cut.execute(['-d', ',', '-f', '1'], '/', 'a,b,c')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('a')
    })
  })

  describe('SedCommand', () => {
    it('should substitute text', async () => {
      const sed = new SedCommand(fs)
      const result = await sed.execute(['s/line/LINE/', 'test.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('LINE1')
    })

    it('should support global flag', async () => {
      await fs.writeFile('/home/repeat.txt', 'aaa')
      const sed = new SedCommand(fs)
      const result = await sed.execute(['s/a/b/g', 'repeat.txt'], '/home')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('bbb')
    })

    it('should work with pipe input', async () => {
      const sed = new SedCommand(fs)
      const result = await sed.execute(['s/old/new/'], '/', 'old text')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('new text')
    })
  })

  describe('TrCommand', () => {
    it('should translate characters', async () => {
      const tr = new TrCommand()
      const result = await tr.execute(['a-z', 'A-Z'], '/', 'hello')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('HELLO')
    })

    it('should delete characters with -d', async () => {
      const tr = new TrCommand()
      const result = await tr.execute(['-d', 'aeiou'], '/', 'hello')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hll')
    })
  })

  describe('FindCommand', () => {
    it('should find files', async () => {
      await fs.mkdir('/home/sub', { recursive: true })
      await fs.writeFile('/home/sub/file.txt', 'content')
      const find = new FindCommand(fs)
      const result = await find.execute(['/home', '-name', '*.txt'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test.txt')
      expect(result.stdout).toContain('file.txt')
    })

    it('should filter by type', async () => {
      await fs.mkdir('/home/subdir', { recursive: true })
      const find = new FindCommand(fs)
      const result = await find.execute(['/home', '-type', 'd'], '/')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('subdir')
      expect(result.stdout).not.toContain('test.txt')
    })
  })
})
