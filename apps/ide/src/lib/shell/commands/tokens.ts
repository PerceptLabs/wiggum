/**
 * tokens - Read design token data from .ralph/tokens.json
 *
 * Bare `tokens` = full formatted summary. Subcommands filter to one section.
 */

import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import type { DtcgOutput } from '../../theme-generator/dtcg'
import { resolvePath } from './utils'

export class TokensCommand implements ShellCommand {
  name = 'tokens'
  description = 'Read design token data from .ralph/tokens.json'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const tokensPath = resolvePath(options.cwd, '.ralph/tokens.json')
    let tokens: DtcgOutput
    try {
      const raw = await options.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
      tokens = JSON.parse(raw)
    } catch {
      return { exitCode: 1, stdout: '', stderr: 'tokens: .ralph/tokens.json not found. Run `theme preset <name> --apply` or `theme generate ... --apply` first.' }
    }

    const sub = args[0]

    if (!sub) return { exitCode: 0, stdout: this.formatAll(tokens), stderr: '' }
    if (sub === 'palette') return { exitCode: 0, stdout: this.formatPalette(tokens, args[1] === 'dark'), stderr: '' }
    if (sub === 'contrast') return { exitCode: 0, stdout: this.formatContrast(tokens), stderr: '' }
    if (sub === 'font') return { exitCode: 0, stdout: this.formatFont(tokens), stderr: '' }
    if (sub === 'shadow') return { exitCode: 0, stdout: this.formatShadow(tokens), stderr: '' }
    if (sub === 'mood') return { exitCode: 0, stdout: this.formatMood(tokens), stderr: '' }
    if (sub === 'raw') return { exitCode: 0, stdout: JSON.stringify(tokens, null, 2) + '\n', stderr: '' }
    if (sub === 'help' || sub === '--help') return { exitCode: 0, stdout: this.usage(), stderr: '' }

    return { exitCode: 1, stdout: '', stderr: `tokens: unknown subcommand "${sub}"\n${this.usage()}` }
  }

  private formatAll(tokens: DtcgOutput): string {
    const sections = [
      this.formatPalette(tokens, false),
      this.formatContrast(tokens),
      this.formatFont(tokens),
      this.formatShadow(tokens),
      this.formatMood(tokens),
    ].filter(s => s.trim())
    return sections.join('\n---\n') + '\n'
  }

  private formatPalette(tokens: DtcgOutput, dark: boolean): string {
    const colorMap = dark ? tokens.colorDark : tokens.color
    if (!colorMap || Object.keys(colorMap).length === 0) {
      return dark ? 'No dark mode tokens.\n' : 'No color tokens.\n'
    }

    const lines: string[] = [dark ? '## Dark Palette' : '## Light Palette']
    lines.push(`${Object.keys(colorMap).length} tokens`)
    lines.push('')
    lines.push('| Token | L | C | H | Role | Description |')
    lines.push('|-------|---|---|---|------|-------------|')
    for (const [name, token] of Object.entries(colorMap)) {
      const [l, c, h] = token.$value.components
      const role = token.$extensions.wiggum.role
      lines.push(`| ${name} | ${l.toFixed(2)} | ${c.toFixed(3)} | ${h.toFixed(0)} | ${role} | ${token.$description} |`)
    }
    lines.push('')
    return lines.join('\n')
  }

  private formatContrast(tokens: DtcgOutput): string {
    const pairs = Object.entries(tokens.color).filter(([, t]) =>
      t.$extensions.wiggum.contrastPairs && t.$extensions.wiggum.contrastPairs.length > 0
    )
    if (pairs.length === 0) return 'No contrast pairs.\n'

    const lines: string[] = ['## Contrast']
    lines.push('| Foreground | Background | Ratio | WCAG |')
    lines.push('|-----------|-----------|-------|------|')
    let aaa = 0, aa = 0, aaLarge = 0, fail = 0
    for (const [name, token] of pairs) {
      for (const pair of token.$extensions.wiggum.contrastPairs!) {
        lines.push(`| ${name} | ${pair.against} | ${pair.ratio} | ${pair.wcag} |`)
        if (pair.wcag === 'AAA') aaa++
        else if (pair.wcag === 'AA') aa++
        else if (pair.wcag === 'AA-large') aaLarge++
        else fail++
      }
    }
    const total = aaa + aa + aaLarge + fail
    lines.push('')
    lines.push(`${aaa + aa}/${total} pass AA (${aaa} AAA, ${aa} AA, ${aaLarge} AA-large, ${fail} FAIL)`)
    lines.push('')
    return lines.join('\n')
  }

  private formatFont(tokens: DtcgOutput): string {
    const entries = Object.entries(tokens.fontFamily)
    if (entries.length === 0) return 'No font tokens.\n'

    const lines: string[] = ['## Fonts']
    for (const [key, token] of entries) {
      lines.push(`**${key}**: ${token.$value}`)
      lines.push(`  ${token.$description}`)
      if (token.$extensions) {
        const ext = token.$extensions.wiggum
        lines.push(`  Category: ${ext.registryCategory}, weights: ${ext.weights.join(',')}`)
      }
    }
    lines.push('')
    return lines.join('\n')
  }

  private formatShadow(tokens: DtcgOutput): string {
    const lines: string[] = ['## Shadow']
    const profile = tokens.shadow?.['profile']
    if (profile) lines.push(`Profile: ${profile.$value} — ${profile.$description}`)

    // Primitives
    if (tokens.shadowPrimitives && Object.keys(tokens.shadowPrimitives).length > 0) {
      lines.push('')
      lines.push('Primitives:')
      for (const [key, token] of Object.entries(tokens.shadowPrimitives)) {
        lines.push(`  ${key}: ${token.$value}`)
      }
    }

    // Scale
    if (tokens.shadowScale && Object.keys(tokens.shadowScale).length > 0) {
      lines.push('')
      lines.push('Scale:')
      for (const [level, token] of Object.entries(tokens.shadowScale)) {
        const truncated = token.$value.length > 60 ? token.$value.slice(0, 57) + '...' : token.$value
        lines.push(`  ${level}: ${truncated}`)
      }
    }

    lines.push('')
    return lines.join('\n')
  }

  private formatMood(tokens: DtcgOutput): string {
    const p = tokens.$metadata.personality
    if (!p) return 'No mood personality set.\n'

    const lines: string[] = [`## Mood: ${p.mood}`]
    lines.push(`> ${p.philosophy}`)
    lines.push('')

    if (p.typography.length > 0) {
      lines.push('Typography:')
      for (const t of p.typography) {
        lines.push(`  ${t.element}: ${t.size}, ${t.weight}, ${t.tracking}`)
      }
      lines.push('')
    }

    if (p.animation.length > 0) {
      lines.push('Animation:')
      for (const a of p.animation) {
        lines.push(`  ${a.type}: ${a.duration}, ${a.easing}`)
      }
      lines.push('')
    }

    lines.push(`Spacing: base=${p.spacing.base}, section=${p.spacing.section}, card=${p.spacing.cardPadding}`)
    lines.push(`Rhythm: ${p.spacing.rhythm}`)
    lines.push('')
    return lines.join('\n')
  }

  private usage(): string {
    return `Usage:
  tokens                — full design token summary
  tokens palette        — light color palette table
  tokens palette dark   — dark color palette table
  tokens contrast       — contrast pairs + WCAG levels
  tokens font           — font families (sans/mono/serif)
  tokens shadow         — shadow profile, primitives, scale
  tokens mood           — personality brief from mood
  tokens raw            — raw JSON dump
`
  }
}
