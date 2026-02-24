/**
 * Dual-mode promotion tests for grep, search, replace, preview.
 *
 * Tests parseCliArgs mapping, flat schema validation (safeParse),
 * and JSON schema generation for each promoted command.
 */

import { describe, it, expect } from 'vitest'
import { GrepCommand, GrepRegexSchema, SearchSchema } from '../commands/grep'
import { ReplaceCommand } from '../commands/replace'
import { PreviewCommand } from '../commands/preview'
import { SedCommand, SedSubstituteSchema, SedLineSchema } from '../commands/sed'
import { FindCommand, FindSchema } from '../commands/find'

// ============================================================================
// GREP (regex — flat schema via additionalTools)
// ============================================================================

describe('GrepCommand dual-mode', () => {
  const cmd = new GrepCommand()

  describe('parseCliArgs', () => {
    it('maps regex mode with flags', () => {
      const result = cmd.parseCliArgs!(['-rn', 'TODO', 'src/'])
      expect(result).toEqual({
        mode: 'regex',
        pattern: 'TODO',
        files: ['src/'],
        ignoreCase: undefined,
        recursive: true,
        lineNumbers: true,
        extendedRegex: undefined,
        filesOnly: undefined,
        afterContext: undefined,
        beforeContext: undefined,
      })
    })

    it('maps skill mode', () => {
      const result = cmd.parseCliArgs!(['skill', 'form', 'validation'])
      expect(result).toEqual({ mode: 'skill', query: 'form validation' })
    })

    it('maps package mode', () => {
      const result = cmd.parseCliArgs!(['package', 'date formatting'])
      expect(result).toEqual({ mode: 'package', query: 'date formatting' })
    })

    it('maps code mode', () => {
      const result = cmd.parseCliArgs!(['code', 'auth hook'])
      expect(result).toEqual({ mode: 'code', query: 'auth hook' })
    })

    it('maps context flags -A/-B/-C', () => {
      const result = cmd.parseCliArgs!(['-A', '3', '-B', '2', 'pattern', 'file.ts']) as any
      expect(result.afterContext).toBe(3)
      expect(result.beforeContext).toBe(2)
    })

    it('maps combined context flags -A5', () => {
      const result = cmd.parseCliArgs!(['-C2', 'pattern', 'file.ts']) as any
      expect(result.afterContext).toBe(2)
      expect(result.beforeContext).toBe(2)
    })
  })

  describe('GrepRegexSchema (flat)', () => {
    it('validates pattern + path', () => {
      const result = GrepRegexSchema.safeParse({ pattern: 'test', path: 'src/' })
      expect(result.success).toBe(true)
    })

    it('validates pattern only', () => {
      const result = GrepRegexSchema.safeParse({ pattern: 'test' })
      expect(result.success).toBe(true)
    })

    it('rejects empty pattern', () => {
      const result = GrepRegexSchema.safeParse({ pattern: '' })
      expect(result.success).toBe(false)
    })

    it('generates flat JSON schema (no anyOf/oneOf)', () => {
      const schema = GrepRegexSchema.toJSONSchema()
      expect(schema).toBeDefined()
      expect(schema.anyOf).toBeUndefined()
      expect(schema.oneOf).toBeUndefined()
    })
  })

  describe('additionalTools', () => {
    it('registers grep and search tools', () => {
      expect(cmd.additionalTools).toHaveLength(2)
      expect(cmd.additionalTools![0].name).toBe('grep')
      expect(cmd.additionalTools![1].name).toBe('search')
    })
  })
})

// ============================================================================
// SEARCH (skill/package/code — flat schema via additionalTools)
// ============================================================================

describe('SearchSchema (flat)', () => {
  it('validates query + scope', () => {
    const result = SearchSchema.safeParse({ query: 'forms', scope: 'skill' })
    expect(result.success).toBe(true)
  })

  it('validates query only (scope defaults)', () => {
    const result = SearchSchema.safeParse({ query: 'forms' })
    expect(result.success).toBe(true)
  })

  it('rejects empty query', () => {
    const result = SearchSchema.safeParse({ query: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid scope', () => {
    const result = SearchSchema.safeParse({ query: 'test', scope: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('generates flat JSON schema (no anyOf/oneOf)', () => {
    const schema = SearchSchema.toJSONSchema()
    expect(schema).toBeDefined()
    expect(schema.anyOf).toBeUndefined()
    expect(schema.oneOf).toBeUndefined()
  })
})

// ============================================================================
// REPLACE
// ============================================================================

describe('ReplaceCommand dual-mode', () => {
  const cmd = new ReplaceCommand()

  describe('parseCliArgs', () => {
    it('maps positional args', () => {
      const result = cmd.parseCliArgs!(['src/App.tsx', 'old text', 'new text'])
      expect(result).toEqual({
        file: 'src/App.tsx',
        old: 'old text',
        new: 'new text',
        whitespaceTolerant: undefined,
      })
    })

    it('maps -w flag', () => {
      const result = cmd.parseCliArgs!(['-w', 'src/App.tsx', 'old', 'new']) as any
      expect(result.whitespaceTolerant).toBe(true)
      expect(result.file).toBe('src/App.tsx')
    })
  })

  describe('argsSchema', () => {
    it('validates complete args', () => {
      const result = cmd.argsSchema!.safeParse({ file: 'test.ts', old: 'x', new: 'y' })
      expect(result.success).toBe(true)
    })

    it('rejects empty file', () => {
      const result = cmd.argsSchema!.safeParse({ file: '', old: 'x', new: 'y' })
      expect(result.success).toBe(false)
    })

    it('rejects empty old string', () => {
      const result = cmd.argsSchema!.safeParse({ file: 'f.ts', old: '', new: 'y' })
      expect(result.success).toBe(false)
    })

    it('generates JSON schema', () => {
      const schema = cmd.argsSchema!.toJSONSchema()
      expect(schema).toBeDefined()
    })
  })
})

// ============================================================================
// PREVIEW
// ============================================================================

describe('PreviewCommand dual-mode', () => {
  const cmd = new PreviewCommand()

  describe('parseCliArgs', () => {
    it('defaults to build action', () => {
      const result = cmd.parseCliArgs!([])
      expect(result).toEqual({ action: 'build' })
    })

    it('maps explicit build action', () => {
      const result = cmd.parseCliArgs!(['build'])
      expect(result).toEqual({ action: 'build' })
    })
  })

  describe('argsSchema', () => {
    it('validates build action', () => {
      const result = cmd.argsSchema!.safeParse({ action: 'build' })
      expect(result.success).toBe(true)
    })

    it('validates empty object (defaults to build)', () => {
      const result = cmd.argsSchema!.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.action).toBe('build')
    })

    it('generates JSON schema', () => {
      const schema = cmd.argsSchema!.toJSONSchema()
      expect(schema).toBeDefined()
    })
  })
})

// ============================================================================
// SED (substitute + line — flat schemas via additionalTools)
// ============================================================================

describe('SedCommand dual-mode', () => {
  const cmd = new SedCommand()

  describe('SedSubstituteSchema (flat)', () => {
    it('validates file + pattern + replacement', () => {
      const result = SedSubstituteSchema.safeParse({ file: 'src/App.tsx', pattern: 'old', replacement: 'new' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.inPlace).toBe(true) // default
    })

    it('validates with explicit flags and inPlace', () => {
      const result = SedSubstituteSchema.safeParse({ file: 'f.ts', pattern: 'a', replacement: 'b', flags: 'gi', inPlace: false })
      expect(result.success).toBe(true)
    })

    it('rejects empty pattern', () => {
      const result = SedSubstituteSchema.safeParse({ file: 'f.ts', pattern: '', replacement: 'x' })
      expect(result.success).toBe(false)
    })

    it('rejects empty file', () => {
      const result = SedSubstituteSchema.safeParse({ file: '', pattern: 'x', replacement: 'y' })
      expect(result.success).toBe(false)
    })

    it('generates flat JSON schema (no anyOf/oneOf)', () => {
      const schema = SedSubstituteSchema.toJSONSchema()
      expect(schema).toBeDefined()
      expect(schema.anyOf).toBeUndefined()
      expect(schema.oneOf).toBeUndefined()
    })
  })

  describe('SedLineSchema (flat)', () => {
    it('validates file + lineNumber + action', () => {
      const result = SedLineSchema.safeParse({ file: 'src/App.tsx', lineNumber: 5, action: 'delete' })
      expect(result.success).toBe(true)
    })

    it('validates with content for replace', () => {
      const result = SedLineSchema.safeParse({ file: 'f.ts', lineNumber: 1, action: 'replace', content: 'new line' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid action', () => {
      const result = SedLineSchema.safeParse({ file: 'f.ts', lineNumber: 1, action: 'append' })
      expect(result.success).toBe(false)
    })

    it('rejects line number 0', () => {
      const result = SedLineSchema.safeParse({ file: 'f.ts', lineNumber: 0, action: 'delete' })
      expect(result.success).toBe(false)
    })

    it('generates flat JSON schema (no anyOf/oneOf)', () => {
      const schema = SedLineSchema.toJSONSchema()
      expect(schema).toBeDefined()
      expect(schema.anyOf).toBeUndefined()
      expect(schema.oneOf).toBeUndefined()
    })
  })

  describe('additionalTools', () => {
    it('registers sed and sed_line tools', () => {
      expect(cmd.additionalTools).toHaveLength(2)
      expect(cmd.additionalTools![0].name).toBe('sed')
      expect(cmd.additionalTools![1].name).toBe('sed_line')
    })
  })
})

// ============================================================================
// FIND (flat schema via additionalTools)
// ============================================================================

describe('FindCommand dual-mode', () => {
  const cmd = new FindCommand()

  describe('FindSchema (flat)', () => {
    it('validates path + name + type', () => {
      const result = FindSchema.safeParse({ path: 'src', name: '*.tsx', type: 'f' })
      expect(result.success).toBe(true)
    })

    it('validates empty object (all optional, path defaults to ".")', () => {
      const result = FindSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.path).toBe('.')
    })

    it('validates name only', () => {
      const result = FindSchema.safeParse({ name: '*.css' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid type', () => {
      const result = FindSchema.safeParse({ type: 'x' })
      expect(result.success).toBe(false)
    })

    it('generates flat JSON schema (no anyOf/oneOf)', () => {
      const schema = FindSchema.toJSONSchema()
      expect(schema).toBeDefined()
      expect(schema.anyOf).toBeUndefined()
      expect(schema.oneOf).toBeUndefined()
    })
  })

  describe('additionalTools', () => {
    it('registers find tool', () => {
      expect(cmd.additionalTools).toHaveLength(1)
      expect(cmd.additionalTools![0].name).toBe('find')
    })
  })
})
