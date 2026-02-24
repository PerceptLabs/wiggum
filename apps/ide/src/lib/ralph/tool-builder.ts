/**
 * Tool builder — assembles the LLM tool list from the command registry.
 *
 * buildRalphTools() produces the complete tool array: the shell catch-all
 * (always present) plus discrete typed tools for schema-enabled commands.
 *
 * buildShellDescription() auto-generates the shell tool description from
 * the command registry, with a static appendix for shell-level concepts
 * (operators, flags, modes, examples) that aren't per-command.
 */

// Promoted schemas must be flat — no discriminated unions (models can't fill them)

import type { Tool } from '../llm/client'
import type { ArgsSchema, ShellCommand } from '../shell/types'
import { toolFromCommand, toolFromEntry } from '../shell/tool-adapter'

// ============================================================================
// RALPH TOOLKIT
// ============================================================================

export interface PromotionEntry {
  commandName: string
  schema: ArgsSchema<any>
}

export interface RalphToolkit {
  tools: Tool[]
  /** Map from tool name → { commandName, schema } for discrete tool dispatch */
  promotedCommands: Map<string, PromotionEntry>
}

/**
 * Build the complete tool list for Ralph's LLM calls.
 *
 * Returns:
 * - tools[0]: shell tool (always present, catch-all for pipes/chaining/redirects)
 * - tools[1..N]: discrete typed tools from schema-enabled commands + additionalTools
 * - promotedCommands: map from tool name to command name + schema
 */
export function buildRalphTools(
  commands: ShellCommand<any>[],
  shellDescription: string
): RalphToolkit {
  const tools: Tool[] = []
  const promotedCommands = new Map<string, PromotionEntry>()

  // 1. Shell tool — always first
  tools.push({
    type: 'function',
    function: {
      name: 'shell',
      description: shellDescription,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to run' },
          _status: {
            type: 'string',
            description: 'Optional: Brief reasoning/intent (1 sentence max). Omit if self-explanatory.',
          },
        },
        required: ['command'],
      },
    },
  })

  // 2. Discrete tools — primary argsSchema + additionalTools
  for (const cmd of commands) {
    if (cmd.argsSchema) {
      tools.push(toolFromCommand(cmd))
      promotedCommands.set(cmd.name, { commandName: cmd.name, schema: cmd.argsSchema })
    }
    if (cmd.additionalTools) {
      for (const entry of cmd.additionalTools) {
        tools.push(toolFromEntry(entry))
        promotedCommands.set(entry.name, { commandName: cmd.name, schema: entry.argsSchema })
      }
    }
  }

  return { tools, promotedCommands }
}

// ============================================================================
// SHELL DESCRIPTION BUILDER
// ============================================================================

/**
 * Auto-generate the shell tool description from the command registry.
 *
 * Structure:
 * 1. Opening line (identity)
 * 2. Schema'd commands with detailed entries (Phase 2+ populates this)
 * 3. Static appendix with command list, operators, flags, modes, examples
 *
 * Phase 1: No commands have schemas, so output = opening + appendix
 *          (byte-for-byte identical to the old hand-written SHELL_TOOL description)
 */
export function buildShellDescription(commands: ShellCommand<any>[]): string {
  const schemaCommands = commands.filter(c => c.argsSchema)
  const extraTools = commands.flatMap(c => c.additionalTools ?? [])

  let desc = 'Your interface to the world. Every file read, write, search, and build flows through this tool. One tool. Total control.\n\n'

  // Schema'd commands + additionalTools get detailed entries above the appendix
  if (schemaCommands.length > 0 || extraTools.length > 0) {
    desc += '**Commands with typed tools (also callable directly):**\n'
    for (const cmd of schemaCommands.sort((a, b) => a.name.localeCompare(b.name))) {
      desc += `- **${cmd.name}**: ${cmd.description}`
      if (cmd.examples?.length) {
        desc += ` \u2014 e.g. ${cmd.examples.slice(0, 2).map(e => `\`${e}\``).join(', ')}`
      }
      desc += '\n'
    }
    for (const entry of extraTools.sort((a, b) => a.name.localeCompare(b.name))) {
      desc += `- **${entry.name}**: ${entry.description}`
      if (entry.examples?.length) {
        desc += ` \u2014 e.g. ${entry.examples.slice(0, 2).map(e => `\`${e}\``).join(', ')}`
      }
      desc += '\n'
    }
    desc += '\n'
  }

  // Static appendix — complete command reference
  desc += SHELL_DESCRIPTION_APPENDIX

  return desc
}

// ============================================================================
// STATIC APPENDIX
// ============================================================================

/**
 * Static appendix extracted verbatim from the original SHELL_TOOL description.
 * Contains all command groupings, quick reference, operators, flags, modes,
 * sed usage, examples, and prohibitions.
 *
 * Phase 2: grep/replace/theme/preview promoted — their entries removed.
 * Remaining commands still described here until their Phase 3+ promotion.
 * Phase 4: Fully replaced by auto-generated content.
 */
const SHELL_DESCRIPTION_APPENDIX = `**Commands:**
- File I/O: cat, tac, echo, touch, mkdir, rm, rmdir, cp, mv
- Navigation: ls, pwd, tree, find, basename, dirname
- Text processing: head, tail, wc, sort, uniq, diff, sed, cut, tr
- Search: find
- VCS: git
- System: date, env, whoami, which, true, false, clear, paths
- Preview: console, build
- Design: theme, tokens
- Modules: modules, cache-stats, build-cache

**Quick reference:**
- sed = regex patterns, line operations, stream editing
- paths = show where you can write files and which extensions are allowed
- build = compile-only check (no preview or gates)
- cat @wiggum/stack = list available components and hooks
- modules = manage ESM module cache (list/status/warm/clear)
- cache-stats = show Cache Storage statistics
- build-cache = manage build output cache (status/clear/list)
- theme = OKLCH theme generator (preset/generate/modify/list/extend)
- tokens = read design token data from .ralph/tokens.json (palette/contrast/font/shadow/mood)

**Operators:**
- Pipe: cmd1 | cmd2 (stdout \u2192 stdin)
- Chain: cmd1 && cmd2 (run cmd2 if cmd1 succeeds)
- Fallback: cmd1 || cmd2 (run cmd2 if cmd1 fails)
- Redirect: cmd > file (overwrite), cmd >> file (append)
- Heredoc: cat > file << 'EOF'\\ncontent\\nEOF

**Flags:**
- cat -q: Quiet mode (no error on missing file, for use with ||)
- sed -i: In-place edit, -n: Suppress output, -w: Whitespace-tolerant
- find -exec: Execute command on matched files (terminate with \\; or +)

**sed usage:**
  sed 's/old/new/g' file          Regex substitute
  sed -i 's/old/new/g' file       In-place edit
  sed -n '5,10p' file             Print line range
  sed '3d' file                   Delete line 3
  sed '/pattern/d' file           Delete matching lines
  sed code 's/old/new/g' "query"  Semantic file discovery + transform
  sed -w 's/old/new/g' file       Whitespace-tolerant matching

**Examples:**
- cat -q .ralph/feedback.md || echo "(no feedback)"
- sed -i 's/pattern/replacement/g' file   (regex, use for pattern matching)
- echo "hello" | tr '[:lower:]' '[:upper:]'
- basename src/sections/Hero.tsx .tsx
- tac src/App.tsx | head -10

No bash, sh, npm, node, python, curl.`
