/**
 * Quality Gates - Objective validation of Ralph's output
 *
 * Gates run when Ralph claims "complete" and determine if the work
 * actually meets quality standards. This is harness-controlled,
 * not self-reported by the LLM.
 */
import type { JSRuntimeFS } from '../fs/types'
import { buildProject } from '../build'
import type { GateContext } from '../types/observability'
import { formatRuntimeErrors } from '../preview/error-collector'
import { noHardcodedColorsGate } from './color-gate'

// ============================================================================
// TYPES
// ============================================================================

export interface GateResult {
  pass: boolean
  feedback?: string
  /** Auto-fix: if provided and gate has failed multiple times, harness can apply this fix directly */
  fix?: { file: string; content: string; description: string }
}

export interface QualityGate {
  name: string
  description: string
  check: (fs: JSRuntimeFS, cwd: string, context?: GateContext) => Promise<GateResult>
}

export interface GatesResult {
  passed: boolean
  results: Array<{ gate: string; result: GateResult }>
}

// ============================================================================
// HELPERS
// ============================================================================

/** All 36 required CSS custom properties for a complete theme */
const REQUIRED_THEME_VARS = [
  // Base (14)
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  // Utility (9)
  '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
  '--success', '--success-foreground', '--warning', '--warning-foreground',
  // Sidebar (8)
  '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
  '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  // Chart (5)
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
]

async function fileExists(fs: JSRuntimeFS, filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

async function readFile(fs: JSRuntimeFS, filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return typeof content === 'string' ? content : new TextDecoder().decode(content)
  } catch {
    return null
  }
}

/**
 * Enhance build errors with actionable suggestions
 */
function enhanceBuildError(errorMessage: string): string {
  // Strip angle brackets that models interpret as JSX (defense-in-depth)
  errorMessage = errorMessage.replace(/<(\w+)>\s+is used in JSX/g, '$1 is used in JSX')

  // Lucide icon fixes
  const lucideMatch = errorMessage.match(/No matching export in ".*lucide-react" for import "(\w+)"/)
  if (lucideMatch) {
    const badIcon = lucideMatch[1]
    const fixes: Record<string, string> = {
      Terminal2: 'Terminal or TerminalSquare',
      Close: 'X',
      Checkmark: 'Check',
      Error: 'AlertCircle',
      Warning: 'AlertTriangle',
    }
    const suggestion = fixes[badIcon] || 'a valid icon from lucide.dev/icons'
    return `${errorMessage}\n\nFix: "${badIcon}" doesn't exist in lucide-react. Use ${suggestion} instead.`
  }

  // Stack component fixes
  const stackMatch = errorMessage.match(/No matching export in ".*@wiggum\/stack" for import "(\w+)"/)
  if (stackMatch) {
    const badComponent = stackMatch[1]
    return `${errorMessage}\n\nFix: "${badComponent}" is not exported from @wiggum/stack. Check the stack skill for available components.`
  }

  // CSS @import url() errors - breaks esbuild
  if (errorMessage.includes('Expected ";"') && errorMessage.includes('http-url:')) {
    return `${errorMessage}\n\nFix: Don't use @import url() for external fonts/CSS. esbuild cannot process external URLs.\nInstead, add a <link> tag to index.html:\n  <link href="https://fonts.googleapis.com/..." rel="stylesheet">`
  }

  // Generic missing export
  if (errorMessage.includes('No matching export')) {
    return `${errorMessage}\n\nFix: Check import names against the actual exports of the module.`
  }

  return errorMessage
}

/**
 * Get explicit fix instructions for a specific gate failure
 * Provides copy-pasteable solutions when possible
 */
function getExplicitFix(gateName: string): string {
  switch (gateName) {
    case 'css-theme-complete':
      return `
FIX: Run 'theme preset <name> --apply' to generate a complete theme with all required variables.

Available presets: northern-lights, cyberpunk, doom-64, retro-arcade, soft-pop, tangerine, mono, elegant-luxury, bubblegum, mocha-mousse, caffeine, catppuccin

Example: theme preset retro-arcade --apply

This writes :root + .dark blocks with all 32 required vars to src/index.css.
Then mark status as complete again.`

    case 'app-has-content':
      return `
FIX: The App.tsx is still the default scaffold or lacks structure.

Replace it with actual content using this pattern:

import { Button, Card, Text, Heading, Stack } from '@wiggum/stack'

function App() {
  return (
    <main className="min-h-screen">
      <header className="p-6">
        <Heading size="xl">Your App Title</Heading>
      </header>
      <section className="p-6">
        {/* Your content here */}
      </section>
    </main>
  )
}

export default App

Or create separate section components:
  - src/sections/Hero.tsx
  - src/sections/Features.tsx

Then import and use them in App.tsx.`

    case 'app-exists':
      return `
FIX: Create src/App.tsx with a basic component:

function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  )
}

export default App`

    case 'css-no-tailwind-directives':
      return `
FIX: Remove @tailwind directives from src/index.css.

Instead of:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

Use CSS variables and regular CSS. The build system handles Tailwind compilation automatically.
Keep your utility classes but remove the @tailwind lines.`

    case 'runtime-errors':
      return `
FIX: Check the error messages above for:
1. Missing imports - add the import statement
2. Undefined variables - declare before use
3. Type errors - check prop types match
4. Hook errors - ensure hooks are at component top level
5. null/undefined access - add optional chaining (?.)

Use 'ralph console error' to see recent errors.`

    case 'build-succeeds':
      return `
FIX: Check .ralph/build-errors.md for specific errors.
Common fixes:
1. Missing imports → add import statement
2. Wrong icon name → check lucide.dev/icons for valid names
3. Wrong @wiggum/stack export → check stack skill for available components
4. CSS @import url() → move to <link> in index.html instead`

    case 'has-summary':
      return `
FIX: Write a summary of what you built:

echo "Built a [description] with [key features]." > .ralph/summary.md

Then mark status as complete again.`

    case 'no-hardcoded-colors':
      return `
FIX: Replace hardcoded colors with semantic theme tokens.

Tailwind colors (text-red-500, bg-lime-400) → use semantic classes:
  text-primary, bg-accent, border-muted, bg-success, bg-warning, bg-destructive

Raw color values (oklch(), hsl(), rgb(), #hex) → use CSS variables:
  var(--primary), var(--accent), var(--muted), var(--success), var(--warning)

For content-specific colors (not covered by semantic tokens):
  theme extend --name <name> --hue <degrees>

For data visualization: chart-1 through chart-5

These are the ONLY colors that exist in your build (@theme inline).`

    default:
      return ''
  }
}

// ============================================================================
// QUALITY GATES
// ============================================================================

export const QUALITY_GATES: QualityGate[] = [
  {
    name: 'app-exists',
    description: 'src/App.tsx must exist',
    check: async (fs, cwd) => {
      const exists = await fileExists(fs, `${cwd}/src/App.tsx`)
      return {
        pass: exists,
        feedback: exists ? undefined : 'Missing src/App.tsx - create your main App component',
      }
    },
  },

  {
    name: 'css-no-tailwind-directives',
    description: 'CSS must not contain @tailwind directives',
    check: async (fs, cwd) => {
      const css = await readFile(fs, `${cwd}/src/index.css`)
      if (!css) return { pass: true } // No CSS file is OK (uses defaults)
      const hasTailwind = css.includes('@tailwind')
      return {
        pass: !hasTailwind,
        feedback: hasTailwind
          ? 'src/index.css contains @tailwind directives — the build system handles Tailwind compilation automatically. Use CSS variables instead.'
          : undefined,
      }
    },
  },

  {
    name: 'css-theme-complete',
    description: 'CSS must define all 36 required theme variables in :root and .dark',
    check: async (fs, cwd) => {
      const css = await readFile(fs, `${cwd}/src/index.css`)
      if (!css) {
        return {
          pass: false,
          feedback: "Missing src/index.css. Run 'theme preset <name> --apply' to generate a complete theme.",
        }
      }

      // Extract all CSS custom property declarations
      const declaredVars = new Set<string>()
      for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) {
        declaredVars.add(match[1])
      }

      // Check required vars
      const missing = REQUIRED_THEME_VARS.filter(v => !declaredVars.has(v))

      // Check .dark block exists
      const hasDark = css.includes('.dark')

      if (missing.length > 0 || !hasDark) {
        const parts: string[] = []
        if (missing.length > 0) {
          parts.push(`Missing ${missing.length} required var(s): ${missing.join(', ')}`)
        }
        if (!hasDark) {
          parts.push('Missing .dark {} block for dark mode')
        }
        return {
          pass: false,
          feedback: parts.join('. ') + ". Run 'theme preset <name> --apply' to generate a complete theme.",
        }
      }

      return { pass: true }
    },
  },

  noHardcodedColorsGate,

  {
    name: 'build-succeeds',
    description: 'Project must build without errors',
    check: async (fs, cwd) => {
      try {
        const result = await buildProject(fs, cwd)

        // Capture build warnings (Step 0G)
        if (result.warnings && result.warnings.length > 0) {
          try {
            const warningText = [
              '# Build Warnings (auto-captured)',
              `> ${result.warnings.length} warning(s) at ${new Date().toISOString()}`,
              '',
              ...result.warnings.map((w) => {
                const loc = w.file ? `\n  at ${w.file}${w.line ? ':' + w.line : ''}` : ''
                return `⚠️ ${w.message}${loc}`
              }),
            ].join('\n')
            await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
            await fs.writeFile(`${cwd}/.ralph/build-warnings.md`, warningText, { encoding: 'utf8' })
          } catch {
            // Ignore write failures
          }
        } else {
          try { await fs.unlink(`${cwd}/.ralph/build-warnings.md`) } catch { /* may not exist */ }
        }

        if (result.success) {
          return { pass: true }
        }
        const rawMessages = result.errors?.map((e) => {
          const loc = e.file ? ` (${e.file}${e.line ? ':' + e.line : ''})` : ''
          return `${e.message}${loc}`
        }) || ['Unknown build error']
        const enhancedErrors = rawMessages.map((msg) => enhanceBuildError(msg)).join('\n\n')
        const rawErrors = rawMessages.join('\n')
        const feedback = `Build failed:\n${enhancedErrors}`

        // Write to file for Ralph to reference
        try {
          const timestamp = new Date().toISOString()
          const content = `# Build Errors\n\nTimestamp: ${timestamp}\n\n${enhancedErrors}\n\n## Raw esbuild output\n\`\`\`\n${rawErrors}\n\`\`\``
          await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
          await fs.writeFile(`${cwd}/.ralph/build-errors.md`, content, { encoding: 'utf8' })
        } catch {
          // Ignore write failures
        }

        return { pass: false, feedback }
      } catch (err) {
        return {
          pass: false,
          feedback: `Build error: ${err instanceof Error ? err.message : String(err)}`,
        }
      }
    },
  },

  {
    name: 'app-has-content',
    description: 'App.tsx should have meaningful content beyond scaffold',
    check: async (fs, cwd) => {
      const content = await readFile(fs, `${cwd}/src/App.tsx`)
      if (!content) return { pass: false, feedback: 'Cannot read src/App.tsx' }

      // Detect unchanged scaffold by its signature phrase
      const isUnchangedScaffold = content.includes('Edit src/App.tsx to get started')
      if (isUnchangedScaffold) {
        return {
          pass: false,
          feedback: 'src/App.tsx is unchanged scaffold. Build the UI the user requested.',
        }
      }

      // Check for meaningful structural signals (not arbitrary length)
      const hasStackImports = content.includes("from '@wiggum/stack'")
      const hasLocalImports =
        content.includes("from './sections/") || content.includes("from './components/")
      // Count JSX component usages (capitalized tags like <Button, <Card, etc.)
      const jsxComponentCount = (content.match(/<[A-Z][a-zA-Z]*[\s/>]/g) || []).length

      const hasStructure = hasStackImports || hasLocalImports || jsxComponentCount > 3

      return {
        pass: hasStructure,
        feedback: hasStructure
          ? undefined
          : 'src/App.tsx lacks meaningful content. Use @wiggum/stack components or create sections/components.',
      }
    },
  },

  {
    name: 'has-summary',
    description: 'Ralph must write a summary of what was built',
    check: async (fs, cwd) => {
      const summary = await readFile(fs, `${cwd}/.ralph/summary.md`)
      if (!summary || summary.trim().length < 20) {
        return {
          pass: false,
          feedback: 'Missing or empty .ralph/summary.md — write a brief summary of what you built before marking complete.',
        }
      }
      return { pass: true }
    },
  },

  {
    name: 'runtime-errors',
    description: 'Preview must not have runtime errors',
    check: async (fs, cwd, context) => {
      // Skip if no error collector available (feature disabled)
      if (!context?.errorCollector) {
        return { pass: true }
      }

      // Wait for errors to stabilize (debounced)
      const errors = await context.errorCollector.waitForStable()

      if (errors.length > 0) {
        // Write .ralph/errors.md so Ralph can read raw error details
        try {
          const timestamp = new Date().toISOString()
          const errorLines = errors.map((e) => {
            const loc = e.filename ? `\n  at ${e.filename}${e.line ? ':' + e.line : ''}${e.column ? ':' + e.column : ''}` : ''
            const stack = e.stack ? '\n  ' + e.stack.split('\n').slice(0, 3).join('\n  ') : ''
            return `❌ ${e.message}${loc}${stack}`
          })
          const content = `# Runtime Errors (auto-captured)\n> Timestamp: ${timestamp}\n\n${errorLines.join('\n\n')}\n`
          await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
          await fs.writeFile(`${cwd}/.ralph/errors.md`, content, { encoding: 'utf8' })
        } catch {
          // Write failures are non-fatal
        }

        return {
          pass: false,
          feedback: formatRuntimeErrors(errors),
        }
      }

      // Clean: remove stale errors file
      try { await fs.unlink(`${cwd}/.ralph/errors.md`) } catch { /* may not exist */ }

      return { pass: true }
    },
  },

  {
    name: 'console-capture',
    description: 'Capture console output for Ralph visibility',
    check: async (fs, cwd, context) => {
      // Informational gate — always passes
      if (!context?.consoleCollector) {
        return { pass: true }
      }

      const output = context.consoleCollector.getFormattedOutput()

      if (output.hasContent) {
        try {
          const lines: string[] = ['# Console Output (auto-captured)', `> ${new Date().toISOString()}`, '']

          if (output.errors.length > 0) {
            lines.push('## Errors', '')
            for (const e of output.errors) {
              lines.push(`❌ ${e.message}`)
            }
            lines.push('')
          }

          if (output.warnings.length > 0) {
            lines.push('## Warnings', '')
            for (const w of output.warnings) {
              const countSuffix = w.count > 1 ? ` (×${w.count})` : ''
              lines.push(`⚠️ ${w.message}${countSuffix}`)
            }
            lines.push('')
          }

          if (output.context.length > 0) {
            lines.push('## Context (breadcrumbs before error)', '')
            for (const c of output.context) {
              lines.push(`  [${c.level}] ${c.message}`)
            }
            lines.push('')
          }

          await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
          await fs.writeFile(`${cwd}/.ralph/console.md`, lines.join('\n'), { encoding: 'utf8' })
        } catch {
          // Write failures are non-fatal
        }
      } else {
        try { await fs.unlink(`${cwd}/.ralph/console.md`) } catch { /* may not exist */ }
      }

      return { pass: true }
    },
  },

  {
    name: 'rendered-structure',
    description: 'Capture what actually rendered',
    check: async (fs, cwd) => {
      // Read snapshot report if available (written by preview command)
      try {
        const report = await fs.readFile(`${cwd}/.ralph/snapshot/ui-report.md`, { encoding: 'utf8' }) as string
        const preview = report.split('\n').slice(0, 20).join('\n')
        return {
          pass: true,
          feedback: `Snapshot available. Preview:\n${preview}`,
        }
      } catch {
        // No snapshot yet — pass silently
        return { pass: true }
      }
    },
  },
]

// ============================================================================
// GATE RUNNER
// ============================================================================

/**
 * Run all quality gates and return comprehensive results
 * Runs ALL gates (doesn't fail-fast) to provide complete feedback
 *
 * @param fs - Filesystem interface
 * @param cwd - Current working directory
 * @param context - Optional context with error collector, log buffer, etc.
 */
export async function runQualityGates(
  fs: JSRuntimeFS,
  cwd: string,
  context?: GateContext
): Promise<GatesResult> {
  const results: Array<{ gate: string; result: GateResult }> = []

  for (const gate of QUALITY_GATES) {
    try {
      const result = await gate.check(fs, cwd, context)
      results.push({ gate: gate.name, result })
    } catch (err) {
      results.push({
        gate: gate.name,
        result: {
          pass: false,
          feedback: `Gate error: ${err instanceof Error ? err.message : String(err)}`,
        },
      })
    }
  }

  const passed = results.every((r) => r.result.pass)
  return { passed, results }
}

/**
 * Generate markdown feedback for failed gates
 * Written to .ralph/feedback.md for Ralph to read on next iteration
 */
export function generateGateFeedback(results: GatesResult['results']): string {
  const failures = results.filter((r) => !r.result.pass)
  const infoGates = results.filter((r) => r.result.pass && r.result.feedback)

  const lines: string[] = []

  if (failures.length > 0) {
    lines.push('# Quality Gate Failures\n')
    for (const { gate, result } of failures) {
      lines.push(`## ${gate}`)
      lines.push(result.feedback || 'Failed without specific feedback')

      // Add explicit fix instructions
      const explicitFix = getExplicitFix(gate)
      if (explicitFix) {
        lines.push(explicitFix)
      }

      lines.push('')
    }
    lines.push('\n---\nFix these issues and mark status as complete again.')
  }

  if (infoGates.length > 0) {
    if (lines.length > 0) lines.push('\n---\n')
    lines.push('# Info\n')
    for (const { gate, result } of infoGates) {
      lines.push(`**${gate}:** ${result.feedback}`)
    }
  }

  return lines.join('\n')
}
