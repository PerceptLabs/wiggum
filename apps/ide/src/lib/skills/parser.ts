import type { SkillMetadata } from './types'

/**
 * Parsed SKILL.md content
 */
export interface ParsedSkillFile {
  metadata: SkillMetadata
  body: string
}

/**
 * Parse simple YAML frontmatter (browser-native, no Buffer dependency)
 * Only handles key: value pairs - no nested objects or arrays
 */
function parseFrontmatter(content: string): { data: Record<string, string>; body: string } {
  const lines = content.split('\n')

  // Must start with ---
  if (lines[0]?.trim() !== '---') {
    return { data: {}, body: content }
  }

  // Find closing ---
  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    return { data: {}, body: content }
  }

  // Parse key: value pairs
  const data: Record<string, string> = {}
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i]
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      if (key) {
        data[key] = value
      }
    }
  }

  // Body is everything after closing ---
  const body = lines.slice(endIndex + 1).join('\n')

  return { data, body }
}

/**
 * Parse a SKILL.md file content
 * @param content - Raw markdown content with frontmatter
 * @returns Parsed metadata and body
 * @throws Error if required fields are missing
 */
export function parseSkillFile(content: string): ParsedSkillFile {
  const { data, body } = parseFrontmatter(content)

  // Validate required fields
  if (!data.name) {
    throw new Error('SKILL.md missing required field: name')
  }
  if (!data.description) {
    throw new Error('SKILL.md missing required field: description')
  }

  // Build trigger text from description and optional when_to_use
  const trigger = data.when_to_use
    ? `${data.description} ${data.when_to_use}`
    : data.description

  const metadata: SkillMetadata = {
    name: data.name,
    description: data.description,
    when_to_use: data.when_to_use,
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
