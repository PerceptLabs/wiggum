/**
 * Fast-Path Detection for Warm Rebuilds
 *
 * Detects single-file edits where import specifiers haven't changed,
 * allowing the build to skip expensive import validation.
 */

/**
 * Extract import specifiers from source code via regex.
 * Matches: import ... from '...', import '...', export ... from '...'
 */
export function extractImports(source: string): string[] {
  const imports: string[] = []
  const re = /(?:import|export)\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source))) imports.push(m[1])
  return imports.sort()
}

/**
 * Check if a single-file edit is eligible for fast-path rebuild.
 * Returns true when imports are identical between previous and current source,
 * meaning only the code body changed — import validation can be skipped.
 */
export function canUseFastPath(
  previousSource: string | null,
  currentSource: string
): boolean {
  if (!previousSource) return false
  const prev = extractImports(previousSource)
  const curr = extractImports(currentSource)
  if (prev.length !== curr.length) return false
  return prev.every((v, i) => v === curr[i])
}
