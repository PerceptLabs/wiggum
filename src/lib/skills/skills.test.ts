import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseSkillFile, isValidMetadata, extractSkillId } from './parser'
import { detectFormat, loadSkill, loadResource, isValidSkillPath } from './loader'
import { SkillRegistry } from './registry'
import type { JSRuntimeFS, StatResult } from '../fs/types'

// Mock filesystem helper
function createMockFS(files: Record<string, string>): JSRuntimeFS {
  return {
    readFile: vi.fn(async (path: string) => {
      if (files[path] === undefined) {
        throw new Error(`ENOENT: no such file or directory: ${path}`)
      }
      return files[path]
    }),
    writeFile: vi.fn(),
    readdir: vi.fn(async (path: string) => {
      const prefix = path.endsWith('/') ? path : `${path}/`
      const entries = new Set<string>()

      for (const filePath of Object.keys(files)) {
        if (filePath.startsWith(prefix)) {
          const rest = filePath.slice(prefix.length)
          const firstPart = rest.split('/')[0]
          if (firstPart) {
            entries.add(firstPart)
          }
        }
      }

      if (entries.size === 0 && !Object.keys(files).some((p) => p.startsWith(prefix))) {
        throw new Error(`ENOENT: no such directory: ${path}`)
      }

      return Array.from(entries)
    }),
    mkdir: vi.fn(),
    stat: vi.fn(async (path: string) => {
      // Check if it's a file
      if (files[path] !== undefined) {
        return {
          type: 'file',
          mode: 0o644,
          size: files[path].length,
          ino: 1,
          mtimeMs: Date.now(),
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
        } as StatResult
      }

      // Check if it's a directory (has files under it)
      const prefix = path.endsWith('/') ? path : `${path}/`
      const hasChildren = Object.keys(files).some((p) => p.startsWith(prefix))

      if (hasChildren) {
        return {
          type: 'dir',
          mode: 0o755,
          size: 0,
          ino: 1,
          mtimeMs: Date.now(),
          isFile: () => false,
          isDirectory: () => true,
          isSymbolicLink: () => false,
        } as StatResult
      }

      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }),
    lstat: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    rename: vi.fn(),
  }
}

describe('parseSkillFile', () => {
  it('parses valid SKILL.md with required fields', () => {
    const content = `---
name: test-skill
description: A test skill for testing
---

This is the skill body.
`
    const result = parseSkillFile(content)

    expect(result.metadata.name).toBe('test-skill')
    expect(result.metadata.description).toBe('A test skill for testing')
    expect(result.metadata.trigger).toBe('A test skill for testing')
    expect(result.body).toBe('This is the skill body.')
  })

  it('parses SKILL.md with when_to_use field', () => {
    const content = `---
name: complex-skill
description: A complex skill
when_to_use: Use when doing complex things
---

Body content.
`
    const result = parseSkillFile(content)

    expect(result.metadata.name).toBe('complex-skill')
    expect(result.metadata.when_to_use).toBe('Use when doing complex things')
    expect(result.metadata.trigger).toBe('A complex skill Use when doing complex things')
  })

  it('throws error when name is missing', () => {
    const content = `---
description: A skill without name
---

Body.
`
    expect(() => parseSkillFile(content)).toThrow('missing required field: name')
  })

  it('throws error when description is missing', () => {
    const content = `---
name: no-desc-skill
---

Body.
`
    expect(() => parseSkillFile(content)).toThrow('missing required field: description')
  })
})

describe('isValidMetadata', () => {
  it('returns true for valid metadata', () => {
    const metadata = {
      name: 'test',
      description: 'A test',
      trigger: 'A test',
    }
    expect(isValidMetadata(metadata)).toBe(true)
  })

  it('returns false for missing name', () => {
    const metadata = {
      description: 'A test',
      trigger: 'A test',
    }
    expect(isValidMetadata(metadata)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidMetadata(null)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isValidMetadata('string')).toBe(false)
  })
})

describe('extractSkillId', () => {
  it('extracts skill ID from path', () => {
    expect(extractSkillId('/path/to/my-skill')).toBe('my-skill')
    expect(extractSkillId('src/skills/ralph')).toBe('ralph')
    expect(extractSkillId('/skills/test/')).toBe('test')
  })
})

describe('detectFormat', () => {
  it('detects claude format when subfolders exist', async () => {
    const fs = createMockFS({
      '/skills/test/SKILL.md': '---\nname: test\ndescription: test\n---\nBody',
      '/skills/test/references/doc.md': 'content',
    })

    const format = await detectFormat(fs, '/skills/test')
    expect(format).toBe('claude')
  })

  it('detects nutstack format when no subfolders', async () => {
    const fs = createMockFS({
      '/skills/simple/SKILL.md': '---\nname: simple\ndescription: simple\n---\nBody',
    })

    const format = await detectFormat(fs, '/skills/simple')
    expect(format).toBe('nutstack')
  })
})

describe('loadSkill', () => {
  it('loads nutstack-format skill', async () => {
    const fs = createMockFS({
      '/skills/simple/SKILL.md': `---
name: simple
description: A simple skill
---

Simple skill body.
`,
    })

    const skill = await loadSkill(fs, '/skills/simple', 'builtin')

    expect(skill.id).toBe('simple')
    expect(skill.format).toBe('nutstack')
    expect(skill.metadata.name).toBe('simple')
    expect(skill.body).toBe('Simple skill body.')
    expect(skill.source).toBe('builtin')
    expect(skill.resources).toBeUndefined()
  })

  it('loads claude-format skill with resources', async () => {
    const fs = createMockFS({
      '/skills/advanced/SKILL.md': `---
name: advanced
description: An advanced skill
---

Advanced skill body.
`,
      '/skills/advanced/references/guide.md': 'Guide content',
      '/skills/advanced/scripts/run.sh': '#!/bin/bash\necho hello',
    })

    const skill = await loadSkill(fs, '/skills/advanced', 'user')

    expect(skill.id).toBe('advanced')
    expect(skill.format).toBe('claude')
    expect(skill.metadata.name).toBe('advanced')
    expect(skill.source).toBe('user')
    expect(skill.resources).toHaveLength(2)
    expect(skill.resources).toContainEqual({
      path: 'references/guide.md',
      type: 'reference',
    })
    expect(skill.resources).toContainEqual({
      path: 'scripts/run.sh',
      type: 'script',
    })
  })
})

describe('loadResource', () => {
  it('loads resource content from claude-format skill', async () => {
    const fs = createMockFS({
      '/skills/test/SKILL.md': '---\nname: test\ndescription: test\n---\nBody',
      '/skills/test/references/doc.md': 'Document content here',
    })

    const skill = await loadSkill(fs, '/skills/test', 'builtin')
    const content = await loadResource(fs, skill, 'references/doc.md')

    expect(content).toBe('Document content here')
  })

  it('throws for nutstack-format skill', async () => {
    const fs = createMockFS({
      '/skills/simple/SKILL.md': '---\nname: simple\ndescription: simple\n---\nBody',
    })

    const skill = await loadSkill(fs, '/skills/simple', 'builtin')

    await expect(loadResource(fs, skill, 'anything')).rejects.toThrow(
      'Resources only available for Claude-format skills'
    )
  })
})

describe('isValidSkillPath', () => {
  it('returns true when SKILL.md exists', async () => {
    const fs = createMockFS({
      '/skills/valid/SKILL.md': 'content',
    })

    expect(await isValidSkillPath(fs, '/skills/valid')).toBe(true)
  })

  it('returns false when SKILL.md missing', async () => {
    const fs = createMockFS({
      '/skills/invalid/README.md': 'content',
    })

    expect(await isValidSkillPath(fs, '/skills/invalid')).toBe(false)
  })
})

describe('SkillRegistry', () => {
  it('discovers skills from search paths', async () => {
    const fs = createMockFS({
      'src/skills/builtin-skill/SKILL.md': '---\nname: builtin\ndescription: Built-in\n---\nBody',
      '/home/.wiggum/skills/user-skill/SKILL.md': '---\nname: user\ndescription: User\n---\nBody',
    })

    const registry = new SkillRegistry(fs, {
      searchPaths: {
        builtin: 'src/skills',
        user: '/home/.wiggum/skills',
        projectRelative: '.wiggum/skills',
      },
    })

    const entries = await registry.discover()

    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.id)).toContain('builtin-skill')
    expect(entries.map((e) => e.id)).toContain('user-skill')
  })

  it('prioritizes project skills over user and builtin', async () => {
    const fs = createMockFS({
      'src/skills/shared/SKILL.md': '---\nname: builtin-shared\ndescription: Builtin\n---\nBody',
      '/project/.wiggum/skills/shared/SKILL.md':
        '---\nname: project-shared\ndescription: Project\n---\nBody',
    })

    const registry = new SkillRegistry(fs, {
      projectRoot: '/project',
      searchPaths: {
        builtin: 'src/skills',
        user: '/home/.wiggum/skills',
        projectRelative: '.wiggum/skills',
      },
    })

    const entries = await registry.discover()

    expect(entries).toHaveLength(1)
    expect(entries[0].source).toBe('project')
  })

  it('loads skill by ID', async () => {
    const fs = createMockFS({
      'src/skills/my-skill/SKILL.md': `---
name: my-skill
description: My skill description
---

Skill instructions.
`,
    })

    const registry = new SkillRegistry(fs, {
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    const skill = await registry.load('my-skill')

    expect(skill).not.toBeNull()
    expect(skill!.metadata.name).toBe('my-skill')
    expect(skill!.body).toBe('Skill instructions.')
  })

  it('returns null for non-existent skill', async () => {
    const fs = createMockFS({})

    const registry = new SkillRegistry(fs, {
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    const skill = await registry.load('non-existent')
    expect(skill).toBeNull()
  })

  it('loads resource from skill', async () => {
    const fs = createMockFS({
      'src/skills/test/SKILL.md': '---\nname: test\ndescription: test\n---\nBody',
      'src/skills/test/references/guide.md': 'Guide content',
    })

    const registry = new SkillRegistry(fs, {
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    const content = await registry.loadResource('test', 'references/guide.md')
    expect(content).toBe('Guide content')
  })

  it('searches skills by query', async () => {
    const fs = createMockFS({
      'src/skills/ralph/SKILL.md': `---
name: ralph
description: Autonomous iteration loop
when_to_use: Multi-step projects, large refactors
---
Body`,
      'src/skills/git/SKILL.md': `---
name: git
description: Git version control commands
---
Body`,
    })

    const registry = new SkillRegistry(fs, {
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    const results = await registry.search('autonomous iteration')

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('ralph')
  })

  it('caches loaded skills', async () => {
    const fs = createMockFS({
      'src/skills/cached/SKILL.md': '---\nname: cached\ndescription: cached\n---\nBody',
    })

    const registry = new SkillRegistry(fs, {
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    await registry.load('cached')
    await registry.load('cached')

    // readFile should only be called once due to caching
    expect(fs.readFile).toHaveBeenCalledTimes(1)
  })

  it('clears project cache when project root changes', async () => {
    const fs = createMockFS({
      '/project1/.wiggum/skills/proj-skill/SKILL.md':
        '---\nname: proj1\ndescription: proj1\n---\nBody',
      '/project2/.wiggum/skills/proj-skill/SKILL.md':
        '---\nname: proj2\ndescription: proj2\n---\nBody',
    })

    const registry = new SkillRegistry(fs, {
      projectRoot: '/project1',
      searchPaths: { builtin: 'src/skills', user: '/home/.wiggum/skills', projectRelative: '.wiggum/skills' },
    })

    const entries1 = await registry.discover()
    expect(entries1[0].source).toBe('project')

    registry.setProjectRoot('/project2')

    const entries2 = await registry.discover()
    expect(entries2[0].path).toContain('project2')
  })
})
