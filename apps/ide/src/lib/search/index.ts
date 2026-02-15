/**
 * Orama-based semantic search for skills
 *
 * Provides typo-tolerant, relevance-ranked search across skill content.
 * Skills are parsed into sections and indexed on first access.
 */
import { create, insert, search } from '@orama/orama'
import type { Orama, Results } from '@orama/orama'

// Schema for searchable content
const schema = {
  type: 'string', // 'skill' | 'code' | 'component' | 'error'
  source: 'string', // skill id or file path
  section: 'string', // section header (e.g., "## Accessibility")
  content: 'string', // the actual content
  keywords: 'string', // extracted keywords for boosting
} as const

export type SearchDocument = {
  type: string
  source: string
  section: string
  content: string
  keywords: string
}

export type SearchDb = Orama<typeof schema>

/**
 * Create and initialize the search database
 */
export async function initSearchIndex(): Promise<SearchDb> {
  return create({ schema })
}

/**
 * Semantic search within a specific type
 */
export async function semanticSearch(
  db: SearchDb,
  type: string,
  query: string,
  limit = 5
): Promise<Results<SearchDocument>> {
  return search(db, {
    term: query,
    where: { type },
    limit,
    tolerance: 2, // typo tolerance
  })
}

/**
 * Parse a skill into indexable sections
 */
export function parseSkillIntoSections(skillId: string, content: string): SearchDocument[] {
  const sections: SearchDocument[] = []
  const parts = content.split(/^## /gm)

  for (const part of parts) {
    if (!part.trim()) continue

    const lines = part.split('\n')
    const sectionTitle = lines[0]?.trim() || 'Overview'
    const sectionContent = lines.slice(1).join('\n').trim()

    if (!sectionContent) continue

    // Extract keywords from headers, code blocks, bold text
    const keywords = extractKeywords(sectionContent)

    sections.push({
      type: 'skill',
      source: skillId,
      section: sectionTitle,
      content: sectionContent,
      keywords: keywords.join(' '),
    })
  }

  return sections
}

function extractKeywords(content: string): string[] {
  const keywords: string[] = []

  // Extract ### headers
  const headers = content.match(/^### .+$/gm) || []
  keywords.push(...headers.map((h) => h.replace('### ', '')))

  // Extract **bold** text
  const bold = content.match(/\*\*([^*]+)\*\*/g) || []
  keywords.push(...bold.map((b) => b.replace(/\*\*/g, '')))

  // Extract CRITICAL, REQUIRED, etc. markers
  const markers = content.match(/\b(CRITICAL|REQUIRED|NEVER|ALWAYS|MUST)\b/gi) || []
  keywords.push(...markers)

  return [...new Set(keywords)]
}

/**
 * Index all skills into the database
 */
export async function indexSkills(
  db: SearchDb,
  skills: Array<{ id: string; content: string }>
): Promise<void> {
  for (const skill of skills) {
    const sections = parseSkillIntoSections(skill.id, skill.content)
    for (const section of sections) {
      await insert(db, section)
    }
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let searchDb: SearchDb | null = null
let initPromise: Promise<SearchDb> | null = null

/**
 * Get or initialize the search database (singleton)
 * Lazily initializes on first access
 */
export async function getSearchDb(): Promise<SearchDb> {
  if (searchDb) return searchDb

  if (!initPromise) {
    initPromise = (async () => {
      const db = await initSearchIndex()
      // Dynamic import to avoid circular dependency
      const { getSkillsRaw } = await import('../ralph/skills')
      await indexSkills(db, getSkillsRaw())

      // Index package registry entries for grep package support
      const { getPackagesForSearch } = await import('../packages/registry')
      const pkgs = getPackagesForSearch()
      for (const pkg of pkgs) {
        await insert(db, {
          type: 'package',
          source: pkg.id,
          section: 'registry',
          content: pkg.content,
          keywords: pkg.keywords,
        })
      }

      searchDb = db
      console.log('[Search] Indexed skills:', getSkillsRaw().length, '+ packages:', pkgs.length)
      return db
    })()
  }

  return initPromise
}

/**
 * Sync version - returns null if not yet initialized
 */
export function getSearchDbSync(): SearchDb | null {
  return searchDb
}
