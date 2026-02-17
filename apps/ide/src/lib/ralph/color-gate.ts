/**
 * Color gate — scans source files for hardcoded colors.
 * Extracted from gates.ts to respect file size limits.
 */
import type { JSRuntimeFS } from '../fs/types'
import type { QualityGate, GateResult } from './gates'

// Tailwind color-shade pattern: text-red-500, bg-lime-400, etc.
export const TW_COLOR_RE = /\b(?:text|bg|border|ring|shadow|from|to|via|divide|outline|decoration|placeholder|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g

// Raw color functions in component code
export const RAW_COLOR_RE = /(?:oklch|hsl|hsla|rgb|rgba)\s*\([^)]+\)/g

// Hex color literals in string/value context (avoids CSS selectors and URL anchors)
export const HEX_RE = /(?:['"`]|:\s*)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g

async function scanDir(
  fs: JSRuntimeFS,
  dir: string,
  cwd: string,
  violations: string[]
): Promise<void> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir) as string[]
  } catch {
    return // dir doesn't exist
  }

  for (const entry of entries) {
    const fullPath = `${dir}/${entry}`
    try {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        await scanDir(fs, fullPath, cwd, violations)
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        const content = await fs.readFile(fullPath, { encoding: 'utf8' }) as string
        const fileName = fullPath.replace(`${cwd}/src/`, '')

        const twMatches = [...new Set(content.match(TW_COLOR_RE) || [])]
        if (twMatches.length > 0) {
          violations.push(`${fileName}: Tailwind colors — ${twMatches.slice(0, 4).join(', ')}${twMatches.length > 4 ? ` (+${twMatches.length - 4})` : ''}`)
        }

        const rawMatches = [...new Set(content.match(RAW_COLOR_RE) || [])]
        if (rawMatches.length > 0) {
          violations.push(`${fileName}: Raw color values — ${rawMatches.slice(0, 3).join(', ')}${rawMatches.length > 3 ? ` (+${rawMatches.length - 3})` : ''}`)
        }

        const hexMatches = [...new Set(content.match(HEX_RE) || [])]
        if (hexMatches.length > 0) {
          violations.push(`${fileName}: Hex colors — ${hexMatches.slice(0, 3).join(', ')}${hexMatches.length > 3 ? ` (+${hexMatches.length - 3})` : ''}`)
        }
      }
    } catch {
      // stat/read failures are non-fatal
    }
  }
}

export const noHardcodedColorsGate: QualityGate = {
  name: 'no-hardcoded-colors',
  description: 'Source files must use theme tokens, not hardcoded colors',
  check: async (fs: JSRuntimeFS, cwd: string): Promise<GateResult> => {
    const violations: string[] = []
    await scanDir(fs, `${cwd}/src`, cwd, violations)

    if (violations.length > 0) {
      return {
        pass: false,
        feedback: [
          'Hardcoded colors detected:',
          ...violations,
          '',
          'Fix: Use semantic tokens (text-primary, bg-accent, border-muted, bg-success)',
          'For content-specific colors: theme extend --name <n> --hue <deg>',
          'For data categories: chart-1 through chart-5',
          'These are the ONLY colors that exist in your build.',
        ].join('\n'),
      }
    }
    return { pass: true }
  },
}
