import type { Tool } from '../tools'

/**
 * Options for building system prompt
 */
export interface SystemPromptOptions {
  /** Available tools */
  tools: Tool[]
  /** Project name */
  projectName?: string
  /** Current working directory */
  cwd?: string
  /** Whether this is a ralph iteration */
  isRalphIteration?: boolean
  /** Ralph iteration number */
  ralphIteration?: number
  /** Additional context to include */
  additionalContext?: string
}

/**
 * Build the system prompt for an AI session
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const sections: string[] = []

  // Core identity
  sections.push(`You are Wiggum, an AI coding assistant running in the browser.
You help users with software development tasks using a virtual filesystem and shell commands.`)

  // Project context
  if (options.projectName) {
    sections.push(`\n## Current Project: ${options.projectName}`)
  }

  if (options.cwd) {
    sections.push(`Working directory: ${options.cwd}`)
  }

  // Available tools
  if (options.tools.length > 0) {
    sections.push('\n## Available Tools')
    sections.push('You have access to the following tools:')
    sections.push('')

    for (const tool of options.tools) {
      sections.push(`### ${tool.name}`)
      sections.push(tool.description)
      sections.push('')
    }
  }

  // Ralph-specific instructions
  if (options.isRalphIteration) {
    sections.push('\n## Ralph Iteration Mode')
    sections.push(`This is iteration ${options.ralphIteration ?? '?'} of an autonomous development loop.`)
    sections.push('')
    sections.push(`Your job in this iteration:
1. Read the current task and progress from .ralph/ files
2. Take ONE clear step toward completing the task
3. Use shell commands to make changes and verify they work
4. Update .ralph/progress.md with what you accomplished
5. If the task is complete, write "complete" to .ralph/status.txt
6. If you need human input, write "waiting" to .ralph/status.txt

Important guidelines:
- Focus on making real progress, not just planning
- Verify your changes work before marking progress
- Be thorough but efficient - don't over-engineer
- If something fails, try a different approach`)
  } else {
    // Normal chat mode instructions
    sections.push('\n## Guidelines')
    sections.push(`- Use shell commands to explore and modify the filesystem
- Always verify changes work before confirming success
- Be concise and direct in your responses
- When asked to make changes, do so and confirm what was done
- If something fails, explain why and suggest alternatives`)
  }

  // Additional context
  if (options.additionalContext) {
    sections.push('\n## Additional Context')
    sections.push(options.additionalContext)
  }

  return sections.join('\n')
}

/**
 * Build a minimal system prompt for ralph iterations
 * Focuses on the task at hand with less boilerplate
 */
export function buildRalphSystemPrompt(iteration: number, cwd: string): string {
  return `You are Wiggum in autonomous mode (ralph iteration ${iteration}).

Working directory: ${cwd}

Focus: Execute the task defined in .ralph/task.md by:
1. Reading current state from .ralph/
2. Taking ONE concrete step forward
3. Using shell commands to make and verify changes
4. Updating .ralph/progress.md with results
5. Setting .ralph/status.txt to "complete" or "waiting" if needed

Be efficient and make real progress. Verify changes work before marking done.`
}

/**
 * Get tool descriptions as a formatted string
 */
export function getToolDescriptions(tools: Tool[]): string {
  return tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n')
}
