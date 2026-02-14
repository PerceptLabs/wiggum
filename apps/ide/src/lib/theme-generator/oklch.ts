// Color generation algorithm adapted from RLabs-Inc/shadcn-themes (MIT License)
// https://github.com/RLabs-Inc/shadcn-themes
// Copyright (c) RLabs Inc.
//
// OKLCH math from Bjorn Ottosson (public domain)
// https://bottosson.github.io/posts/oklab/

import type { OklchColor } from './types'

/**
 * OKLCH → OKLab → linear RGB → sRGB
 */
export function oklchToRgb(color: OklchColor): { r: number, g: number, b: number } {
  const { l, c, h } = color
  const hRad = h * Math.PI / 180

  // OKLCH → OKLab
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  // OKLab → linear RGB (via LMS intermediate)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b

  const lCubed = l_ * l_ * l_
  const mCubed = m_ * m_ * m_
  const sCubed = s_ * s_ * s_

  const rLinear = +4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.7076147010 * sCubed

  return {
    r: linearToSrgb(rLinear),
    g: linearToSrgb(gLinear),
    b: linearToSrgb(bLinear),
  }
}

/**
 * sRGB → linear RGB → OKLab → OKLCH
 */
export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const rLin = srgbToLinear(r)
  const gLin = srgbToLinear(g)
  const bLin = srgbToLinear(b)

  // Linear RGB → LMS (cube root)
  const l_ = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin)
  const m_ = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin)
  const s_ = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin)

  // LMS → OKLab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bLab * bLab)
  let H = Math.atan2(bLab, a) * 180 / Math.PI
  if (H < 0) H += 360

  return { l: L, c: C, h: C < 0.0001 ? 0 : H }
}

/** Format OKLCH color as CSS string */
export function formatOklch(color: OklchColor): string {
  return `oklch(${round4(color.l)} ${round4(color.c)} ${round4(color.h)})`
}

/** Parse "oklch(L C H)" CSS string to OklchColor */
export function parseOklch(css: string): OklchColor {
  const match = css.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) throw new Error(`Invalid oklch string: ${css}`)
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
  }
}

/** WCAG relative luminance from OKLCH color */
export function relativeLuminance(color: OklchColor): number {
  const { r, g, b } = oklchToRgb(color)
  const rLin = srgbToLinear(Math.max(0, Math.min(1, r)))
  const gLin = srgbToLinear(Math.max(0, Math.min(1, g)))
  const bLin = srgbToLinear(Math.max(0, Math.min(1, b)))
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

/** WCAG contrast ratio between two OKLCH colors */
export function contrastRatio(fg: OklchColor, bg: OklchColor): number {
  const lFg = relativeLuminance(fg)
  const lBg = relativeLuminance(bg)
  const lighter = Math.max(lFg, lBg)
  const darker = Math.min(lFg, lBg)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Clamp chroma to keep color within sRGB gamut (binary search) */
export function clampToGamut(color: OklchColor): OklchColor {
  if (isInGamut(color)) return color

  let lo = 0
  let hi = color.c
  let mid = color.c

  for (let i = 0; i < 20; i++) {
    mid = (lo + hi) / 2
    if (isInGamut({ ...color, c: mid })) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 0.001) break
  }

  return { l: color.l, c: lo, h: color.h }
}

// ============================================================================
// Internal helpers
// ============================================================================

function isInGamut(color: OklchColor): boolean {
  const { r, g, b } = oklchToRgb(color)
  const epsilon = 0.001
  return r >= -epsilon && r <= 1 + epsilon &&
         g >= -epsilon && g <= 1 + epsilon &&
         b >= -epsilon && b <= 1 + epsilon
}

function linearToSrgb(v: number): number {
  if (v >= 0.0031308) return 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return 12.92 * v
}

function srgbToLinear(v: number): number {
  if (v >= 0.04045) return Math.pow((v + 0.055) / 1.055, 2.4)
  return v / 12.92
}

function round4(n: number): string {
  return Number(n.toFixed(4)).toString()
}
