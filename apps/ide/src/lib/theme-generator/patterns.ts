// Color generation algorithm adapted from RLabs-Inc/shadcn-themes (MIT License)
// https://github.com/RLabs-Inc/shadcn-themes
// Copyright (c) RLabs Inc.

import type { GeometryPattern } from './types'

/** Normalize hue to [0, 360) */
function norm(h: number): number {
  return ((h % 360) + 360) % 360
}

const PHI = 137.508 // Golden angle in degrees

export const PATTERNS: Record<string, GeometryPattern> = {
  monochromatic: {
    name: 'monochromatic',
    description: 'Single hue, minimal palette',
    generate: (h) => [norm(h)],
  },
  analogous: {
    name: 'analogous',
    description: 'Adjacent hues, natural harmony',
    generate: (h) => [norm(h), norm(h + 30), norm(h - 30)],
  },
  complementary: {
    name: 'complementary',
    description: 'Opposite hues, bold contrast',
    generate: (h) => [norm(h), norm(h + 180)],
  },
  splitComplementary: {
    name: 'splitComplementary',
    description: 'Base + two flanking its complement',
    generate: (h) => [norm(h), norm(h + 150), norm(h + 210)],
  },
  triadic: {
    name: 'triadic',
    description: 'Three evenly spaced hues',
    generate: (h) => [norm(h), norm(h + 120), norm(h + 240)],
  },
  tetradic: {
    name: 'tetradic',
    description: 'Four hues in a rectangle',
    generate: (h) => [norm(h), norm(h + 90), norm(h + 180), norm(h + 270)],
  },
  goldenRatio: {
    name: 'goldenRatio',
    description: 'Hues spaced by the golden angle (137.508)',
    generate: (h) => [norm(h), norm(h + PHI), norm(h + 2 * PHI), norm(h + 3 * PHI), norm(h + 4 * PHI)],
  },
  flowerOfLife: {
    name: 'flowerOfLife',
    description: 'Six petals at 60 intervals',
    generate: (h) => Array.from({ length: 6 }, (_, i) => norm(h + i * 60)),
  },
  fibonacci: {
    name: 'fibonacci',
    description: 'Two hues separated by golden angle',
    generate: (h) => [norm(h), norm(h + PHI)],
  },
  vesicaPiscis: {
    name: 'vesicaPiscis',
    description: 'Base hue flanked by 52.3 offsets',
    generate: (h) => [norm(h), norm(h + 52.3), norm(h - 52.3)],
  },
  seedOfLife: {
    name: 'seedOfLife',
    description: 'Seven hues at equal intervals',
    generate: (h) => Array.from({ length: 7 }, (_, i) => norm(h + i * (360 / 7))),
  },
}
