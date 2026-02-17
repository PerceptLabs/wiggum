/**
 * theme - Generate OKLCH color themes with 50+ CSS variables
 * Font/shadow/radius validated against curated registries.
 */

import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import type { FontCategory } from '../../theme-generator/types'
import type { MoodName, PersonalityBrief } from '../../theme-generator/personalities'
import type { DtcgOutput } from '../../theme-generator'
import {
  generateTheme,
  formatThemeOutput,
  formatThemeCss,
  getPreset,
  listPatterns,
  listPresets,
  listFonts,
  PATTERNS,
  PRESETS,
  SHADOW_PROFILES,
  RADIUS_STOPS,
  FONT_REGISTRY,
  toDtcg,
  patchDtcgColors,
  validatePersonality,
  resolveChromaMultiplier,
} from '../../theme-generator'
import { MOOD_NAMES, PERSONALITIES, generateDesignBrief } from '../../theme-generator/personalities'
import { parseOklch, formatOklch, contrastRatio, clampToGamut } from '../../theme-generator/oklch'
import { validateFileWrite, formatValidationError } from '../write-guard'
import { resolvePath } from './utils'

/** Semantic pattern aliases — two-dimensional: pattern + chroma hint */
interface PatternAlias {
  pattern: string
  chromaHint: 'low' | 'medium' | 'high'
}

const PATTERN_ALIASES: Record<string, PatternAlias> = {
  elegant:  { pattern: 'analogous',      chromaHint: 'low' },
  bold:     { pattern: 'complementary',   chromaHint: 'high' },
  minimal:  { pattern: 'monochromatic',   chromaHint: 'low' },
  vibrant:  { pattern: 'triadic',         chromaHint: 'high' },
  natural:  { pattern: 'goldenRatio',     chromaHint: 'medium' },
}

/** Inferred mood per preset when --mood is not specified */
const PRESET_MOOD_MAP: Record<string, MoodName> = {
  'northern-lights': 'organic',
  'cyberpunk': 'industrial',
  'doom-64': 'brutalist',
  'retro-arcade': 'retro',
  'soft-pop': 'playful',
  'tangerine': 'playful',
  'mono': 'minimal',
  'elegant-luxury': 'luxury',
  'bubblegum': 'playful',
  'mocha-mousse': 'zen',
  'caffeine': 'editorial',
  'catppuccin': 'minimal',
}

export class ThemeCommand implements ShellCommand {
  name = 'theme'
  description = 'Generate OKLCH color themes with sacred geometry patterns'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    if (args.length === 0) return { exitCode: 1, stdout: '', stderr: this.usage() }

    const sub = args[0]

    if (sub === 'help' || sub === '--help' || sub === '-h') {
      return { exitCode: 0, stdout: this.usage(), stderr: '' }
    }

    if (sub === 'preset') return this.handlePreset(args.slice(1), options)
    if (sub === 'generate') return this.handleGenerate(args.slice(1), options)
    if (sub === 'modify') return this.handleModify(args.slice(1), options)
    if (sub === 'list') return this.handleList(args.slice(1))

    return { exitCode: 1, stdout: '', stderr: `theme: unknown subcommand "${sub}"\n${this.usage()}` }
  }

  private async handlePreset(args: string[], options: ShellOptions): Promise<ShellResult> {
    const flags = parseFlags(args)
    const apply = flags['apply'] === 'true'
    const moodFlag = flags['mood']
    const chromaFlag = flags['chroma']
    const name = args.find(a => !a.startsWith('--'))
    if (!name) {
      const names = Object.keys(PRESETS).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme preset: missing name. Available: ${names}` }
    }

    if (moodFlag && !MOOD_NAMES.includes(moodFlag as MoodName)) {
      return { exitCode: 1, stdout: '', stderr: `theme preset: unknown mood "${moodFlag}". Available: ${MOOD_NAMES.join(', ')}` }
    }

    const result = getPreset(name)
    if (!result) {
      const names = Object.keys(PRESETS).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme preset: unknown preset "${name}". Available: ${names}` }
    }

    if (apply) {
      const filePath = resolvePath(options.cwd, 'src/index.css')
      const validation = validateFileWrite(filePath, options.cwd)
      if (!validation.allowed) {
        return { exitCode: 1, stdout: '', stderr: formatValidationError(validation, filePath) }
      }
      const css = formatThemeCss(result.theme)
      await options.fs.writeFile(filePath, css)

      const resolvedMood = (moodFlag as MoodName) ?? PRESET_MOOD_MAP[name] ?? 'minimal'
      const briefPath = resolvePath(options.cwd, '.ralph/design-brief.md')
      const brief = generateDesignBrief(resolvedMood, name)
      await options.fs.writeFile(briefPath, brief)

      // Chroma cascade: explicit > mood's chromaHint > default
      const resolvedChroma = resolveChromaFlag(chromaFlag, undefined, resolvedMood)

      // DTCG tokens
      const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
      const moodPersonality = PERSONALITIES[resolvedMood]
      const dtcg = toDtcg(
        result.theme,
        { seed: 0, pattern: 'preset', font: result.meta?.font, radius: result.meta?.radius, shadowProfile: result.meta?.shadowStyle },
        resolvedMood,
        result.meta,
        moodPersonality,
        resolvedChroma,
      )
      await options.fs.writeFile(tokensPath, JSON.stringify(dtcg, null, 2))

      const varCount = Object.keys(result.theme.cssVars.light).length + Object.keys(result.theme.cssVars.theme).length
      return {
        exitCode: 0,
        stdout: `Applied preset "${name}" to src/index.css (${varCount} vars, :root + .dark) + design brief (${resolvedMood}) + tokens.json\n`,
        stderr: '',
        filesChanged: [filePath, briefPath, tokensPath],
      }
    }

    return { exitCode: 0, stdout: result.output + '\n', stderr: '' }
  }

  private async handleGenerate(args: string[], options: ShellOptions): Promise<ShellResult> {
    const flags = parseFlags(args)
    const apply = flags['apply'] === 'true'
    const seed = parseFloat(flags['seed'] ?? '')
    const rawPattern = flags['pattern'] ?? ''
    const chromaFlag = flags['chroma']
    const personalityFlag = flags['personality']
    const moodFlag = flags['mood']

    // Resolve alias (two-dimensional: pattern + chromaHint)
    const alias = PATTERN_ALIASES[rawPattern]
    const pattern = alias ? alias.pattern : rawPattern
    const aliasChromaHint = alias ? alias.chromaHint : undefined

    const mode = (flags['mode'] ?? 'both') as 'light' | 'dark' | 'both'
    const font = flags['font']
    const shadowProfile = flags['shadow-profile']
    const radius = flags['radius']

    if (isNaN(seed)) return { exitCode: 1, stdout: '', stderr: 'theme generate: --seed <0-360> is required' }
    if (!pattern) return { exitCode: 1, stdout: '', stderr: 'theme generate: --pattern <name> is required' }
    if (!PATTERNS[pattern]) {
      const names = Object.keys(PATTERNS).join(', ')
      const aliases = Object.entries(PATTERN_ALIASES).map(([k, v]) => k + '\u2192' + v.pattern).join(', ')
      return { exitCode: 1, stdout: '', stderr: `theme generate: unknown pattern "${rawPattern}". Available: ${names}\nAliases: ${aliases}` }
    }
    if (moodFlag && !MOOD_NAMES.includes(moodFlag as MoodName)) {
      return { exitCode: 1, stdout: '', stderr: `theme generate: unknown mood "${moodFlag}". Available: ${MOOD_NAMES.join(', ')}` }
    }

    // Mood required for --apply (unless --personality provided)
    if (apply && !moodFlag && !personalityFlag) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `theme generate: --mood is required with --apply (or use --personality for custom brief).\nAvailable moods: ${MOOD_NAMES.join(', ')}`,
      }
    }

    // Load custom personality if provided
    let customPersonality: PersonalityBrief | undefined
    if (personalityFlag) {
      try {
        const pPath = resolvePath(options.cwd, personalityFlag)
        const raw = await options.fs.readFile(pPath, { encoding: 'utf8' }) as string
        const parsed = JSON.parse(raw)
        const validation = validatePersonality(parsed)
        if (!validation.valid) {
          return { exitCode: 1, stdout: '', stderr: `theme generate: invalid personality file "${personalityFlag}":\n${(validation as { errors: string[] }).errors.join('\n')}` }
        }
        customPersonality = parsed as PersonalityBrief
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { exitCode: 1, stdout: '', stderr: `theme generate: cannot read personality file "${personalityFlag}": ${msg}` }
      }
    }

    // Chroma cascade: explicit > alias hint > mood's hint > default medium
    const resolvedMood = moodFlag ? (moodFlag as MoodName) : undefined
    const resolvedChroma = resolveChromaFlag(chromaFlag, aliasChromaHint, resolvedMood)

    try {
      const theme = generateTheme({ seed, pattern, mode, font, shadowProfile, radius, chroma: resolvedChroma })

      if (apply) {
        const filePath = resolvePath(options.cwd, 'src/index.css')
        const validation = validateFileWrite(filePath, options.cwd)
        if (!validation.allowed) {
          return { exitCode: 1, stdout: '', stderr: formatValidationError(validation, filePath) }
        }
        const css = formatThemeCss(theme)
        await options.fs.writeFile(filePath, css)

        // Design brief: custom personality or mood-based
        const briefPath = resolvePath(options.cwd, '.ralph/design-brief.md')
        const themeName = `generated (seed=${seed}, pattern=${pattern})`
        const briefMood = resolvedMood ?? 'minimal'
        const brief = customPersonality
          ? generateDesignBriefFromPersonality(customPersonality, themeName)
          : generateDesignBrief(briefMood, themeName)
        await options.fs.writeFile(briefPath, brief)

        // DTCG tokens
        const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
        const personalityForDtcg = customPersonality ?? (resolvedMood ? PERSONALITIES[resolvedMood] : undefined)
        const dtcg = toDtcg(
          theme,
          { seed, pattern, font, shadowProfile, radius, chroma: resolvedChroma },
          resolvedMood,
          undefined,
          personalityForDtcg,
          resolvedChroma,
        )
        await options.fs.writeFile(tokensPath, JSON.stringify(dtcg, null, 2))

        const varCount = Object.keys(theme.cssVars.light).length + Object.keys(theme.cssVars.theme).length
        const moodInfo = customPersonality
          ? (resolvedMood ? `personality + mood: ${resolvedMood}` : 'personality: custom')
          : `mood: ${briefMood}`
        let stdout = `Applied generated theme to src/index.css (seed=${seed}, pattern=${pattern}, ${varCount} vars) + design brief (${moodInfo}) + tokens.json\n`
        if (customPersonality && resolvedMood) {
          stdout += `Note: --personality overrides --mood for design brief. Mood "${resolvedMood}" recorded in metadata.\n`
        }
        return {
          exitCode: 0,
          stdout,
          stderr: '',
          filesChanged: [filePath, briefPath, tokensPath],
        }
      }

      const desc = `seed=${seed}, pattern=${pattern}${font ? `, font=${font}` : ''}${shadowProfile ? `, shadow=${shadowProfile}` : ''}${radius ? `, radius=${radius}` : ''}${resolvedChroma !== undefined ? `, chroma=${resolvedChroma}` : ''}`
      const output = formatThemeOutput(theme, `generated (${pattern})`, desc)
      return { exitCode: 0, stdout: output + '\n', stderr: '' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { exitCode: 1, stdout: '', stderr: `theme generate: ${msg}` }
    }
  }

  private async handleModify(args: string[], options: ShellOptions): Promise<ShellResult> {
    const flags = parseFlags(args)
    const apply = flags['apply'] === 'true'
    const shiftHue = parseFloat(flags['shift-hue'] ?? '')
    const scope = (flags['scope'] ?? 'all') as 'brand' | 'surface' | 'all'

    if (isNaN(shiftHue)) return { exitCode: 1, stdout: '', stderr: 'theme modify: --shift-hue <±degrees> is required' }

    const filePath = resolvePath(options.cwd, 'src/index.css')

    // Read current index.css
    let css: string
    try {
      css = await options.fs.readFile(filePath, { encoding: 'utf8' }) as string
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
    const colorUpdates: Record<string, { l: number; c: number; h: number }> = {}

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
            colorUpdates[varName] = clamped
            continue
          } catch {
            // Fall through to unmodified
          }
        }
      }
      modified.push(line)
    }

    const result = modified.join('\n')

    if (apply) {
      await options.fs.writeFile(filePath, result)

      // Update tokens.json if it exists
      const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
      const changedFiles = [filePath]
      try {
        const tokensRaw = await options.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
        const tokens: DtcgOutput = JSON.parse(tokensRaw)
        patchDtcgColors(tokens, colorUpdates)
        await options.fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2))
        changedFiles.push(tokensPath)
      } catch {
        // tokens.json doesn't exist or is invalid — skip
      }

      return {
        exitCode: 0,
        stdout: `Modified theme in src/index.css (shift-hue=${shiftHue}, scope=${scope})\n`,
        stderr: '',
        filesChanged: changedFiles,
      }
    }

    return { exitCode: 0, stdout: result + '\n', stderr: '' }
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

    if (what === 'moods') {
      const descriptions: Record<MoodName, string> = {
        minimal: 'Let content breathe. Every element earns its place.',
        premium: 'Numbers are heroes, labels are whispers.',
        playful: 'Surprise at every scroll. Joy is not optional.',
        industrial: 'Raw materials. Visible structure. Nothing hidden.',
        organic: 'Natural rhythms. Flowing forms. Living systems.',
        editorial: 'The page is a stage. Typography performs.',
        'fashion-editorial': 'The runway on screen. Drama through restraint and scale.',
        brutalist: 'Raw structure. No pretense. The code is the design.',
        zen: 'Emptiness is form. Let space speak.',
        corporate: 'Clarity serves confidence. Systems enable trust.',
        retro: 'Warmth with intention. Nostalgia refined.',
        luxury: "Whisper, don't shout. Exclusivity through absence.",
      }
      let output = '## Available Moods\n\n'
      for (const mood of MOOD_NAMES) {
        output += `  ${mood.padEnd(20)} ${descriptions[mood]}\n`
      }
      return { exitCode: 0, stdout: output, stderr: '' }
    }

    return { exitCode: 1, stdout: '', stderr: 'theme list: specify presets, patterns, fonts, shadows, radii, or moods' }
  }

  private usage(): string {
    return `Usage:
  theme preset <name> [--mood <name>] [--chroma <level>] [--apply]
  theme generate --seed <0-360> --pattern <name> --mood <name> [--chroma <level>] [--personality <file>] [--font <name>] [--shadow-profile <name>] [--radius <stop>] [--apply]
  theme modify --shift-hue <±deg> [--scope brand|surface|all] [--apply]
  theme list presets|patterns|fonts|shadows|radii|moods

  --apply writes directly to src/index.css + .ralph/design-brief.md + .ralph/tokens.json
  --mood required with --apply on generate (presets auto-infer from PRESET_MOOD_MAP)
        Available: ${MOOD_NAMES.join(', ')}
  --chroma controls saturation: low (0.4x), medium (1.0x), high (1.6x), or numeric 0.0-2.0
  --personality path to custom PersonalityBrief JSON (replaces --mood for design brief)

After applying a theme, use 'tokens' to inspect generated design tokens.`
  }
}

/** Chroma cascade: explicit > alias hint > mood's hint > default (undefined = 1.0x) */
function resolveChromaFlag(
  explicit?: string,
  aliasHint?: 'low' | 'medium' | 'high',
  mood?: MoodName,
): 'low' | 'medium' | 'high' | number | undefined {
  // 1. Explicit --chroma flag
  if (explicit) {
    if (['low', 'medium', 'high'].includes(explicit)) return explicit as 'low' | 'medium' | 'high'
    const num = parseFloat(explicit)
    if (!isNaN(num)) return num
  }
  // 2. Alias chromaHint
  if (aliasHint) return aliasHint
  // 3. Mood's chromaHint
  if (mood && PERSONALITIES[mood]?.chromaHint) return PERSONALITIES[mood].chromaHint
  // 4. Default (undefined = 1.0x in resolveChromaMultiplier)
  return undefined
}

/** Generate design brief from a custom PersonalityBrief (same format as generateDesignBrief but using the object directly) */
function generateDesignBriefFromPersonality(p: PersonalityBrief, themeName: string): string {
  const lines: string[] = []
  lines.push(`# Design Brief — ${themeName}`)
  lines.push('')
  lines.push(`> ${p.philosophy}`)
  lines.push('')
  lines.push(`**Mood:** custom`)
  lines.push('')

  lines.push('## Typography Hierarchy')
  lines.push('')
  lines.push('| Element | Size | Weight | Color | Tracking |')
  lines.push('|---------|------|--------|-------|----------|')
  for (const t of p.typography) {
    lines.push(`| ${t.element} | ${t.size} | ${t.weight} | ${t.color} | ${t.tracking} |`)
  }
  lines.push('')

  lines.push('## Animation Timing')
  lines.push('')
  lines.push('| Type | Duration | Easing |')
  lines.push('|------|----------|--------|')
  for (const a of p.animation) {
    lines.push(`| ${a.type} | ${a.duration} | ${a.easing} |`)
  }
  lines.push('')

  lines.push('## Spacing Rhythm')
  lines.push('')
  lines.push(`- **Base unit:** ${p.spacing.base}`)
  lines.push(`- **Section gap:** ${p.spacing.section}`)
  lines.push(`- **Card padding:** ${p.spacing.cardPadding}`)
  lines.push(`- **Rhythm:** ${p.spacing.rhythm}`)
  lines.push('')

  if (p.interactions?.length) {
    lines.push('## Interaction Patterns')
    lines.push('')
    for (const i of p.interactions) lines.push(`- ${i}`)
    lines.push('')
  }

  if (p.allowed?.length || p.notAllowed?.length) {
    lines.push('## Strict Rules')
    lines.push('')
    if (p.allowed?.length) {
      lines.push('### Allowed')
      for (const a of p.allowed) lines.push(`- ${a}`)
      lines.push('')
    }
    if (p.notAllowed?.length) {
      lines.push('### Not Allowed')
      for (const n of p.notAllowed) lines.push(`- ${n}`)
      lines.push('')
    }
  }

  if (p.checklist?.length) {
    lines.push('## Quality Checklist')
    lines.push('')
    for (const c of p.checklist) lines.push(`- [ ] ${c}`)
    lines.push('')
  }

  return lines.join('\n')
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      // Bare boolean flag: --apply (no value, or next arg is also a flag)
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        flags[key] = 'true'
      } else {
        // Handle quoted values: --font "Plus Jakarta Sans"
        flags[key] = args[i + 1]
        i++
      }
    }
  }
  return flags
}
