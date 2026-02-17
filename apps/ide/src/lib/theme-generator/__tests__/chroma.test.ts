import { describe, it, expect } from 'vitest'
import { resolveChromaMultiplier, CHROMA_LEVELS, generateTheme } from '../index'
import { parseOklch } from '../oklch'

describe('resolveChromaMultiplier', () => {
  it('low → 0.4', () => {
    expect(resolveChromaMultiplier('low')).toBe(0.4)
  })

  it('medium → 1.0', () => {
    expect(resolveChromaMultiplier('medium')).toBe(1.0)
  })

  it('high → 1.6', () => {
    expect(resolveChromaMultiplier('high')).toBe(1.6)
  })

  it('numeric passthrough', () => {
    expect(resolveChromaMultiplier(0.7)).toBe(0.7)
  })

  it('clamps high numeric to 2.0', () => {
    expect(resolveChromaMultiplier(5.0)).toBe(2.0)
  })

  it('clamps negative numeric to 0.0', () => {
    expect(resolveChromaMultiplier(-1)).toBe(0.0)
  })

  it('undefined → 1.0 (default)', () => {
    expect(resolveChromaMultiplier(undefined)).toBe(1.0)
  })
})

describe('CHROMA_LEVELS', () => {
  it('has exactly 3 named levels', () => {
    expect(Object.keys(CHROMA_LEVELS)).toEqual(['low', 'medium', 'high'])
  })
})

describe('generateTheme chroma integration', () => {
  const baseConfig = { seed: 150, pattern: 'triadic' }

  it('chroma high produces higher C values than default', () => {
    const defaultTheme = generateTheme(baseConfig)
    const highTheme = generateTheme({ ...baseConfig, chroma: 'high' })

    const defaultPrimary = parseOklch(defaultTheme.cssVars.light['--primary'])
    const highPrimary = parseOklch(highTheme.cssVars.light['--primary'])

    expect(highPrimary!.c).toBeGreaterThanOrEqual(defaultPrimary!.c)
  })

  it('chroma low produces lower C values than default', () => {
    const defaultTheme = generateTheme(baseConfig)
    const lowTheme = generateTheme({ ...baseConfig, chroma: 'low' })

    const defaultPrimary = parseOklch(defaultTheme.cssVars.light['--primary'])
    const lowPrimary = parseOklch(lowTheme.cssVars.light['--primary'])

    expect(lowPrimary!.c).toBeLessThanOrEqual(defaultPrimary!.c)
  })

  it('no chroma produces identical output to default', () => {
    const theme1 = generateTheme(baseConfig)
    const theme2 = generateTheme({ ...baseConfig, chroma: undefined })

    expect(theme1.cssVars.light['--primary']).toBe(theme2.cssVars.light['--primary'])
    expect(theme1.cssVars.light['--accent']).toBe(theme2.cssVars.light['--accent'])
    expect(theme1.cssVars.light['--chart-1']).toBe(theme2.cssVars.light['--chart-1'])
  })

  it('chart colors are also scaled by chroma multiplier', () => {
    const defaultTheme = generateTheme(baseConfig)
    const highTheme = generateTheme({ ...baseConfig, chroma: 'high' })

    const defaultChart = parseOklch(defaultTheme.cssVars.light['--chart-1'])
    const highChart = parseOklch(highTheme.cssVars.light['--chart-1'])

    expect(highChart!.c).toBeGreaterThanOrEqual(defaultChart!.c)
  })
})
