/**
 * theme - Generate OKLCH color themes with 50+ CSS variables
 * Font/shadow/radius validated against curated registries.
 */

import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import type { FontCategory } from '../../theme-generator/types'
import {
  generateTheme,
  formatThemeOutput,
  getPreset,
  listPatterns,
  listPresets,
  listFonts,
  PATTERNS,
  PRESETS,
  SHADOW_PROFILES,
  RADIUS_STOPS,
  FONT_REGISTRY,
} from '../../theme-generator'
import { parseOklch, formatOklch, contrastRatio, clampToGamut } from '../../theme-generator/oklch'

export class ThemeCommand implements ShellCommand {
  name = 'theme'
  description = 'Generate OKLCH color themes with sacred geometry patterns'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    if (args.length === 0) return { exitCode: 1, stdout: '', stderr: this.usage() }

    const sub = args[0]

    if (sub === 'preset') return this.handlePreset(args.slice(1))
    if (sub === 'generate') return this.handleGenerate(args.slice(1))
    if (sub === 'modify') return this.handleModify(args.slice(1), options)
    if (sub === 'list') return this.handleList(args.slice(1))

    return { exitCode: 1, stdout: '', stderr: `theme: unknown subcommand "${sub}"\n${this.usage()}` }
  }

  private handlePreset(args: string[]): ShellResult {
    const name = args[0]
    if (!name) {
      const names = Object.keys(PRESETS).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme preset: missing name. Available: ${names}` }
    }

    const result = getPreset(name)
    if (!result) {
      const names = Object.keys(PRESETS).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme preset: unknown preset "${name}". Available: ${names}` }
    }

    return { exitCode: 0, stdout: result.output + '\n', stderr: '' }
  }

  private handleGenerate(args: string[]): ShellResult {
    const flags = parseFlags(args)
    const seed = parseFloat(flags['seed'] ?? '')
    const pattern = flags['pattern'] ?? ''
    const mode = (flags['mode'] ?? 'both') as 'light' | 'dark' | 'both'
    const font = flags['font']
    const shadowProfile = flags['shadow-profile']
    const radius = flags['radius']

    if (isNaN(seed)) return { exitCode: 1, stdout: '', stderr: 'theme generate: --seed <0-360> is required' }
    if (!pattern) return { exitCode: 1, stdout: '', stderr: 'theme generate: --pattern <name> is required' }
    if (!PATTERNS[pattern]) {
      const names = Object.keys(PATTERNS).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme generate: unknown pattern "${pattern}". Available: ${names}` }
    }

    try {
      const theme = generateTheme({ seed, pattern, mode, font, shadowProfile, radius })
      const desc = `seed=${seed}, pattern=${pattern}${font ? `, font=${font}` : ''}${shadowProfile ? `, shadow=${shadowProfile}` : ''}${radius ? `, radius=${radius}` : ''}`
      const output = formatThemeOutput(theme, `generated (${pattern})`, desc)
      return { exitCode: 0, stdout: output + '\n', stderr: '' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { exitCode: 1, stdout: '', stderr: `theme generate: ${msg}` }
    }
  }

  private async handleModify(args: string[], options: ShellOptions): Promise<ShellResult> {
    const flags = parseFlags(args)
    const shiftHue = parseFloat(flags['shift-hue'] ?? '')
    const scope = (flags['scope'] ?? 'all') as 'brand' | 'surface' | 'all'

    if (isNaN(shiftHue)) return { exitCode: 1, stdout: '', stderr: 'theme modify: --shift-hue <±degrees> is required' }

    // Read current index.css
    let css: string
    try {
      css = await options.fs.readFile('src/index.css', { encoding: 'utf8' }) as string
    } catch {
      return { exitCode: 1, stdout: '', stderr: 'theme modify: cannot read src/index.css' }
    }

    const brandTokens = ['primary', 'secondary', 'accent', 'ring', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
      'sidebar-primary', 'sidebar-accent', 'sidebar-ring']
    const surfaceTokens = ['background', 'card', 'popover', 'muted', 'border', 'input',
      'sidebar-background', 'sidebar-border']

    const targetTokens = scope === 'brand' ? brandTokens
      : scope === 'surface' ? surfaceTokens
      : [...brandTokens, ...surfaceTokens]

    // Parse and shift oklch values for target tokens
    const lines = css.split('\n')
    const modified: string[] = []

    for (const line of lines) {
      const match = line.match(/^\s*(--[\w-]+):\s*oklch\(([^)]+)\)\s*;?\s*$/)
      if (match) {
        const varName = match[1].replace('--', '')
        if (targetTokens.includes(varName)) {
          try {
            const color = parseOklch(`oklch(${match[2]})`)
            color.h = ((color.h + shiftHue) % 360 + 360) % 360
            const clamped = clampToGamut(color)
            modified.push(`  ${match[1]}: ${formatOklch(clamped)};`)
            continue
          } catch {
            // Fall through to unmodified
          }
        }
      }
      modified.push(line)
    }

    return { exitCode: 0, stdout: modified.join('\n') + '\n', stderr: '' }
  }

  private handleList(args: string[]): ShellResult {
    const what = args[0]

    if (what === 'presets') {
      const items = listPresets()
      const output = '## Available Presets\n\n' +
        items.map(p => `  ${p.name.padEnd(18)} ${p.description}`).join('\n') + '\n'
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    if (what === 'patterns') {
      const items = listPatterns()
      const output = '## Available Patterns\n\n' +
        items.map(p => `  ${p.name.padEnd(22)} ${p.description}`).join('\n') + '\n'
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    if (what === 'fonts') {
      const flags = parseFlags(args.slice(1))
      const category = flags['category'] as FontCategory | undefined
      const fonts = listFonts(category)

      if (category) {
        const output = `## Fonts (${category})\n\n` +
          fonts.map(f => `  ${f.name} (${f.vibe})`).join('\n') + '\n'
        return { exitCode: 0, stdout: output, stderr: '' }
      }

      // Group by category
      const groups: Record<string, typeof fonts> = {}
      for (const f of fonts) {
        if (!groups[f.category]) groups[f.category] = []
        groups[f.category].push(f)
      }

      let output = `## Font Registry (${FONT_REGISTRY.length} fonts)\n\n`
      for (const [cat, entries] of Object.entries(groups)) {
        output += `${cat}:\n`
        output += `  ${entries.map(f => `${f.name} (${f.vibe})`).join(' | ')}\n`
      }
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    if (what === 'shadows') {
      let output = '## Shadow Profiles\n\n'
      for (const [name, values] of Object.entries(SHADOW_PROFILES)) {
        output += `  ${name.padEnd(12)} opacity=${values['shadow-opacity']}, blur=${values['shadow-blur']}, spread=${values['shadow-spread']}\n`
      }
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    if (what === 'radii') {
      let output = '## Radius Stops\n\n'
      for (const [name, value] of Object.entries(RADIUS_STOPS)) {
        output += `  ${name.padEnd(12)} ${value}\n`
      }
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    return { exitCode: 1, stdout: '', stderr: 'theme list: specify presets, patterns, fonts, shadows, or radii' }
  }

  private usage(): string {
    return `Usage:
  theme preset <name>
  theme generate --seed <0-360> --pattern <name> [--font <name>] [--shadow-profile <name>] [--radius <stop>]
  theme modify --shift-hue <±deg> [--scope brand|surface|all]
  theme list presets|patterns|fonts|shadows|radii`
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      const key = args[i].slice(2)
      // Handle quoted values: --font "Plus Jakarta Sans"
      flags[key] = args[i + 1]
      i++
    }
  }
  return flags
}
