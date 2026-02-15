import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TAILWIND_THEME_CSS, compileTailwind, _resetForTesting } from '../tailwind-compiler'

beforeEach(() => {
  _resetForTesting()
})

describe('TAILWIND_THEME_CSS', () => {
  it('contains @theme block with color mappings', () => {
    expect(TAILWIND_THEME_CSS).toContain('@theme')
    expect(TAILWIND_THEME_CSS).toContain('--color-primary: var(--primary)')
    expect(TAILWIND_THEME_CSS).toContain('--radius-lg: var(--radius)')
  })

  it('does not contain @import', () => {
    expect(TAILWIND_THEME_CSS).not.toContain('@import')
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
