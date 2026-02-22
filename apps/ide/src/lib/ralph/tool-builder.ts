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

import type { Tool } from '../llm/client'
import type { ShellCommand } from '../shell/types'
import { toolFromCommand } from '../shell/tool-adapter'

// ============================================================================
// RALPH TOOLKIT
// ============================================================================

export interface RalphToolkit {
  tools: Tool[]
  /** Names of commands promoted to discrete tools */
  promotedCommands: Set<string>
}

/**
 * Build the complete tool list for Ralph's LLM calls.
 *
 * Returns:
 * - tools[0]: shell tool (always present, catch-all for pipes/chaining/redirects)
 * - tools[1..N]: discrete typed tools from schema-enabled commands
 * - promotedCommands: set of command names that have discrete tools
 */
export function buildRalphTools(
  commands: ShellCommand<any>[],
  shellDescription: string
): RalphToolkit {
  const tools: Tool[] = []
  const promotedCommands = new Set<string>()

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

  // 2. Discrete tools — from schema-enabled commands
  for (const cmd of commands) {
    if (cmd.argsSchema) {
      tools.push(toolFromCommand(cmd))
      promotedCommands.add(cmd.name)
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

  let desc = 'Your interface to the world. Every file read, write, search, and build flows through this tool. One tool. Total control.\n\n'

  // Schema'd commands get detailed entries above the appendix
  if (schemaCommands.length > 0) {
    desc += '**Commands with typed tools (also callable directly):**\n'
    for (const cmd of schemaCommands.sort((a, b) => a.name.localeCompare(b.name))) {
      desc += `- **${cmd.name}**: ${cmd.description}`
      if (cmd.examples?.length) {
        desc += ` \u2014 e.g. ${cmd.examples.slice(0, 2).map(e => `\`${e}\``).join(', ')}`
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
 * Phase 2+: As commands gain schemas with examples, their entries in the
 * "Quick reference" and "Flags" sections become redundant and can be trimmed.
 * Phase 4: Fully replaced by auto-generated content.
 */
const SHELL_DESCRIPTION_APPENDIX = `**Commands:**
- File I/O: cat, tac, echo, touch, mkdir, rm, rmdir, cp, mv
- Navigation: ls, pwd, tree, find, basename, dirname
- Text processing: grep, head, tail, wc, sort, uniq, diff, sed, cut, tr
- Search/replace: grep, find, replace
- VCS: git
- System: date, env, whoami, which, true, false, clear, paths
- Preview: console, preview, build
- Design: theme, tokens
- Modules: modules, cache-stats, build-cache

**Quick reference:**
- replace = exact literal string swap (no escaping needed)
- sed = regex patterns, line operations, stream editing
- paths = show where you can write files and which extensions are allowed
- preview = build project and render static HTML snapshot
- build = compile-only check (no preview or gates)
- theme = OKLCH theme generator (preset/generate/modify/extend/list). --mood required for generate --apply. --chroma low|medium|high controls saturation. --personality <file> for custom briefs. Use --apply to write directly to src/index.css. Use 'theme extend --name <name> --hue <deg>' for content-specific colors beyond the semantic palette.
- cat @wiggum/stack = list available components and hooks
- modules = manage ESM module cache (list/status/warm/clear)
- cache-stats = show Cache Storage statistics
- build-cache = manage build output cache (status/clear/list)
- tokens = read design token data from .ralph/tokens.json (palette/contrast/font/shadow/mood)

**Operators:**
- Pipe: cmd1 | cmd2 (stdout \u2192 stdin)
- Chain: cmd1 && cmd2 (run cmd2 if cmd1 succeeds)
- Fallback: cmd1 || cmd2 (run cmd2 if cmd1 fails)
- Redirect: cmd > file (overwrite), cmd >> file (append)
- Heredoc: cat > file << 'EOF'\\ncontent\\nEOF

**Flags:**
- cat -q: Quiet mode (no error on missing file, for use with ||)
- replace -w: Whitespace-tolerant matching
- sed -i: In-place edit, -n: Suppress output, -w: Whitespace-tolerant
- grep -E: Extended regex (| for alternation), -l: Files-with-matches only
- find -exec: Execute command on matched files (terminate with \\; or +)

**grep modes:**
- grep skill "<query>" - Semantic skill search
- grep package "<query>" - Package registry search
- grep code "<query>" - Project code search
- grep "<pattern>" <file> - Exact regex match

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
- cat src/App.tsx | grep "import"
- replace src/App.tsx "oldText" "newText"  (exact swap, no escaping)
- sed -i 's/pattern/replacement/g' file   (regex, use for pattern matching)
- echo "hello" | tr '[:lower:]' '[:upper:]'
- basename src/sections/Hero.tsx .tsx
- tac src/App.tsx | head -10

No bash, sh, npm, node, python, curl.`
