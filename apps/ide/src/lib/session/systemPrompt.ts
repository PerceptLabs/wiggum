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
  /** Additional context to include */
  additionalContext?: string
}

/**
 * Build the system prompt for an AI session
 *
 * All messages go through the autonomous loop, so this prompt
 * always includes loop-aware instructions.
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const sections: string[] = []

  // Core identity with loop awareness
  sections.push(`You are Wiggum, an AI coding assistant running in the browser.
You operate in an autonomous loop - every task you receive may run through multiple iterations.

Key behaviors:
- For simple tasks (questions, small changes): Complete in ONE iteration and mark done
- For complex tasks: Work incrementally, making progress each iteration
- ALWAYS signal completion by writing "complete" to .ralph/status.txt when done
- If you need human input, write "waiting" to .ralph/status.txt`)

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

  // Core guidelines
  sections.push('\n## Guidelines')
  sections.push(`
1. **Complete the task**: Focus on actually doing the work, not just explaining
2. **Use tools**: Use shell commands to read files, make changes, run tests
3. **Verify changes**: Always check that your changes work before marking done
4. **Update progress**: After making changes, update .ralph/progress.md
5. **Signal completion**: When done, write "complete" to .ralph/status.txt
6. **Be efficient**: Don't over-engineer. Do what's needed, no more.

For simple questions like "What is 2+2?" or "How do I use git?":
- Answer directly
- Write "complete" to .ralph/status.txt immediately

For coding tasks like "Create a todo app":
- Plan briefly, then start building
- Make real changes to files
- Test that things work
- Update progress after each significant change
- Mark complete when fully done`)

  // Additional context
  if (options.additionalContext) {
    sections.push('\n## Additional Context')
    sections.push(options.additionalContext)
  }

  return sections.join('\n')
}

/**
 * Build a minimal system prompt for ralph iterations
 * This is used for the fresh context in each iteration
 */
export function buildRalphSystemPrompt(iteration: number, cwd: string): string {
  return `You are Wiggum in autonomous mode (iteration ${iteration}).

Working directory: ${cwd}

Your task is in .ralph/task.md. Your job this iteration:
1. Read .ralph/task.md and .ralph/progress.md to understand what's done
2. Take the NEXT logical step toward completion
3. Use tools to make changes and verify they work
4. Update .ralph/progress.md with what you accomplished
5. If task is complete, write "complete" to .ralph/status.txt

CRITICAL: Always write "complete" to .ralph/status.txt when the task is finished!

For simple tasks: Complete in this iteration and mark done.
For complex tasks: Make meaningful progress, don't just plan.

Be efficient. Verify changes work. Mark complete when done.`
}

/**
 * Get tool descriptions as a formatted string
 */
export function getToolDescriptions(tools: Tool[]): string {
  return tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n')
}
