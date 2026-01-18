import matter from 'gray-matter'
import type { SkillMetadata } from './types'

/**
 * Parsed SKILL.md content
 */
export interface ParsedSkillFile {
  metadata: SkillMetadata
  body: string
}

/**
 * Raw frontmatter data from SKILL.md
 */
interface RawFrontmatter {
  name?: string
  description?: string
  when_to_use?: string
  [key: string]: unknown
}

/**
 * Parse a SKILL.md file content
 * @param content - Raw markdown content with frontmatter
 * @returns Parsed metadata and body
 * @throws Error if required fields are missing
 */
export function parseSkillFile(content: string): ParsedSkillFile {
  const { data, content: body } = matter(content)
  const frontmatter = data as RawFrontmatter

  // Validate required fields
  if (!frontmatter.name) {
    throw new Error('SKILL.md missing required field: name')
  }
  if (!frontmatter.description) {
    throw new Error('SKILL.md missing required field: description')
  }

  // Build trigger text from description and optional when_to_use
  const trigger = frontmatter.when_to_use
    ? `${frontmatter.description} ${frontmatter.when_to_use}`
    : frontmatter.description

  const metadata: SkillMetadata = {
    name: frontmatter.name,
    description: frontmatter.description,
    when_to_use: frontmatter.when_to_use,
    trigger,
  }

  return {
    metadata,
    body: body.trim(),
  }
}

/**
 * Validate skill metadata
 * @param metadata - Metadata to validate
 * @returns True if valid
 */
export function isValidMetadata(metadata: unknown): metadata is SkillMetadata {
  if (!metadata || typeof metadata !== 'object') return false
  const m = metadata as Record<string, unknown>
  return (
    typeof m.name === 'string' &&
    m.name.length > 0 &&
    typeof m.description === 'string' &&
    m.description.length > 0 &&
    typeof m.trigger === 'string'
  )
}

/**
 * Extract skill ID from path
 * @param skillPath - Path to skill folder
 * @returns Skill ID (folder name)
 */
export function extractSkillId(skillPath: string): string {
  const parts = skillPath.replace(/\/$/, '').split('/')
  return parts[parts.length - 1]
}
