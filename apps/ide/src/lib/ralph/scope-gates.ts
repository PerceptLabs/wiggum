/**
 * Scope-Aware Quality Gates — validates change markers in plan.tsx
 *
 * Reads TASK-N [ADD], PRESERVED, and NO CHANGES markers from plan.tsx
 * and checks the implementation against pre-task git snapshots.
 *
 * ADD: item count must increase
 * PRESERVED: item count must not decrease
 * NO CHANGES: source file must be unmodified (soft — warn only)
 */
import type { JSRuntimeFS } from '../fs/types'
import type { GateContext } from '../types/observability'
import type { GateResult, QualityGate } from './gates'

// ============================================================================
// TYPES
// ============================================================================

interface ScopeMarkerEntry {
  type: 'add' | 'preserved' | 'no-changes'
  taskNumber: number
  section: string
  addCount?: number
  preservedCount?: number
  line: number
}

interface ScopeCheckResult {
  severity: 'fail' | 'warn'
  section: string
  message: string
}

// ============================================================================
// MARKER PARSING
// ============================================================================

/**
 * Parse plan.tsx content to extract scope markers.
 * Markers are JSX comments — regex-based, not AST (babel strips comments).
 */
export function parseScopeMarkers(planContent: string): ScopeMarkerEntry[] {
  const markers: ScopeMarkerEntry[] = []
  const lines = planContent.split('\n')
  let currentSection = ''

  // First pass: collect all TASK-N numbers for fallback
  const allTaskNumbers: number[] = []
  for (const line of lines) {
    const taskMatch = line.match(/TASK-(\d+)/)
    if (taskMatch) allTaskNumbers.push(parseInt(taskMatch[1], 10))
  }
  const dominantTaskNumber = allTaskNumbers.length > 0 ? Math.max(...allTaskNumbers) : 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track current section/screen context
    const sectionMatch = line.match(/<(?:Section|Screen)\s[^>]*(?:gumdrop|name)="([^"]*)"/)
    if (sectionMatch) currentSection = sectionMatch[1]

    // ADD marker: {/* TASK-3 [ADD]: 2 nighttime drink flavors */}
    const addMatch = line.match(/TASK-(\d+)\s+\[ADD\](?::\s*(\d+))?/)
    if (addMatch) {
      markers.push({
        type: 'add',
        taskNumber: parseInt(addMatch[1], 10),
        section: currentSection,
        addCount: addMatch[2] ? parseInt(addMatch[2], 10) : undefined,
        line: i + 1,
      })
      continue
    }

    // PRESERVED marker: {/* EXISTING 8 flavors PRESERVED */}
    const preservedMatch = line.match(/(?:EXISTING\s+(\d+)\s+\w+\s+)?PRESERVED/)
    if (preservedMatch) {
      markers.push({
        type: 'preserved',
        taskNumber: dominantTaskNumber,
        section: currentSection,
        preservedCount: preservedMatch[1] ? parseInt(preservedMatch[1], 10) : undefined,
        line: i + 1,
      })
      continue
    }

    // NO CHANGES marker: {/* NO CHANGES for task-3 */}
    const noChangesMatch = line.match(/NO CHANGES for task-(\d+)/)
    if (noChangesMatch) {
      markers.push({
        type: 'no-changes',
        taskNumber: parseInt(noChangesMatch[1], 10),
        section: currentSection,
        line: i + 1,
      })
    }
  }

  return markers
}

// ============================================================================
// NAME VARIANT MATCHING (duplicated from diff.ts to avoid coupling)
// ============================================================================

function nameVariants(name: string): string[] {
  const words = name.split(/[\s-_]+/).filter(Boolean)
  if (words.length === 0) return [name]
  const pascal = words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
  const camel = pascal[0].toLowerCase() + pascal.slice(1)
  const kebab = words.map(w => w.toLowerCase()).join('-')
  const snake = words.map(w => w.toLowerCase()).join('_')
  return [...new Set([name, pascal, camel, kebab, snake])]
}

function findSectionFile(
  sectionName: string,
  sourceFiles: Map<string, string>,
): string | null {
  if (!sectionName) return null
  const variants = nameVariants(sectionName)

  // Check file names first
  for (const [relPath] of sourceFiles) {
    const fileName = relPath.split('/').pop() ?? ''
    const fileBase = fileName.replace(/\.[^.]+$/, '')
    if (variants.some(v => fileBase.toLowerCase() === v.toLowerCase())) {
      return relPath
    }
  }

  // Check file contents
  for (const [relPath, content] of sourceFiles) {
    if (variants.some(v => content.toLowerCase().includes(v.toLowerCase()))) {
      return relPath
    }
  }

  return null
}

// ============================================================================
// HEURISTIC ITEM COUNTING
// ============================================================================

/**
 * Count items heuristically in a source file.
 * Two strategies — returns the max:
 * 1. Most-repeated JSX component (e.g., 8x <Card> = 8 items)
 * 2. Array data items (objects in `= [{...}, {...}]`)
 */
export function countHeuristicItems(content: string): number {
  // Strategy 1: Repeated JSX components
  const tags = (content.match(/<([A-Z][a-zA-Z]*)\b/g) || []).map(t => t.slice(1))
  const counts = new Map<string, number>()
  for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1)
  const jsxMax = counts.size > 0 ? Math.max(...counts.values()) : 0

  // Strategy 2: Array data items — split by `}, {` in array assignments
  let arrayMax = 0
  for (const m of content.matchAll(/=\s*\[\s*([\s\S]*?)\s*\]/g)) {
    const inner = m[1].trim()
    if (inner.includes('{')) {
      const items = inner.split(/\},\s*\{/).length
      if (items > arrayMax) arrayMax = items
    }
  }

  return Math.max(jsxMax, arrayMax)
}

// ============================================================================
// SOURCE FILE COLLECTION
// ============================================================================

async function collectSrcFiles(
  fs: JSRuntimeFS,
  cwd: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>()

  async function walk(dir: string, prefix: string) {
    let entries: Array<{ name: string; type: string }>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true }) as Array<{ name: string; type: string }>
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.type === 'dir') {
        await walk(fullPath, relPath)
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, { encoding: 'utf8' }) as string
          files.set(relPath, content)
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await walk(`${cwd}/src`, '')
  return files
}

// ============================================================================
// SCOPE FEEDBACK FORMATTER
// ============================================================================

function formatScopeFeedback(results: ScopeCheckResult[]): string {
  const fails = results.filter(r => r.severity === 'fail')
  const warns = results.filter(r => r.severity === 'warn')
  const lines: string[] = []

  if (fails.length > 0) {
    lines.push('Scope violations:')
    for (const f of fails) lines.push(`  FAIL: Section "${f.section}" — ${f.message}`)
  }
  if (warns.length > 0) {
    lines.push('Scope warnings:')
    for (const w of warns) lines.push(`  WARN: Section "${w.section}" — ${w.message}`)
  }

  return lines.join('\n')
}

// ============================================================================
// MAIN GATE
// ============================================================================

export const scopeValidationGate: QualityGate = {
  name: 'scope-validation',
  description: 'Validate scope markers (ADD/PRESERVED/NO CHANGES) against implementation',
  check: async (fs, cwd, context) => {
    // 1. Read plan.tsx
    let planContent: string
    try {
      planContent = await fs.readFile(`${cwd}/.ralph/plan.tsx`, { encoding: 'utf8' }) as string
    } catch {
      return { pass: true }
    }
    if (!planContent) return { pass: true }

    // 2. Parse markers
    const markers = parseScopeMarkers(planContent)
    if (markers.length === 0) return { pass: true }

    // 3. Collect source files
    const sourceFiles = await collectSrcFiles(fs, cwd)

    // 4. Resolve pre-task tag for comparison
    const taskNumber = Math.max(...markers.map(m => m.taskNumber))
    const preTag = `task-${taskNumber}-pre`
    let preOid: string | null = null
    if (context?.git) {
      try {
        preOid = await context.git.resolveRef(preTag)
      } catch {
        // Tag doesn't exist — degrade gracefully
      }
    }

    // 5. Check each marker
    const results: ScopeCheckResult[] = []

    for (const marker of markers) {
      const sourceFile = findSectionFile(marker.section, sourceFiles)

      if (marker.type === 'add') {
        if (!sourceFile) {
          results.push({ severity: 'warn', section: marker.section, message: 'Source file not found — cannot validate ADD' })
          continue
        }

        const currentContent = sourceFiles.get(sourceFile) ?? ''
        const currentCount = countHeuristicItems(currentContent)

        if (preOid && context?.git) {
          try {
            const preBytes = await context.git.readFileAtCommit(`src/${sourceFile}`, preOid)
            const preContent = new TextDecoder().decode(preBytes)
            const preCount = countHeuristicItems(preContent)

            if (marker.addCount) {
              const expected = preCount + marker.addCount
              if (currentCount < preCount) {
                results.push({ severity: 'fail', section: marker.section, message: `ADD: count decreased (${preCount} → ${currentCount})` })
              } else if (currentCount === preCount) {
                results.push({ severity: 'fail', section: marker.section, message: `ADD: expected +${marker.addCount}, count unchanged (${preCount} → ${currentCount})` })
              } else if (currentCount < expected) {
                results.push({ severity: 'warn', section: marker.section, message: `ADD: expected +${marker.addCount} (${preCount} → ${expected}), found ${currentCount}` })
              }
            } else {
              if (currentCount <= preCount) {
                results.push({ severity: 'fail', section: marker.section, message: `ADD: count did not increase (${preCount} → ${currentCount})` })
              }
            }
          } catch {
            // File didn't exist at pre-tag — can't compare, skip
          }
        }
      }

      if (marker.type === 'preserved') {
        if (!sourceFile) {
          results.push({ severity: 'warn', section: marker.section, message: 'Source file not found — cannot validate PRESERVED' })
          continue
        }

        const currentContent = sourceFiles.get(sourceFile) ?? ''
        const currentCount = countHeuristicItems(currentContent)

        if (marker.preservedCount !== undefined) {
          if (currentCount < marker.preservedCount) {
            results.push({ severity: 'fail', section: marker.section, message: `PRESERVED violation: had ${marker.preservedCount} items, now has ${currentCount}` })
          }
        } else if (preOid && context?.git) {
          try {
            const preBytes = await context.git.readFileAtCommit(`src/${sourceFile}`, preOid)
            const preContent = new TextDecoder().decode(preBytes)
            const preCount = countHeuristicItems(preContent)
            if (currentCount < preCount) {
              results.push({ severity: 'fail', section: marker.section, message: `PRESERVED violation: had ${preCount} items, now has ${currentCount}` })
            }
          } catch {
            // File didn't exist at pre-tag — skip
          }
        }
      }

      if (marker.type === 'no-changes') {
        if (!sourceFile) {
          // No source file for this section — nothing to check
          continue
        }

        if (!preOid || !context?.git) continue

        try {
          const preBytes = await context.git.readFileAtCommit(`src/${sourceFile}`, preOid)
          const preContent = new TextDecoder().decode(preBytes)
          const currentContent = sourceFiles.get(sourceFile) ?? ''

          if (preContent !== currentContent) {
            results.push({
              severity: 'warn',
              section: marker.section,
              message: `${sourceFile} was modified but plan says NO CHANGES`,
            })
          }
        } catch {
          // File didn't exist at pre-tag — can't compare
        }
      }
    }

    // 6. Build result
    if (results.length === 0) return { pass: true }

    const hasFails = results.some(r => r.severity === 'fail')
    return {
      pass: !hasFails,
      feedback: formatScopeFeedback(results),
    }
  },
}
