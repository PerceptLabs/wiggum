import * as path from 'path-browserify'

export interface WriteValidation {
  allowed: boolean
  reason?: string
  suggestion?: string
}

/**
 * Validate file writes - HARNESS ENFORCEMENT
 * This is not a suggestion to the LLM, it's a hard block.
 */
export function validateFileWrite(filePath: string, cwd: string): WriteValidation {
  const ext = path.extname(filePath).toLowerCase()
  const relativePath = filePath.startsWith(cwd)
    ? filePath.slice(cwd.length).replace(/^[/\\]/, '')
    : filePath

  // Allow .ralph/ directory (state files)
  if (relativePath.startsWith('.ralph/') || relativePath.startsWith('.ralph\\')) {
    return { allowed: true }
  }

  // Allow package.json at root
  if (relativePath === 'package.json') {
    return { allowed: true }
  }

  // Block modifications to index.html (contains required Tailwind config)
  if (relativePath === 'index.html') {
    return {
      allowed: false,
      reason: 'Cannot modify index.html - it contains required build configuration.',
      suggestion:
        'Customize theme colors in src/index.css instead. See theming skill.\nTo load fonts, add a comment in src/index.css:\n  /* @fonts: Inter:wght@400;500;600, JetBrains+Mono:wght@400;500 */',
    }
  }

  // Block HTML files - key enforcement
  if (ext === '.html' || ext === '.htm') {
    const suggestedPath = relativePath
      .replace(/\.html?$/, '.tsx')
      .replace(/^(?!src[/\\])/, 'src/sections/')
    return {
      allowed: false,
      reason: 'HTML files not supported. This is a React project.',
      suggestion: `Write a React component instead: ${suggestedPath}\n\nNote: Use the Export button to download as a single HTML file when done.`,
    }
  }

  // Block CSS files outside src/
  if (ext === '.css' && !relativePath.startsWith('src/') && !relativePath.startsWith('src\\')) {
    return {
      allowed: false,
      reason: 'CSS files must be in src/',
      suggestion: 'Use: src/index.css or Tailwind classes directly',
    }
  }

  // Block writes outside src/ (except .ralph/ and package.json handled above)
  const isInSrc = relativePath.startsWith('src/') || relativePath.startsWith('src\\')
  if (!isInSrc) {
    return {
      allowed: false,
      reason: 'Files must be in src/ directory',
      suggestion: `Try: src/${path.basename(relativePath)}`,
    }
  }

  // Only allow specific extensions in src/
  const allowedExtensions = ['.tsx', '.ts', '.css', '.json']
  if (!allowedExtensions.includes(ext)) {
    return {
      allowed: false,
      reason: `Only ${allowedExtensions.join(', ')} files allowed in src/`,
      suggestion:
        ext === '.js' || ext === '.jsx'
          ? `Use TypeScript: ${relativePath.replace(/\.jsx?$/, '.tsx')}`
          : undefined,
    }
  }

  return { allowed: true }
}

/**
 * Validate file content before write - HARNESS ENFORCEMENT
 * Blocks patterns that will fail at runtime (e.g., @tailwind directives, @import url())
 */
export function validateFileContent(filePath: string, content: string): WriteValidation {
  const ext = path.extname(filePath).toLowerCase()

  // Block @import url() in CSS files — esbuild can't process external CSS imports
  if (ext === '.css' && /@import\s+url\s*\(/.test(content)) {
    return {
      allowed: false,
      reason: 'Cannot use @import url() in CSS files — the build system cannot process external imports.',
      suggestion: `To load fonts, declare them using a comment in src/index.css:\n\n  /* @fonts: Inter:wght@400;500;600;700, JetBrains+Mono:wght@400;500 */\n\nThe preview system automatically injects the correct <link> tags.`,
    }
  }

  // Block @tailwind directives in CSS files - browsers cannot process them
  if (ext === '.css' && content.includes('@tailwind')) {
    return {
      allowed: false,
      reason: 'Cannot use @tailwind directives in CSS files — the build system compiles Tailwind automatically.\nTailwind utility classes (bg-primary, text-center, flex, grid, etc.) work normally in JSX.\nDefine theme colors as CSS variables in src/index.css. See: grep skill "CSS variables"',
      suggestion: `Utility classes work in JSX — only @tailwind directives are blocked.\n\nDefine your theme in src/index.css:\n\n:root {\n  --background: 0 0% 100%;\n  --primary: 210 100% 50%;\n  /* Run: grep skill "preset" for full theme presets */\n}`,
    }
  }

  return { allowed: true }
}

export function formatValidationError(validation: WriteValidation, filePath: string): string {
  let msg = `❌ Cannot write to ${filePath}\n   ${validation.reason}`
  if (validation.suggestion) {
    msg += `\n\n   ${validation.suggestion}`
  }
  return msg
}
