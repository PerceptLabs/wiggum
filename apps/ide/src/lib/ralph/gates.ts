/**
 * Quality Gates - Objective validation of Ralph's output
 *
 * Gates run when Ralph claims "complete" and determine if the work
 * actually meets quality standards. This is harness-controlled,
 * not self-reported by the LLM.
 */
import type { JSRuntimeFS } from '../fs/types'
import { buildProject } from '../build'

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
  check: (fs: JSRuntimeFS, cwd: string) => Promise<GateResult>
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
        const errorMessages = result.errors?.map((e) => e.message).join('\n') || 'Unknown build error'
        return { pass: false, feedback: `Build failed:\n${errorMessages}` }
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
]

// ============================================================================
// GATE RUNNER
// ============================================================================

/**
 * Run all quality gates and return comprehensive results
 * Runs ALL gates (doesn't fail-fast) to provide complete feedback
 */
export async function runQualityGates(fs: JSRuntimeFS, cwd: string): Promise<GatesResult> {
  const results: Array<{ gate: string; result: GateResult }> = []

  for (const gate of QUALITY_GATES) {
    try {
      const result = await gate.check(fs, cwd)
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
  if (failures.length === 0) return ''

  const lines = ['# Quality Gate Failures\n']
  for (const { gate, result } of failures) {
    lines.push(`## ${gate}`)
    lines.push(result.feedback || 'Failed without specific feedback')
    lines.push('')
  }
  lines.push('Fix these issues and mark status as complete again.')
  return lines.join('\n')
}
