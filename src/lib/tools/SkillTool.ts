import { z } from 'zod'
import type { Tool, ToolResult } from './types'
import type { SkillRegistry, Skill } from '../skills'

/**
 * Parameters for the skill tool
 */
export interface SkillToolParams {
  /** Skill ID to load */
  skill_id: string
  /** Optional resource path to load (for folder-format skills) */
  resource?: string
}

/**
 * Skill tool that loads skill content for AI context
 * Supports both Claude (folder) and Nutstack (single-file) formats
 */
export class SkillTool implements Tool<SkillToolParams> {
  name = 'skill'
  description =
    'Load a skill to get instructions and context. Use resource param to load specific resources from folder-format skills.'

  inputSchema = z.object({
    skill_id: z.string().describe('The skill ID to load'),
    resource: z
      .string()
      .optional()
      .describe('Optional resource path to load (e.g., "references/patterns.md")'),
  })

  private registry: SkillRegistry

  constructor(registry: SkillRegistry) {
    this.registry = registry
  }

  async execute(params: SkillToolParams): Promise<ToolResult> {
    const { skill_id, resource } = params

    try {
      // Load skill
      const skill = await this.registry.load(skill_id)

      if (!skill) {
        return {
          content: `Error: Skill "${skill_id}" not found`,
          cost: 1,
        }
      }

      // If resource requested, load that specific resource
      if (resource) {
        return this.loadResource(skill, resource)
      }

      // Return full skill content
      return this.formatSkill(skill)
    } catch (err) {
      return {
        content: `Error loading skill: ${(err as Error).message}`,
        cost: 1,
      }
    }
  }

  /**
   * Format skill content for AI consumption
   */
  private formatSkill(skill: Skill): ToolResult {
    const lines: string[] = []

    // Header with metadata
    lines.push(`# Skill: ${skill.metadata.name}`)
    lines.push('')
    lines.push(`**Description:** ${skill.metadata.description}`)

    if (skill.metadata.when_to_use) {
      lines.push(`**When to use:** ${skill.metadata.when_to_use}`)
    }

    lines.push(`**Format:** ${skill.format}`)
    lines.push(`**Source:** ${skill.source}`)
    lines.push('')

    // Body content
    lines.push('## Instructions')
    lines.push('')
    lines.push(skill.body)

    // List available resources for folder-format skills
    if (skill.format === 'claude' && skill.resources && skill.resources.length > 0) {
      lines.push('')
      lines.push('## Available Resources')
      lines.push('')
      lines.push('Use the `resource` parameter to load any of these:')
      lines.push('')

      for (const resource of skill.resources) {
        lines.push(`- \`${resource.path}\` (${resource.type})`)
      }
    }

    return {
      content: lines.join('\n'),
      cost: 1,
    }
  }

  /**
   * Load a specific resource from a skill
   */
  private async loadResource(skill: Skill, resourcePath: string): Promise<ToolResult> {
    if (skill.format !== 'claude') {
      return {
        content: `Error: Resources only available for Claude-format skills. "${skill.id}" is ${skill.format}-format.`,
        cost: 1,
      }
    }

    const content = await this.registry.loadResource(skill.id, resourcePath)

    if (!content) {
      return {
        content: `Error: Resource "${resourcePath}" not found in skill "${skill.id}"`,
        cost: 1,
      }
    }

    return {
      content: `# Resource: ${resourcePath}\n\n${content}`,
      cost: 1,
    }
  }

  /**
   * List available skills (helper for AI discovery)
   */
  async listSkills(): Promise<ToolResult> {
    const entries = await this.registry.discover()
    const lines: string[] = ['# Available Skills', '']

    for (const entry of entries) {
      const metadata = await this.registry.getMetadata(entry.id)
      if (metadata) {
        lines.push(`## ${metadata.name} (${entry.id})`)
        lines.push(`- ${metadata.description}`)
        if (metadata.when_to_use) {
          lines.push(`- When to use: ${metadata.when_to_use}`)
        }
        lines.push(`- Format: ${entry.format}, Source: ${entry.source}`)
        lines.push('')
      }
    }

    if (entries.length === 0) {
      lines.push('No skills found.')
    }

    return {
      content: lines.join('\n'),
      cost: 1,
    }
  }
}
