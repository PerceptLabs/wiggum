import { describe, it, expect } from 'vitest'
import { formatThemeCss, formatThemeOutput, generateTheme } from '../generator'
import { getPreset } from '../index'

/** All 36 required CSS custom properties — mirrors REQUIRED_THEME_VARS in gates.ts */
const REQUIRED_THEME_VARS = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
  '--success', '--success-foreground', '--warning', '--warning-foreground',
  '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
  '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
]

describe('formatThemeCss', () => {
  it('outputs -- prefix on all variables from preset themes (no prefix in keys)', () => {
    const result = getPreset('mono')!
    const css = formatThemeCss(result.theme)
    // Preset keys lack -- prefix; formatThemeCss must add it
    expect(css).not.toMatch(/\n\s+(?!--)background:/)
    expect(css).not.toMatch(/\n\s+(?!--)foreground:/)
    // Check declarations inside :root and .dark blocks only (base styles like box-sizing are outside)
    const rootBlock = css.match(/:root \{([^}]+)\}/)?.[1] ?? ''
    const darkBlock = css.match(/\.dark \{([^}]+)\}/)?.[1] ?? ''
    const declarations = [...(rootBlock + darkBlock).matchAll(/^\s+([\w-]+):/gm)]
    expect(declarations.length).toBeGreaterThan(0)
    for (const decl of declarations) {
      expect(decl[1]).toMatch(/^--/)
    }
  })

  it('outputs -- prefix on generated themes (prefix already in keys)', () => {
    const theme = generateTheme({ seed: 180, pattern: 'analogous' })
    const css = formatThemeCss(theme)
    const rootBlock = css.match(/:root \{([^}]+)\}/)?.[1] ?? ''
    const darkBlock = css.match(/\.dark \{([^}]+)\}/)?.[1] ?? ''
    const declarations = [...(rootBlock + darkBlock).matchAll(/^\s+([\w-]+):/gm)]
    expect(declarations.length).toBeGreaterThan(0)
    for (const decl of declarations) {
      expect(decl[1]).toMatch(/^--/)
    }
  })

  it('does not double-prefix generated theme keys', () => {
    const theme = generateTheme({ seed: 90, pattern: 'complementary' })
    const css = formatThemeCss(theme)
    expect(css).not.toContain('----')
  })

  it('contains :root and .dark blocks', () => {
    const result = getPreset('cyberpunk')!
    const css = formatThemeCss(result.theme)
    expect(css).toContain(':root {')
    expect(css).toContain('.dark {')
  })

  it('contains all 32 required theme vars in output', () => {
    const result = getPreset('mono')!
    const css = formatThemeCss(result.theme)
    const declaredVars = new Set<string>()
    for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) {
      declaredVars.add(match[1])
    }
    for (const v of REQUIRED_THEME_VARS) {
      expect(declaredVars.has(v), `missing ${v}`).toBe(true)
    }
  })

  it('.dark block only contains vars that differ from light', () => {
    const theme = generateTheme({ seed: 45, pattern: 'triadic' })
    const css = formatThemeCss(theme)
    const darkBlock = css.match(/\.dark \{([^}]+)\}/)?.[1] ?? ''
    const darkVars = [...darkBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
    // Every var in .dark should have a different value in light
    for (const [, varName] of darkVars) {
      const rawKey = varName.startsWith('--') ? varName : `--${varName}`
      const lightVal = theme.cssVars.light[rawKey]
      const darkVal = theme.cssVars.dark[rawKey]
      expect(lightVal).not.toBe(darkVal)
    }
  })

  it('includes base styles (box-sizing, body background/color)', () => {
    const result = getPreset('soft-pop')!
    const css = formatThemeCss(result.theme)
    expect(css).toContain('box-sizing: border-box;')
    expect(css).toContain('background-color: var(--background);')
    expect(css).toContain('color: var(--foreground);')
  })

  it('roundtrip: preset output passes css-theme-complete gate logic', () => {
    // This is the exact failure path the bug caused
    const result = getPreset('elegant-luxury')!
    const css = formatThemeCss(result.theme)

    // Replicate gate check logic
    const declaredVars = new Set<string>()
    for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) {
      declaredVars.add(match[1])
    }
    const missing = REQUIRED_THEME_VARS.filter(v => !declaredVars.has(v))
    const hasDark = css.includes('.dark')

    expect(missing).toEqual([])
    expect(hasDark).toBe(true)
  })
})

describe('formatThemeOutput', () => {
  it('outputs -- prefix on all variables from preset themes', () => {
    const result = getPreset('catppuccin')!
    const output = formatThemeOutput(result.theme, 'catppuccin', 'test')
    // Check that lines with var declarations use -- prefix
    const lines = output.split('\n').filter(l => l.match(/^--[\w-]+:/) || l.match(/^\w[\w-]+:/))
    for (const line of lines) {
      expect(line).toMatch(/^--/)
    }
  })

  it('contains section headers', () => {
    const theme = generateTheme({ seed: 0, pattern: 'monochromatic' })
    const output = formatThemeOutput(theme, 'test', 'description')
    expect(output).toContain('## Shared (:root)')
    expect(output).toContain('## Light Mode (:root)')
    expect(output).toContain('## Dark Mode (.dark)')
  })

  it('includes label and description in header', () => {
    const theme = generateTheme({ seed: 200, pattern: 'fibonacci' })
    const output = formatThemeOutput(theme, 'my-theme', 'custom description')
    expect(output).toContain('# Theme: my-theme')
    expect(output).toContain('custom description')
  })
})
