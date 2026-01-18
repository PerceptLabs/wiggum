import type { JSRuntimeFS } from '../fs/types'
import type { Skill, SkillEntry, SkillMetadata, SkillSource, SkillSearchPaths } from './types'
import { DEFAULT_SKILL_PATHS } from './types'
import { loadSkill, loadSkillEntry, loadResource, isValidSkillPath } from './loader'
import { parseSkillFile } from './parser'

/**
 * Skill registry for discovering and loading skills
 */
export class SkillRegistry {
  private fs: JSRuntimeFS
  private searchPaths: SkillSearchPaths
  private projectRoot: string | null
  private cache: Map<string, Skill> = new Map()
  private entryCache: Map<string, SkillEntry> = new Map()

  constructor(
    fs: JSRuntimeFS,
    options: {
      searchPaths?: Partial<SkillSearchPaths>
      projectRoot?: string
    } = {}
  ) {
    this.fs = fs
    this.searchPaths = { ...DEFAULT_SKILL_PATHS, ...options.searchPaths }
    this.projectRoot = options.projectRoot || null
  }

  /**
   * Set the current project root
   */
  setProjectRoot(root: string | null): void {
    this.projectRoot = root
    // Clear project skills from cache
    for (const [key, entry] of this.entryCache.entries()) {
      if (entry.source === 'project') {
        this.entryCache.delete(key)
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get all search paths in priority order
   */
  private getSearchPaths(): Array<{ path: string; source: SkillSource }> {
    const paths: Array<{ path: string; source: SkillSource }> = []

    // Project skills (highest priority)
    if (this.projectRoot) {
      paths.push({
        path: `${this.projectRoot}/${this.searchPaths.projectRelative}`,
        source: 'project',
      })
    }

    // User skills
    const userPath = this.searchPaths.user.replace('~', '/home')
    paths.push({ path: userPath, source: 'user' })

    // Built-in skills (lowest priority)
    paths.push({ path: this.searchPaths.builtin, source: 'builtin' })

    return paths
  }

  /**
   * Discover all available skills
   */
  async discover(): Promise<SkillEntry[]> {
    const entries: SkillEntry[] = []
    const seenIds = new Set<string>()

    for (const { path, source } of this.getSearchPaths()) {
      try {
        const skillDirs = await this.fs.readdir(path)

        for (const dir of skillDirs as string[]) {
          // Skip if already found in higher-priority path
          if (seenIds.has(dir)) continue

          const skillPath = `${path}/${dir}`

          // Check if it's a valid skill
          if (await isValidSkillPath(this.fs, skillPath)) {
            const entry = await loadSkillEntry(this.fs, skillPath, source)
            entries.push(entry)
            seenIds.add(dir)

            // Cache the entry
            this.entryCache.set(dir, entry)
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return entries
  }

  /**
   * Get skill metadata by ID (lightweight)
   */
  async getMetadata(id: string): Promise<SkillMetadata | null> {
    // Check cache first
    const cached = this.cache.get(id)
    if (cached) {
      return cached.metadata
    }

    // Find skill path
    const entry = await this.findSkill(id)
    if (!entry) return null

    // Load and parse just the SKILL.md
    try {
      const content = await this.fs.readFile(`${entry.path}/SKILL.md`, { encoding: 'utf8' })
      const { metadata } = parseSkillFile(content as string)
      return metadata
    } catch {
      return null
    }
  }

  /**
   * Load a full skill by ID
   */
  async load(id: string): Promise<Skill | null> {
    // Check cache first
    const cached = this.cache.get(id)
    if (cached) {
      return cached
    }

    // Find skill path
    const entry = await this.findSkill(id)
    if (!entry) return null

    // Load full skill
    try {
      const skill = await loadSkill(this.fs, entry.path, entry.source)
      this.cache.set(id, skill)
      return skill
    } catch {
      return null
    }
  }

  /**
   * Load a specific resource from a skill
   */
  async loadResource(skillId: string, resourcePath: string): Promise<string | null> {
    const skill = await this.load(skillId)
    if (!skill) return null

    try {
      return await loadResource(this.fs, skill, resourcePath)
    } catch {
      return null
    }
  }

  /**
   * Find a skill entry by ID
   */
  private async findSkill(id: string): Promise<SkillEntry | null> {
    // Check entry cache first
    const cached = this.entryCache.get(id)
    if (cached) {
      return cached
    }

    // Search all paths
    for (const { path, source } of this.getSearchPaths()) {
      const skillPath = `${path}/${id}`
      if (await isValidSkillPath(this.fs, skillPath)) {
        const entry = await loadSkillEntry(this.fs, skillPath, source)
        this.entryCache.set(id, entry)
        return entry
      }
    }

    return null
  }

  /**
   * Check if a skill exists
   */
  async exists(id: string): Promise<boolean> {
    return (await this.findSkill(id)) !== null
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
    this.entryCache.clear()
  }

  /**
   * Search skills by matching against trigger text
   */
  async search(query: string): Promise<SkillEntry[]> {
    const entries = await this.discover()
    const queryLower = query.toLowerCase()
    const matches: Array<{ entry: SkillEntry; score: number }> = []

    for (const entry of entries) {
      const metadata = await this.getMetadata(entry.id)
      if (!metadata) continue

      const triggerLower = metadata.trigger.toLowerCase()

      // Simple matching: check if query words are in trigger
      const queryWords = queryLower.split(/\s+/)
      const matchCount = queryWords.filter((word) => triggerLower.includes(word)).length
      const score = matchCount / queryWords.length

      if (score > 0) {
        matches.push({ entry, score })
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    return matches.map((m) => m.entry)
  }
}

/**
 * Create a skill registry instance
 */
export function createSkillRegistry(
  fs: JSRuntimeFS,
  options?: {
    searchPaths?: Partial<SkillSearchPaths>
    projectRoot?: string
  }
): SkillRegistry {
  return new SkillRegistry(fs, options)
}
