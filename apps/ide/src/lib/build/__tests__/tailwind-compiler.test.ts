import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TAILWIND_THEME_CSS, compileTailwind, parseExtendedColors, _resetForTesting } from '../tailwind-compiler'

beforeEach(() => {
  _resetForTesting()
})

describe('TAILWIND_THEME_CSS', () => {
  it('uses @theme inline to restrict Tailwind to defined tokens only', () => {
    expect(TAILWIND_THEME_CSS).toContain('@theme inline')
    expect(TAILWIND_THEME_CSS).toContain('--color-primary: var(--primary)')
    expect(TAILWIND_THEME_CSS).toContain('--radius-lg: var(--radius)')
  })

  it('registers success and warning semantic tokens', () => {
    expect(TAILWIND_THEME_CSS).toContain('--color-success: var(--success)')
    expect(TAILWIND_THEME_CSS).toContain('--color-success-foreground: var(--success-foreground)')
    expect(TAILWIND_THEME_CSS).toContain('--color-warning: var(--warning)')
    expect(TAILWIND_THEME_CSS).toContain('--color-warning-foreground: var(--warning-foreground)')
  })

  it('registers neutral extremes (white, black, transparent, current)', () => {
    expect(TAILWIND_THEME_CSS).toContain('--color-white: #ffffff')
    expect(TAILWIND_THEME_CSS).toContain('--color-black: #000000')
    expect(TAILWIND_THEME_CSS).toContain('--color-transparent: transparent')
    expect(TAILWIND_THEME_CSS).toContain('--color-current: currentColor')
  })

  it('does not contain @import', () => {
    expect(TAILWIND_THEME_CSS).not.toContain('@import')
  })
})

describe('parseExtendedColors', () => {
  it('extracts names from theme-extended markers', () => {
    const css = `
:root {
  --primary: oklch(0.55 0.22 270);
  /* theme-extended: grape */
  --grape: oklch(0.55 0.20 300);
  /* /theme-extended: grape */
  /* theme-extended: ocean */
  --ocean: oklch(0.55 0.20 200);
  /* /theme-extended: ocean */
}`
    expect(parseExtendedColors(css)).toEqual(['grape', 'ocean'])
  })

  it('returns empty array when no markers present', () => {
    const css = ':root { --primary: oklch(0.55 0.22 270); }'
    expect(parseExtendedColors(css)).toEqual([])
  })

  it('deduplicates names (markers appear in both :root and .dark)', () => {
    const css = `
:root {
  /* theme-extended: grape */
  --grape: oklch(0.55 0.20 300);
  /* /theme-extended: grape */
}
.dark {
  /* theme-extended: grape */
  --grape: oklch(0.65 0.18 300);
  /* /theme-extended: grape */
}`
    expect(parseExtendedColors(css)).toEqual(['grape'])
  })
})

describe('compileTailwind', () => {
  it('returns null when WASM fails to load', async () => {
    // Dynamic import will fail in test environment (no WASM)
    const result = await compileTailwind('<div class="bg-primary">')
    expect(result).toBeNull()
  })

  it('caches WASM failure — second call returns null without retrying', async () => {
    // First call triggers WASM load failure
    await compileTailwind('test')
    // Second call should short-circuit via wasmFailed flag
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await compileTailwind('test2')
    expect(result).toBeNull()
    // Should NOT have warned again (short-circuited before try/catch)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
