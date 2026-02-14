import { describe, it, expect } from 'vitest'
import {
  oklchToRgb,
  rgbToOklch,
  formatOklch,
  parseOklch,
  contrastRatio,
  clampToGamut,
  relativeLuminance,
} from '../oklch'
import type { OklchColor } from '../types'

describe('oklch', () => {
  const white: OklchColor = { l: 1, c: 0, h: 0 }
  const black: OklchColor = { l: 0, c: 0, h: 0 }

  describe('formatOklch / parseOklch roundtrip', () => {
    it('formats OKLCH color as CSS string', () => {
      const color: OklchColor = { l: 0.6487, c: 0.1538, h: 150.3071 }
      expect(formatOklch(color)).toBe('oklch(0.6487 0.1538 150.3071)')
    })

    it('parses CSS string back to OklchColor', () => {
      const parsed = parseOklch('oklch(0.6487 0.1538 150.3071)')
      expect(parsed.l).toBeCloseTo(0.6487, 4)
      expect(parsed.c).toBeCloseTo(0.1538, 4)
      expect(parsed.h).toBeCloseTo(150.3071, 4)
    })

    it('roundtrips format → parse', () => {
      const original: OklchColor = { l: 0.45, c: 0.2, h: 270 }
      const formatted = formatOklch(original)
      const parsed = parseOklch(formatted)
      expect(parsed.l).toBeCloseTo(original.l, 4)
      expect(parsed.c).toBeCloseTo(original.c, 4)
      expect(parsed.h).toBeCloseTo(original.h, 4)
    })

    it('throws on invalid string', () => {
      expect(() => parseOklch('rgb(255, 0, 0)')).toThrow('Invalid oklch string')
    })
  })

  describe('contrastRatio', () => {
    it('white vs black is ~21', () => {
      const ratio = contrastRatio(white, black)
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('same color has ratio 1', () => {
      const mid: OklchColor = { l: 0.5, c: 0, h: 0 }
      expect(contrastRatio(mid, mid)).toBeCloseTo(1, 2)
    })

    it('is symmetric', () => {
      const a: OklchColor = { l: 0.7, c: 0.1, h: 200 }
      const b: OklchColor = { l: 0.3, c: 0.05, h: 200 }
      expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 4)
    })
  })

  describe('clampToGamut', () => {
    it('keeps in-gamut colors unchanged', () => {
      const color: OklchColor = { l: 0.5, c: 0.1, h: 150 }
      const clamped = clampToGamut(color)
      expect(clamped.l).toBe(color.l)
      expect(clamped.c).toBeCloseTo(color.c, 3)
      expect(clamped.h).toBe(color.h)
    })

    it('reduces chroma for out-of-gamut colors', () => {
      const outOfGamut: OklchColor = { l: 0.5, c: 0.4, h: 150 }
      const clamped = clampToGamut(outOfGamut)
      expect(clamped.c).toBeLessThan(outOfGamut.c)
      expect(clamped.l).toBe(outOfGamut.l)
      expect(clamped.h).toBe(outOfGamut.h)
    })
  })

  describe('oklchToRgb / rgbToOklch roundtrip', () => {
    it('white roundtrips', () => {
      const rgb = oklchToRgb(white)
      expect(rgb.r).toBeCloseTo(1, 2)
      expect(rgb.g).toBeCloseTo(1, 2)
      expect(rgb.b).toBeCloseTo(1, 2)
    })

    it('black roundtrips', () => {
      const rgb = oklchToRgb(black)
      expect(rgb.r).toBeCloseTo(0, 2)
      expect(rgb.g).toBeCloseTo(0, 2)
      expect(rgb.b).toBeCloseTo(0, 2)
    })

    it('RGB → OKLCH → RGB roundtrips', () => {
      const oklch = rgbToOklch(0.5, 0.3, 0.8)
      const rgb = oklchToRgb(oklch)
      expect(rgb.r).toBeCloseTo(0.5, 2)
      expect(rgb.g).toBeCloseTo(0.3, 2)
      expect(rgb.b).toBeCloseTo(0.8, 2)
    })
  })

  describe('relativeLuminance', () => {
    it('white has luminance ~1', () => {
      expect(relativeLuminance(white)).toBeCloseTo(1, 1)
    })

    it('black has luminance ~0', () => {
      expect(relativeLuminance(black)).toBeCloseTo(0, 1)
    })
  })
})
