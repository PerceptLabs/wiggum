/**
 * theme extend — sanctioned escape hatch for content-specific colors.
 * Generates theme-harmonious OKLCH colors at a requested hue,
 * registers them in index.css with markers for @theme inline,
 * and patches tokens.json with the extended section.
 *
 * Extracted from theme.ts to respect file size limits.
 */

import type { ShellOptions, ShellResult } from '../types'
import type { OklchColor } from '../../theme-generator/types'
import type { DtcgOutput } from '../../theme-generator'
import { parseOklch, formatOklch, contrastRatio, clampToGamut } from '../../theme-generator/oklch'
import { validateFileWrite, formatValidationError } from '../write-guard'
import { resolvePath } from './utils'

// ============================================================================
// Core color generation — exported for reuse by theme apply regeneration
// ============================================================================

export interface ExtendedColorResult {
  light: { base: OklchColor; foreground: OklchColor }
  dark: { base: OklchColor; foreground: OklchColor }
  contrast: { light: number; dark: number }
}

/**
 * Generate an extended color pair (base + foreground) for both light and dark modes.
 * Uses the theme's primary chroma to stay harmonious.
 */
export function generateExtendedColor(hue: number, primaryC: number, primaryL: number): ExtendedColorResult {
  // Base color: mid-lightness, chroma scaled from primary
  const lightBase = clampToGamut({ l: 0.55, c: primaryC * 0.9, h: hue })

  // Foreground: try near-white first (works for mid-tone bases)
  let lightFg = clampToGamut({ l: 0.985, c: 0.002, h: hue })
  let lightCR = contrastRatio(lightFg, lightBase)

  // If white-ish doesn't reach 4.5:1, try dark foreground
  if (lightCR < 4.5) {
    lightFg = clampToGamut({ l: 0.15, c: 0.005, h: hue })
    lightCR = contrastRatio(lightFg, lightBase)
  }

  // Nudge foreground lightness until 4.5:1 is met
  if (lightCR < 4.5) {
    const dir = lightFg.l > lightBase.l ? 1 : -1
    for (let i = 0; i < 100 && lightCR < 4.5; i++) {
      lightFg.l += dir * 0.005
      lightFg.l = Math.max(0, Math.min(1, lightFg.l))
      lightFg = clampToGamut(lightFg)
      lightCR = contrastRatio(lightFg, lightBase)
    }
  }

  // Dark mode: invert lightness (same logic as generator.ts:130-140)
  const darkBaseL = Math.max(0.04, Math.min(0.97, 1.0 - lightBase.l))
  const darkBase = clampToGamut({ l: darkBaseL, c: lightBase.c * 0.85, h: hue })

  let darkFg = clampToGamut({ l: 0.985, c: 0.002, h: hue })
  let darkCR = contrastRatio(darkFg, darkBase)

  if (darkCR < 4.5) {
    darkFg = clampToGamut({ l: 0.15, c: 0.005, h: hue })
    darkCR = contrastRatio(darkFg, darkBase)
  }

  if (darkCR < 4.5) {
    const dir = darkFg.l > darkBase.l ? 1 : -1
    for (let i = 0; i < 100 && darkCR < 4.5; i++) {
      darkFg.l += dir * 0.005
      darkFg.l = Math.max(0, Math.min(1, darkFg.l))
      darkFg = clampToGamut(darkFg)
      darkCR = contrastRatio(darkFg, darkBase)
    }
  }

  return {
    light: { base: lightBase, foreground: lightFg },
    dark: { base: darkBase, foreground: darkFg },
    contrast: { light: Math.round(lightCR * 10) / 10, dark: Math.round(darkCR * 10) / 10 },
  }
}

// ============================================================================
// CSS marker operations
// ============================================================================

const MARKER_START = (name: string) => `/* theme-extended: ${name} */`
const MARKER_END = (name: string) => `/* /theme-extended: ${name} */`

/** Parse extended color names from index.css markers */
export function parseExtendedNames(css: string): string[] {
  const names: string[] = []
  const re = /\/\* theme-extended: ([\w][\w-]*) \*\//g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) names.push(m[1])
  return [...new Set(names)]
}

/** Insert extended color block into a CSS block (before its closing brace) */
function insertIntoBlock(css: string, blockStart: string, varsBlock: string): string {
  const idx = css.indexOf(blockStart)
  if (idx === -1) return css

  // Find the closing brace for this block
  let depth = 0
  let closeIdx = -1
  for (let i = idx; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') {
      depth--
      if (depth === 0) { closeIdx = i; break }
    }
  }
  if (closeIdx === -1) return css

  return css.slice(0, closeIdx) + varsBlock + '\n' + css.slice(closeIdx)
}

/** Remove an extended color block from CSS (both :root and .dark) */
function removeExtendedBlock(css: string, name: string): string {
  const startMarker = MARKER_START(name)
  const endMarker = MARKER_END(name)

  let result = css
  // Remove all occurrences (one in :root, one in .dark)
  while (result.includes(startMarker)) {
    const startIdx = result.indexOf(startMarker)
    const endIdx = result.indexOf(endMarker, startIdx)
    if (endIdx === -1) break

    // Include the trailing newline
    const removeEnd = endIdx + endMarker.length
    const afterEnd = result[removeEnd] === '\n' ? removeEnd + 1 : removeEnd

    // Also remove leading whitespace/newline
    let removeStart = startIdx
    while (removeStart > 0 && result[removeStart - 1] === ' ') removeStart--
    if (removeStart > 0 && result[removeStart - 1] === '\n') removeStart--

    result = result.slice(0, removeStart) + result.slice(afterEnd)
  }

  return result
}

// ============================================================================
// Read primary chroma from tokens.json
// ============================================================================

async function readPrimaryChroma(options: ShellOptions): Promise<{ c: number; l: number } | null> {
  const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
  try {
    const raw = await options.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
    const tokens: DtcgOutput = JSON.parse(raw)
    const primary = tokens.color?.['primary']
    if (primary?.$value?.components) {
      const [l, c] = primary.$value.components
      return { c, l }
    }
  } catch {
    // tokens.json doesn't exist or is invalid
  }
  return null
}

// ============================================================================
// Read/patch extended section in tokens.json
// ============================================================================

export interface ExtendedEntry { hue: number }

export async function readExtendedEntriesFromTokens(options: ShellOptions): Promise<Record<string, ExtendedEntry>> {
  const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
  try {
    const raw = await options.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
    const tokens = JSON.parse(raw)
    return tokens.extended ?? {}
  } catch {
    return {}
  }
}

export async function patchTokensExtended(
  options: ShellOptions,
  entries: Record<string, ExtendedEntry>
): Promise<void> {
  const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
  try {
    const raw = await options.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
    const tokens = JSON.parse(raw)
    tokens.extended = entries
    await options.fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2))
  } catch {
    // tokens.json doesn't exist — skip
  }
}

/**
 * Regenerate all extended colors after a theme change.
 * Reads the new theme's primary chroma, then re-runs handleExtend for each entry.
 * Returns list of additional changed files.
 */
export async function regenerateExtendedColors(
  entries: Record<string, ExtendedEntry>,
  options: ShellOptions
): Promise<string[]> {
  if (Object.keys(entries).length === 0) return []

  const changedFiles: string[] = []
  for (const [name, entry] of Object.entries(entries)) {
    const result = await handleExtend(['--name', name, '--hue', String(entry.hue)], options)
    if (result.filesChanged) changedFiles.push(...result.filesChanged)
  }
  return changedFiles
}

// ============================================================================
// Main handler
// ============================================================================

export async function handleExtend(args: string[], options: ShellOptions): Promise<ShellResult> {
  const flags = parseFlags(args)

  if (flags['list'] === 'true') return handleList(options)
  if (flags['remove']) return handleRemove(flags['remove'], options)

  // --name + --hue mode
  const name = flags['name']
  const hueStr = flags['hue']

  if (!name) {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: --name <name> is required\n\n' + usage() }
  }
  if (!hueStr) {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: --hue <0-360> is required\n\n' + usage() }
  }
  if (!/^[\w][\w-]*$/.test(name)) {
    return { exitCode: 1, stdout: '', stderr: `theme extend: invalid name "${name}" — use alphanumeric + hyphens` }
  }

  const hue = parseFloat(hueStr)
  if (isNaN(hue) || hue < 0 || hue > 360) {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: --hue must be 0-360' }
  }

  // Read primary chroma from tokens.json
  const primary = await readPrimaryChroma(options)
  if (!primary) {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: no tokens.json found. Apply a theme first (theme preset <name> --apply)' }
  }

  // Generate the extended color
  const result = generateExtendedColor(hue, primary.c, primary.l)

  // Read current index.css
  const cssPath = resolvePath(options.cwd, 'src/index.css')
  const validation = validateFileWrite(cssPath, options.cwd)
  if (!validation.allowed) {
    return { exitCode: 1, stdout: '', stderr: formatValidationError(validation, cssPath) }
  }

  let css: string
  try {
    css = await options.fs.readFile(cssPath, { encoding: 'utf8' }) as string
  } catch {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: cannot read src/index.css. Apply a theme first.' }
  }

  // Remove existing block for this name (idempotent)
  css = removeExtendedBlock(css, name)

  // Build the marker blocks
  const lightBlock = [
    `  ${MARKER_START(name)}`,
    `  --${name}: ${formatOklch(result.light.base)};`,
    `  --${name}-foreground: ${formatOklch(result.light.foreground)};`,
    `  ${MARKER_END(name)}`,
  ].join('\n')

  const darkBlock = [
    `  ${MARKER_START(name)}`,
    `  --${name}: ${formatOklch(result.dark.base)};`,
    `  --${name}-foreground: ${formatOklch(result.dark.foreground)};`,
    `  ${MARKER_END(name)}`,
  ].join('\n')

  // Insert into :root and .dark blocks
  css = insertIntoBlock(css, ':root {', lightBlock)
  css = insertIntoBlock(css, '.dark {', darkBlock)

  // Write updated CSS
  await options.fs.writeFile(cssPath, css)

  // Patch tokens.json extended section
  const extended = await readExtendedEntriesFromTokens(options)
  extended[name] = { hue }
  await patchTokensExtended(options, extended)

  const filesChanged = [cssPath, resolvePath(options.cwd, '.ralph/tokens.json')]

  const output = [
    `Extended color "${name}" (hue ${hue}°):`,
    `  Light: ${formatOklch(result.light.base)} → contrast ${result.contrast.light}:1`,
    `  Dark:  ${formatOklch(result.dark.base)} → contrast ${result.contrast.dark}:1`,
    '',
    `Usage: bg-${name} text-${name}-foreground`,
    `       text-${name} border-${name}`,
  ].join('\n')

  return { exitCode: 0, stdout: output + '\n', stderr: '', filesChanged }
}

// ============================================================================
// --list
// ============================================================================

async function handleList(options: ShellOptions): Promise<ShellResult> {
  const cssPath = resolvePath(options.cwd, 'src/index.css')
  let css = ''
  try {
    css = await options.fs.readFile(cssPath, { encoding: 'utf8' }) as string
  } catch {
    return { exitCode: 0, stdout: 'No extended colors (no src/index.css)\n', stderr: '' }
  }

  const names = parseExtendedNames(css)
  if (names.length === 0) {
    return { exitCode: 0, stdout: 'No extended colors defined.\n', stderr: '' }
  }

  const lines = ['## Extended Colors', '']
  for (const name of names) {
    // Extract the oklch value from the CSS
    const re = new RegExp(`--${name}:\\s*(oklch\\([^)]+\\))`)
    const match = css.match(re)
    const value = match ? match[1] : '(unknown)'
    lines.push(`  ${name.padEnd(16)} ${value}`)
  }

  return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
}

// ============================================================================
// --remove
// ============================================================================

async function handleRemove(name: string, options: ShellOptions): Promise<ShellResult> {
  const cssPath = resolvePath(options.cwd, 'src/index.css')
  const validation = validateFileWrite(cssPath, options.cwd)
  if (!validation.allowed) {
    return { exitCode: 1, stdout: '', stderr: formatValidationError(validation, cssPath) }
  }

  let css: string
  try {
    css = await options.fs.readFile(cssPath, { encoding: 'utf8' }) as string
  } catch {
    return { exitCode: 1, stdout: '', stderr: 'theme extend: cannot read src/index.css' }
  }

  if (!css.includes(MARKER_START(name))) {
    return { exitCode: 1, stdout: '', stderr: `theme extend: no extended color "${name}" found` }
  }

  css = removeExtendedBlock(css, name)
  await options.fs.writeFile(cssPath, css)

  // Remove from tokens.json extended section
  const extended = await readExtendedEntriesFromTokens(options)
  delete extended[name]
  await patchTokensExtended(options, extended)

  const filesChanged = [cssPath, resolvePath(options.cwd, '.ralph/tokens.json')]

  return { exitCode: 0, stdout: `Removed extended color "${name}"\n`, stderr: '', filesChanged }
}

// ============================================================================
// Helpers
// ============================================================================

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        flags[key] = 'true'
      } else {
        flags[key] = args[i + 1]
        i++
      }
    }
  }
  return flags
}

function usage(): string {
  return `Usage:
  theme extend --name <name> --hue <0-360>    Add a content-specific color
  theme extend --list                          List extended colors
  theme extend --remove <name>                 Remove an extended color`
}
