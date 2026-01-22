/**
 * AI SDK Native Tools for Wiggum
 *
 * Creates tools using Vercel AI SDK's native tool() helper.
 * These tools work directly with streamText({ tools, maxSteps }) -
 * the SDK handles all message formatting and tool loops automatically.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { JSRuntimeFS } from '../fs'
import { ShellExecutor, type ShellExecutorOptions } from './shell-executor'
import path from 'path-browserify'

export interface CreateToolsOptions {
  fs: JSRuntimeFS
  cwd: string
}

/**
 * Create AI SDK native tools for use with streamText
 *
 * Usage:
 * ```ts
 * const tools = createTools({ fs, cwd: '/projects/myapp' })
 * const result = await streamText({
 *   model,
 *   messages,
 *   tools,
 *   maxSteps: 10,  // AI SDK manages tool loop
 * })
 * ```
 */
export function createTools(options: CreateToolsOptions) {
  const { fs, cwd } = options

  // Create shell executor - will be shared across tool calls
  // Note: We create a new one for each tool invocation to get fresh cwd
  const createExecutor = () =>
    new ShellExecutor({
      fs,
      cwd,
    })

  // State to track current directory (shared across calls in a session)
  let currentCwd = cwd

  return {
    /**
     * Primary shell tool - routes to all available commands
     */
    shell: tool({
      description: `Execute shell commands in the virtual filesystem.

Available commands:
- Navigation: cd, pwd, ls, find
- File viewing: cat, head, tail
- File operations: touch, mkdir, cp, mv, rm
- File editing: echo (with > or >>)
- Text processing: grep, sed, cut, sort, uniq, tr, wc
- Git: git add, git commit, git status, git log, git diff, git branch, git checkout

Supports:
- Pipes: ls | grep txt
- Redirects: echo "hello" > file.txt
- Compound: mkdir dir && cd dir
- Flags: ls -la, grep -rn "pattern" ./src

Examples:
- shell({ command: "ls -la /projects" })
- shell({ command: "cat package.json" })
- shell({ command: "grep -r 'TODO' ./src" })
- shell({ command: "echo 'hello' > test.txt" })
- shell({ command: "git status" })`,
      parameters: z.object({
        command: z.string().describe('The shell command to execute'),
      }),
      execute: async ({ command }) => {
        console.log('[shell tool] Executing:', command)
        try {
          if (!command || typeof command !== 'string') {
            console.error('[shell tool] Invalid command:', command)
            return 'Error: Invalid command'
          }

          const executor = new ShellExecutor({ fs, cwd: currentCwd })
          const result = await executor.run(command)

          // Update cwd if it changed (e.g., cd command)
          currentCwd = executor.getCwd()

          // Defensive logging
          const stdoutPreview = result?.stdout ? String(result.stdout).slice(0, 200) : '(none)'
          console.log('[shell tool] Result:', stdoutPreview)

          // Format result with null checks
          if (!result) {
            return 'Error: No result from command'
          }
          if (result.exitCode !== 0) {
            return `Exit code: ${result.exitCode}\n${result.stderr || result.stdout || 'Unknown error'}`
          }
          return result.stdout || '(no output)'
        } catch (error) {
          console.error('[shell tool] Error:', error)
          return `Error: ${(error as Error).message || 'Unknown error'}`
        }
      },
    }),

    /**
     * Convenience tool for reading files
     */
    read_file: tool({
      description: 'Read the contents of a file. Use this for quick file reads instead of shell cat.',
      parameters: z.object({
        path: z.string().describe('Path to the file (absolute or relative to cwd)'),
      }),
      execute: async ({ path: filePath }) => {
        console.log('[read_file tool] Reading:', filePath)
        try {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(currentCwd, filePath)
          const content = await fs.readFile(fullPath, { encoding: 'utf8' })
          console.log('[read_file tool] Read', (content as string).length, 'chars')
          return content as string
        } catch (err) {
          return `Error reading file: ${(err as Error).message}`
        }
      },
    }),

    /**
     * Convenience tool for writing files
     */
    write_file: tool({
      description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does.',
      parameters: z.object({
        path: z.string().describe('Path to the file (absolute or relative to cwd)'),
        content: z.string().describe('Content to write to the file'),
      }),
      execute: async ({ path: filePath, content }) => {
        console.log('[write_file tool] Writing to:', filePath)
        try {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(currentCwd, filePath)

          // Ensure parent directory exists
          const parentDir = path.dirname(fullPath)
          try {
            await fs.stat(parentDir)
          } catch {
            await fs.mkdir(parentDir, { recursive: true })
          }

          await fs.writeFile(fullPath, content)
          console.log('[write_file tool] Wrote', content.length, 'chars')
          return `Successfully wrote ${content.length} characters to ${filePath}`
        } catch (err) {
          return `Error writing file: ${(err as Error).message}`
        }
      },
    }),

    /**
     * Convenience tool for listing files
     */
    list_files: tool({
      description: 'List files and directories. Use this for quick directory listings.',
      parameters: z.object({
        path: z.string().optional().describe('Path to list (defaults to cwd)'),
        recursive: z.boolean().optional().describe('List recursively'),
      }),
      execute: async ({ path: dirPath, recursive }) => {
        console.log('[list_files tool] Listing:', dirPath || currentCwd)
        try {
          const fullPath = dirPath
            ? path.isAbsolute(dirPath) ? dirPath : path.join(currentCwd, dirPath)
            : currentCwd

          if (recursive) {
            // Use find for recursive listing
            const executor = new ShellExecutor({ fs, cwd: currentCwd })
            const result = await executor.run(`find ${fullPath}`)
            return result.stdout || '(empty)'
          }

          const entries = await fs.readdir(fullPath, { withFileTypes: true }) as Array<{ name: string; type: string }>
          const formatted = entries
            .map((e) => `${e.type === 'dir' ? 'd' : '-'} ${e.name}`)
            .join('\n')
          return formatted || '(empty directory)'
        } catch (err) {
          return `Error listing files: ${(err as Error).message}`
        }
      },
    }),

    /**
     * Convenience tool for searching
     */
    search: tool({
      description: 'Search for text patterns in files using grep.',
      parameters: z.object({
        pattern: z.string().describe('Pattern to search for (regex supported)'),
        path: z.string().optional().describe('Path to search in (defaults to cwd)'),
        recursive: z.boolean().optional().describe('Search recursively (default: true)'),
      }),
      execute: async ({ pattern, path: searchPath, recursive = true }) => {
        console.log('[search tool] Searching for:', pattern)
        const targetPath = searchPath
          ? path.isAbsolute(searchPath) ? searchPath : path.join(currentCwd, searchPath)
          : currentCwd

        const flags = recursive ? '-rn' : '-n'
        const executor = new ShellExecutor({ fs, cwd: currentCwd })
        const result = await executor.run(`grep ${flags} "${pattern}" ${targetPath}`)

        if (result.exitCode === 1 && !result.stderr) {
          return 'No matches found'
        }
        if (result.exitCode !== 0) {
          return `Error: ${result.stderr}`
        }
        return result.stdout || 'No matches found'
      },
    }),
  }
}

/**
 * Type for the tools returned by createTools
 */
export type WiggumTools = ReturnType<typeof createTools>
