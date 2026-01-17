import { describe, it, expect, beforeEach } from 'vitest'
import { LightningFSAdapter } from './LightningFSAdapter'

describe('LightningFSAdapter', () => {
  let fs: LightningFSAdapter

  beforeEach(() => {
    // Create a fresh filesystem for each test
    fs = new LightningFSAdapter('test-fs-' + Date.now(), { wipe: true })
  })

  describe('writeFile and readFile', () => {
    it('should write and read a text file with encoding', async () => {
      await fs.writeFile('/test.txt', 'Hello, World!')
      const content = await fs.readFile('/test.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello, World!')
    })

    it('should write and read binary data', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      await fs.writeFile('/binary.bin', data)
      const content = await fs.readFile('/binary.bin')
      // LightningFS returns Buffer in Node.js, Uint8Array in browser
      // Both are ArrayBufferView, so convert to array for comparison
      expect(Array.from(content as Uint8Array)).toEqual([1, 2, 3, 4, 5])
    })

    it('should overwrite existing files', async () => {
      await fs.writeFile('/test.txt', 'First')
      await fs.writeFile('/test.txt', 'Second')
      const content = await fs.readFile('/test.txt', { encoding: 'utf8' })
      expect(content).toBe('Second')
    })
  })

  describe('mkdir and readdir', () => {
    it('should create a directory', async () => {
      await fs.mkdir('/mydir')
      const stat = await fs.stat('/mydir')
      expect(stat.isDirectory()).toBe(true)
    })

    it('should create directories recursively', async () => {
      await fs.mkdir('/a/b/c', { recursive: true })
      const stat = await fs.stat('/a/b/c')
      expect(stat.isDirectory()).toBe(true)
    })

    it('should list directory contents', async () => {
      await fs.mkdir('/dir')
      await fs.writeFile('/dir/file1.txt', 'content1')
      await fs.writeFile('/dir/file2.txt', 'content2')

      const entries = await fs.readdir('/dir')
      expect(entries).toContain('file1.txt')
      expect(entries).toContain('file2.txt')
      expect(entries.length).toBe(2)
    })

    it('should list directory with file types', async () => {
      await fs.mkdir('/dir')
      await fs.mkdir('/dir/subdir')
      await fs.writeFile('/dir/file.txt', 'content')

      const entries = await fs.readdir('/dir', { withFileTypes: true })
      expect(entries).toEqual(
        expect.arrayContaining([
          { name: 'subdir', type: 'dir' },
          { name: 'file.txt', type: 'file' },
        ])
      )
    })
  })

  describe('stat and lstat', () => {
    it('should return file stats', async () => {
      await fs.writeFile('/file.txt', 'Hello')
      const stat = await fs.stat('/file.txt')

      expect(stat.isFile()).toBe(true)
      expect(stat.isDirectory()).toBe(false)
      expect(stat.type).toBe('file')
      expect(stat.size).toBe(5)
      expect(typeof stat.mtimeMs).toBe('number')
    })

    it('should return directory stats', async () => {
      await fs.mkdir('/mydir')
      const stat = await fs.stat('/mydir')

      expect(stat.isFile()).toBe(false)
      expect(stat.isDirectory()).toBe(true)
      expect(stat.type).toBe('dir')
    })

    it('should throw for non-existent paths', async () => {
      await expect(fs.stat('/nonexistent')).rejects.toThrow()
    })
  })

  describe('unlink', () => {
    it('should delete a file', async () => {
      await fs.writeFile('/file.txt', 'content')
      await fs.unlink('/file.txt')
      await expect(fs.stat('/file.txt')).rejects.toThrow()
    })
  })

  describe('rmdir', () => {
    it('should delete an empty directory', async () => {
      await fs.mkdir('/emptydir')
      await fs.rmdir('/emptydir')
      await expect(fs.stat('/emptydir')).rejects.toThrow()
    })

    it('should delete directory recursively', async () => {
      await fs.mkdir('/dir/subdir', { recursive: true })
      await fs.writeFile('/dir/file.txt', 'content')
      await fs.writeFile('/dir/subdir/nested.txt', 'nested')

      await fs.rmdir('/dir', { recursive: true })
      await expect(fs.stat('/dir')).rejects.toThrow()
    })
  })

  describe('rename', () => {
    it('should rename a file', async () => {
      await fs.writeFile('/old.txt', 'content')
      await fs.rename('/old.txt', '/new.txt')

      await expect(fs.stat('/old.txt')).rejects.toThrow()
      const content = await fs.readFile('/new.txt', { encoding: 'utf8' })
      expect(content).toBe('content')
    })

    it('should move a file to a different directory', async () => {
      await fs.mkdir('/target')
      await fs.writeFile('/file.txt', 'content')
      await fs.rename('/file.txt', '/target/file.txt')

      await expect(fs.stat('/file.txt')).rejects.toThrow()
      const content = await fs.readFile('/target/file.txt', { encoding: 'utf8' })
      expect(content).toBe('content')
    })
  })

  describe('exists', () => {
    it('should return true for existing files', async () => {
      await fs.writeFile('/exists.txt', 'content')
      expect(await fs.exists('/exists.txt')).toBe(true)
    })

    it('should return true for existing directories', async () => {
      await fs.mkdir('/existsdir')
      expect(await fs.exists('/existsdir')).toBe(true)
    })

    it('should return false for non-existent paths', async () => {
      expect(await fs.exists('/nonexistent')).toBe(false)
    })
  })

  describe('symlink and readlink', () => {
    it('should create and read symlinks', async () => {
      await fs.writeFile('/target.txt', 'target content')
      await fs.symlink('/target.txt', '/link.txt')

      const target = await fs.readlink('/link.txt')
      expect(target).toBe('/target.txt')
    })

    it('should identify symlinks with lstat', async () => {
      await fs.writeFile('/target.txt', 'content')
      await fs.symlink('/target.txt', '/link.txt')

      const stat = await fs.lstat('/link.txt')
      expect(stat.isSymbolicLink()).toBe(true)
    })
  })

  describe('rawFs', () => {
    it('should expose the underlying LightningFS instance', () => {
      expect(fs.rawFs).toBeDefined()
      expect(fs.rawFs.promises).toBeDefined()
    })
  })
})
