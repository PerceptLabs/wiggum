import type { JSRuntimeFS } from '../fs/types'
import type { Skill, SkillFormat, SkillResource, SkillSource, SkillEntry } from './types'
import { parseSkillFile, extractSkillId } from './parser'

/**
 * Detect skill format based on folder structure
 * - claude: Has subfolders (scripts/, references/, assets/)
 * - nutstack: Only SKILL.md, no subfolders
 */
export async function detectFormat(fs: JSRuntimeFS, skillPath: string): Promise<SkillFormat> {
  const subfolders = ['scripts', 'references', 'assets']

  for (const subfolder of subfolders) {
    const subPath = `${skillPath}/${subfolder}`
    try {
      const stat = await fs.stat(subPath)
      if (stat.isDirectory()) {
        return 'claude'
      }
    } catch {
      // Subfolder doesn't exist, continue checking
    }
  }

  return 'nutstack'
}

/**
 * Get resource type from path
 */
function getResourceType(path: string): SkillResource['type'] {
  if (path.startsWith('scripts/')) return 'script'
  if (path.startsWith('references/')) return 'reference'
  if (path.startsWith('assets/')) return 'asset'
  return 'other'
}

/**
 * Recursively list files in a directory
 */
async function listFilesRecursive(
  fs: JSRuntimeFS,
  basePath: string,
  relativePath = ''
): Promise<string[]> {
  const files: string[] = []
  const currentPath = relativePath ? `${basePath}/${relativePath}` : basePath

  try {
    const entries = await fs.readdir(currentPath)

    for (const entry of entries) {
      const entryRelative = relativePath ? `${relativePath}/${entry}` : entry
      const fullPath = `${basePath}/${entryRelative}`

      try {
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          const subFiles = await listFilesRecursive(fs, basePath, entryRelative)
          files.push(...subFiles)
        } else {
          files.push(entryRelative)
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files
}

/**
 * Discover resources in a Claude-format skill folder
 */
async function discoverResources(fs: JSRuntimeFS, skillPath: string): Promise<SkillResource[]> {
  const resources: SkillResource[] = []
  const subfolders = ['scripts', 'references', 'assets']

  for (const subfolder of subfolders) {
    const subPath = `${skillPath}/${subfolder}`
    const files = await listFilesRecursive(fs, subPath)

    for (const file of files) {
      resources.push({
        path: `${subfolder}/${file}`,
        type: getResourceType(`${subfolder}/${file}`),
      })
    }
  }

  return resources
}

/**
 * Load a skill from a path
 */
export async function loadSkill(
  fs: JSRuntimeFS,
  skillPath: string,
  source: SkillSource
): Promise<Skill> {
  const skillMdPath = `${skillPath}/SKILL.md`

  // Read SKILL.md
  const content = await fs.readFile(skillMdPath, 'utf8')
  const { metadata, body } = parseSkillFile(content)

  // Detect format
  const format = await detectFormat(fs, skillPath)

  // Build skill object
  const skill: Skill = {
    id: extractSkillId(skillPath),
    format,
    metadata,
    body,
    path: skillPath,
    source,
  }

  // For Claude format, discover resources
  if (format === 'claude') {
    skill.resources = await discoverResources(fs, skillPath)
  }

  return skill
}

/**
 * Load a specific resource from a skill
 */
export async function loadResource(
  fs: JSRuntimeFS,
  skill: Skill,
  resourcePath: string
): Promise<string> {
  if (skill.format !== 'claude') {
    throw new Error('Resources only available for Claude-format skills')
  }

  const fullPath = `${skill.path}/${resourcePath}`
  return fs.readFile(fullPath, 'utf8')
}

/**
 * Load skill metadata only (for listing)
 */
export async function loadSkillEntry(
  fs: JSRuntimeFS,
  skillPath: string,
  source: SkillSource
): Promise<SkillEntry> {
  const format = await detectFormat(fs, skillPath)

  return {
    id: extractSkillId(skillPath),
    format,
    path: skillPath,
    source,
  }
}

/**
 * Check if a path contains a valid skill
 */
export async function isValidSkillPath(fs: JSRuntimeFS, skillPath: string): Promise<boolean> {
  try {
    const skillMdPath = `${skillPath}/SKILL.md`
    const stat = await fs.stat(skillMdPath)
    return stat.isFile()
  } catch {
    return false
  }
}
