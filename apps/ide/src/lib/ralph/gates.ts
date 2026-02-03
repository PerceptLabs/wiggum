/**
 * Quality Gates - Objective validation of Ralph's output
 *
 * Gates run when Ralph claims "complete" and determine if the work
 * actually meets quality standards. This is harness-controlled,
 * not self-reported by the LLM.
 */
import type { JSRuntimeFS } from '../fs/types'
import { buildProject } from '../build'
import type { GateContext, DOMStructure } from '../types/observability'
import { formatRuntimeErrors } from '../preview/error-collector'
import { formatStructure } from '../preview/structure-collector'

// ============================================================================
// TYPES
// ============================================================================

export interface GateResult {
  pass: boolean
  feedback?: string
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
 * Summarize DOM structure for gate feedback
 * Returns a compact summary like "3 sections, 5 buttons, 2 forms"
 */
function summarizeStructure(node: DOMStructure | null): string {
  if (!node) return 'Nothing rendered'

  const counts: Record<string, number> = {}

  function count(n: DOMStructure) {
    // Count semantic elements
    const tag = n.tag
    if (['section', 'header', 'footer', 'nav', 'main', 'article', 'aside'].includes(tag)) {
      counts['sections'] = (counts['sections'] || 0) + 1
    } else if (tag === 'button') {
      counts['buttons'] = (counts['buttons'] || 0) + 1
    } else if (tag === 'form') {
      counts['forms'] = (counts['forms'] || 0) + 1
    } else if (tag === 'input') {
      counts['inputs'] = (counts['inputs'] || 0) + 1
    } else if (['h1', 'h2', 'h3'].includes(tag)) {
      counts['headings'] = (counts['headings'] || 0) + 1
    } else if (tag === 'img') {
      counts['images'] = (counts['images'] || 0) + 1
    }
    n.children?.forEach(count)
  }

  count(node)

  if (Object.keys(counts).length === 0) {
    return 'Basic structure (no semantic sections detected)'
  }

  return Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ')
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
          ? 'src/index.css contains @tailwind directives which browsers cannot process. Use CSS variables instead.'
          : undefined,
      }
    },
  },

  {
    name: 'css-has-variables',
    description: 'CSS should define theme variables',
    check: async (fs, cwd) => {
      const css = await readFile(fs, `${cwd}/src/index.css`)
      if (!css) return { pass: false, feedback: 'Missing src/index.css with theme variables' }
      const hasVars = css.includes(':root') && (css.includes('--primary') || css.includes('--background'))
      return {
        pass: hasVars,
        feedback: hasVars
          ? undefined
          : 'src/index.css should define CSS variables in :root (--primary, --background, etc.)',
      }
    },
  },

  {
    name: 'build-succeeds',
    description: 'Project must build without errors',
    check: async (fs, cwd) => {
      try {
        const result = await buildProject(fs, cwd)
        if (result.success) {
          return { pass: true }
        }
        const rawErrors = result.errors?.map((e) => e.message).join('\n') || 'Unknown build error'
        const enhancedErrors = enhanceBuildError(rawErrors)
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
    name: 'runtime-errors',
    description: 'Preview must not have runtime errors',
    check: async (_fs, _cwd, context) => {
      // Skip if no error collector available (feature disabled)
      if (!context?.errorCollector) {
        return { pass: true }
      }

      // Wait for errors to stabilize (debounced)
      const errors = await context.errorCollector.waitForStable()

      if (errors.length > 0) {
        return {
          pass: false,
          feedback: formatRuntimeErrors(errors),
        }
      }

      return { pass: true }
    },
  },

  {
    name: 'rendered-structure',
    description: 'Capture what actually rendered',
    check: async (fs, cwd, context) => {
      if (!context?.structureCollector) {
        return { pass: true }
      }

      const structure = await context.structureCollector.waitForStructure()

      // Always write structure file for reference
      if (structure) {
        try {
          const timestamp = new Date().toISOString()
          const content = `# Rendered Structure\n\nTimestamp: ${timestamp}\n\n${formatStructure(structure)}`
          await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
          await fs.writeFile(`${cwd}/.ralph/rendered-structure.md`, content, { encoding: 'utf8' })
        } catch {
          // Ignore write failures
        }
      }

      // Return summary as feedback (still passes - informational only)
      const summary = summarizeStructure(structure)
      return {
        pass: true,
        feedback: `Rendered: ${summary}. See .ralph/rendered-structure.md for full tree.`,
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
      lines.push('')
    }
    lines.push('Fix these issues and mark status as complete again.')
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
