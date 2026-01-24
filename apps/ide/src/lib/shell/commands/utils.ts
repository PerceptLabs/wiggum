/**
 * Utility functions for shell commands
 */

/**
 * Resolve a path relative to the current working directory
 */
export function resolvePath(cwd: string, path: string): string {
  // Normalize separators
  const normalizedCwd = cwd.replace(/\\/g, '/')
  const normalizedPath = path.replace(/\\/g, '/')

  // If path is absolute, return it
  if (normalizedPath.startsWith('/')) {
    return normalizePath(normalizedPath)
  }

  // Join with cwd
  const combined = `${normalizedCwd}/${normalizedPath}`
  return normalizePath(combined)
}

/**
 * Normalize a path (resolve . and .., remove duplicate slashes)
 */
export function normalizePath(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0 && p !== '.')
  const result: string[] = []

  for (const part of parts) {
    if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop()
      }
    } else {
      result.push(part)
    }
  }

  return '/' + result.join('/')
}

/**
 * Get the basename (last component) of a path
 */
export function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || path
}

/**
 * Get the directory name of a path
 */
export function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) return '.'
  if (lastSlash === 0) return '/'
  return normalized.slice(0, lastSlash)
}
