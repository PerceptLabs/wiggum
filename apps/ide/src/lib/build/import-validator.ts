import type { JSRuntimeFS } from '../fs/types'

export interface ImportValidationError {
  file: string
  component: string
  line: number
  suggestion: string
}

/**
 * Validate that all JSX component references are imported or locally defined.
 *
 * Catches the #1 class of runtime error Ralph produces: using a component
 * (e.g. <CardContent>) without importing it. esbuild doesn't catch this because
 * JSX compiles to function calls — the ReferenceError only surfaces at runtime.
 *
 * This is NOT a full AST parse. It's a fast regex scan that catches common cases.
 * False negatives are acceptable (Layer 2/3 catch them). False positives are not.
 */
export function validateImports(files: Map<string, string>): ImportValidationError[] {
  const errors: ImportValidationError[] = []

  for (const [filePath, content] of files) {
    if (!/\.[tj]sx$/.test(filePath)) continue

    // Collect imported identifiers
    const imports = new Set<string>()

    // Named imports: import { Card, CardContent as CC } from '...'
    const namedImportRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]/g
    let match
    while ((match = namedImportRegex.exec(content)) !== null) {
      match[1].split(',').forEach((name) => {
        // Handle "CardContent as CC" — take the alias
        const parts = name.trim().split(/\s+as\s+/)
        const ident = (parts.length > 1 ? parts[1] : parts[0])?.trim()
        if (ident) imports.add(ident)
      })
    }

    // Default imports: import React from 'react', import App from './App'
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]/g
    while ((match = defaultImportRegex.exec(content)) !== null) {
      imports.add(match[1])
    }

    // Combined default + named: import React, { useState } from 'react'
    const combinedRegex = /import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]/g
    while ((match = combinedRegex.exec(content)) !== null) {
      imports.add(match[1])
      match[2].split(',').forEach((name) => {
        const parts = name.trim().split(/\s+as\s+/)
        const ident = (parts.length > 1 ? parts[1] : parts[0])?.trim()
        if (ident) imports.add(ident)
      })
    }

    // Namespace imports: import * as Icons from '...'
    const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]/g
    while ((match = namespaceRegex.exec(content)) !== null) {
      imports.add(match[1])
    }

    // Locally defined components (function/const/class declarations with uppercase start)
    const defRegex = /(?:^|[\s;])(?:export\s+)?(?:function|const|class|let)\s+([A-Z]\w*)/gm
    while ((match = defRegex.exec(content)) !== null) {
      imports.add(match[1])
    }

    // Type and interface declarations — also valid local names that appear in generics
    const typeDefRegex = /(?:^|[\s;])(?:export\s+)?(?:type|interface)\s+([A-Z]\w*)/gm
    while ((match = typeDefRegex.exec(content)) !== null) {
      imports.add(match[1])
    }

    // Known globals that don't need imports
    const GLOBALS = ['React', 'Fragment', 'Suspense', 'Infinity', 'NaN', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Error', 'Promise', 'Map', 'Set', 'JSON', 'Math', 'Date', 'RegExp', 'Symbol', 'Proxy', 'Reflect']
    GLOBALS.forEach((g) => imports.add(g))

    // Find JSX component usages: <ComponentName or <ComponentName.Sub
    // Only match uppercase identifiers (lowercase are HTML elements)
    const jsxRegex = /<([A-Z]\w*)[\s./>]/g
    const lines = content.split('\n')
    while ((match = jsxRegex.exec(content)) !== null) {
      const componentName = match[1]

      // Skip if imported or locally defined
      if (imports.has(componentName)) continue

      // Skip TypeScript generics: <Foo preceded by word char or ) = generic, not JSX
      // JSX: return <Foo, (<Foo, {<Foo — preceded by whitespace/punct
      // Generic: useState<Foo>, Promise<Foo>, Array<Foo> — preceded by word char
      const charBefore = match.index > 0 ? content[match.index - 1] : '\n'
      if (/[\w)\]]/.test(charBefore)) continue

      // Find line number
      const upToMatch = content.substring(0, match.index)
      const lineNum = upToMatch.split('\n').length

      // Skip if inside a comment or string (simple heuristic: check if line has // before the match)
      const currentLine = lines[lineNum - 1] || ''
      const matchCol = match.index - upToMatch.lastIndexOf('\n') - 1
      const beforeMatch = currentLine.substring(0, matchCol)
      if (beforeMatch.includes('//') || beforeMatch.includes('*')) continue

      errors.push({
        file: filePath,
        component: componentName,
        line: lineNum,
        suggestion: `Add: import { ${componentName} } from '...' or define ${componentName} in this file`,
      })
    }
  }

  // Deduplicate: same component in same file only reported once
  const seen = new Set<string>()
  return errors.filter((e) => {
    const key = `${e.file}:${e.component}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Collect all source files from a project directory for validation.
 */
export async function collectSourceFiles(
  fs: JSRuntimeFS,
  projectPath: string
): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  const srcPath = `${projectPath}/src`

  try {
    await walkAndCollect(fs, srcPath, projectPath, files)
  } catch {
    // No src/ directory — nothing to validate
  }

  return files
}

async function walkAndCollect(
  fs: JSRuntimeFS,
  dirPath: string,
  projectRoot: string,
  files: Map<string, string>
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries as Array<{ name: string; type: string }>) {
      const fullPath = `${dirPath}/${entry.name}`
      if (entry.type === 'dir') {
        await walkAndCollect(fs, fullPath, projectRoot, files)
      } else if (/\.[tj]sx$/.test(entry.name)) {
        try {
          const data = await fs.readFile(fullPath, { encoding: 'utf8' })
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
          // Store with relative path
          const relativePath = fullPath.startsWith(projectRoot + '/')
            ? fullPath.slice(projectRoot.length + 1)
            : fullPath
          files.set(relativePath, text)
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }
}
