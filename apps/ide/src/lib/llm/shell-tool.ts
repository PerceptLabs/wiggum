import type { Tool } from './client'
import type { ShellExecutor } from '../shell'

export const shellTool: Tool = {
  type: 'function',
  function: {
    name: 'shell',
    description: `Execute shell commands in the virtual filesystem. Available commands:
- File operations: cat, ls, pwd, mkdir, touch, rm, cp, mv
- Text processing: echo, grep, head, tail, wc, sort, uniq
- Search: find
- Git: git (init, status, add, commit, log, diff, branch, checkout)

Commands can be piped: cat file.txt | grep pattern | head -5
Write to files: echo "content" > file.txt
Append to files: echo "more" >> file.txt

Use this tool for ALL file operations, reading, writing, and git commands.`,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute',
        },
      },
      required: ['command'],
    },
  },
}

export async function executeShellTool(
  executor: ShellExecutor,
  cwd: string,
  args: { command: string }
): Promise<string> {
  const result = await executor.execute(args.command, cwd)
  if (result.exitCode !== 0) {
    return result.stderr || `Command failed with exit code ${result.exitCode}`
  }
  return result.stdout || 'Command completed successfully'
}
