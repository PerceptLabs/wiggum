/**
 * Skill format types
 * - claude: Folder-based with SKILL.md, scripts/, references/, assets/
 * - nutstack: Single-file SKILL.md with all content inline
 */
export type SkillFormat = 'claude' | 'nutstack'

/**
 * Skill metadata parsed from SKILL.md frontmatter
 */
export interface SkillMetadata {
  /** Skill name (required) */
  name: string
  /** Skill description (required) */
  description: string
  /** When to use this skill (optional, Nutstack extension) */
  when_to_use?: string
  /** Combined trigger text (description + when_to_use) */
  trigger: string
}

/**
 * Resource file within a skill folder
 */
export interface SkillResource {
  /** Resource path relative to skill folder */
  path: string
  /** Resource type based on parent folder */
  type: 'script' | 'reference' | 'asset' | 'other'
  /** Resource content (loaded on demand) */
  content?: string
}

/**
 * Full skill definition
 */
export interface Skill {
  /** Skill identifier (folder name) */
  id: string
  /** Skill format */
  format: SkillFormat
  /** Skill metadata from frontmatter */
  metadata: SkillMetadata
  /** Skill body content from SKILL.md */
  body: string
  /** Path to skill folder */
  path: string
  /** Source of the skill */
  source: SkillSource
  /** Available resources (folder format only) */
  resources?: SkillResource[]
}

/**
 * Skill source location
 */
export type SkillSource = 'builtin' | 'user' | 'project'

/**
 * Skill discovery result (lightweight, for listing)
 */
export interface SkillEntry {
  /** Skill identifier */
  id: string
  /** Skill format */
  format: SkillFormat
  /** Path to skill folder */
  path: string
  /** Source of the skill */
  source: SkillSource
}

/**
 * Search paths configuration
 */
export interface SkillSearchPaths {
  /** Built-in skills path */
  builtin: string
  /** User skills path */
  user: string
  /** Project skills path (relative to project root) */
  projectRelative: string
}

/**
 * Default search paths
 */
export const DEFAULT_SKILL_PATHS: SkillSearchPaths = {
  builtin: 'src/skills',
  user: '~/.wiggum/skills',
  projectRelative: '.wiggum/skills',
}
