import { describe, it, expect } from 'vitest'
import { PERSONALITIES, MOOD_NAMES, generateDesignBrief, validatePersonality } from '../personalities'
import type { MoodName } from '../personalities'

describe('PERSONALITIES', () => {
  it('MOOD_NAMES contains all 12 moods', () => {
    expect(MOOD_NAMES).toHaveLength(12)
    expect(MOOD_NAMES).toContain('minimal')
    expect(MOOD_NAMES).toContain('premium')
    expect(MOOD_NAMES).toContain('playful')
    expect(MOOD_NAMES).toContain('industrial')
    expect(MOOD_NAMES).toContain('organic')
    expect(MOOD_NAMES).toContain('editorial')
    expect(MOOD_NAMES).toContain('fashion-editorial')
    expect(MOOD_NAMES).toContain('brutalist')
    expect(MOOD_NAMES).toContain('zen')
    expect(MOOD_NAMES).toContain('corporate')
    expect(MOOD_NAMES).toContain('retro')
    expect(MOOD_NAMES).toContain('luxury')
  })

  it('PERSONALITIES has an entry for each mood', () => {
    for (const mood of MOOD_NAMES) {
      expect(PERSONALITIES[mood]).toBeDefined()
    }
  })

  it('each personality has required fields with minimum content', () => {
    for (const mood of MOOD_NAMES) {
      const p = PERSONALITIES[mood]
      expect(p.philosophy.length).toBeGreaterThan(0)
      expect(p.typography.length).toBeGreaterThanOrEqual(5)
      expect(p.animation.length).toBeGreaterThanOrEqual(3)
      expect(p.spacing.base.length).toBeGreaterThan(0)
      expect(p.spacing.section.length).toBeGreaterThan(0)
      expect(p.spacing.cardPadding.length).toBeGreaterThan(0)
      expect(p.spacing.rhythm.length).toBeGreaterThan(0)
      expect(p.interactions.length).toBeGreaterThan(0)
      expect(p.allowed.length).toBeGreaterThan(0)
      expect(p.notAllowed.length).toBeGreaterThan(0)
      expect(p.checklist.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('all 12 PERSONALITIES have valid chromaHint', () => {
    for (const mood of MOOD_NAMES) {
      const p = PERSONALITIES[mood]
      expect(p.chromaHint).toBeDefined()
      expect(['low', 'medium', 'high']).toContain(p.chromaHint)
    }
  })
})

describe('validatePersonality', () => {
  const validPersonality = {
    philosophy: 'Test philosophy',
    typography: [
      { element: 'Hero', size: '4xl', weight: 'bold', color: 'foreground', tracking: 'tight' },
    ],
    animation: [
      { type: 'Hover', duration: '200ms', easing: 'ease' },
    ],
    spacing: { base: '4px', section: '64px', cardPadding: '24px', rhythm: 'Test' },
  }

  it('accepts valid PersonalityBrief', () => {
    expect(validatePersonality(validPersonality)).toEqual({ valid: true })
  })

  it('accepts full PersonalityBrief with all optional fields', () => {
    const full = {
      ...validPersonality,
      interactions: ['Hover: scale'],
      allowed: ['Gradients'],
      notAllowed: ['Bounce'],
      checklist: ['Check 1'],
      chromaHint: 'high',
    }
    expect(validatePersonality(full)).toEqual({ valid: true })
  })

  it('rejects missing philosophy', () => {
    const { philosophy, ...rest } = validPersonality
    const result = validatePersonality(rest)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('philosophy: required string')
  })

  it('rejects bad typography shape', () => {
    const bad = { ...validPersonality, typography: [{ element: 'Hero' }] }
    const result = validatePersonality(bad)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some((e: string) => e.includes('typography[0]'))).toBe(true)
  })

  it('accepts missing optional fields', () => {
    // interactions, allowed, notAllowed, checklist are all optional
    expect(validatePersonality(validPersonality)).toEqual({ valid: true })
  })

  it('rejects invalid chromaHint', () => {
    const bad = { ...validPersonality, chromaHint: 'ultra' }
    const result = validatePersonality(bad)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('chromaHint: must be "low", "medium", or "high"')
  })
})

describe('generateDesignBrief', () => {
  it('minimal brief contains all required sections', () => {
    const brief = generateDesignBrief('minimal', 'test-theme')
    expect(brief).toContain('# Design Brief')
    expect(brief).toContain('Typography Hierarchy')
    expect(brief).toContain('Animation Timing')
    expect(brief).toContain('Spacing Rhythm')
    expect(brief).toContain('Strict Rules')
    expect(brief).toContain('### Allowed')
    expect(brief).toContain('### Not Allowed')
    expect(brief).toContain('Quality Checklist')
  })

  it('premium brief contains Memoria philosophy', () => {
    const brief = generateDesignBrief('premium', 'test')
    expect(brief).toContain('Numbers are heroes')
  })

  it('brief contains the theme name', () => {
    const brief = generateDesignBrief('playful', 'my-custom-theme')
    expect(brief).toContain('my-custom-theme')
  })

  it('brief contains the mood name', () => {
    const brief = generateDesignBrief('industrial', 'test')
    expect(brief).toContain('**Mood:** industrial')
  })

  it('all 12 moods produce non-empty briefs', () => {
    for (const mood of MOOD_NAMES) {
      const brief = generateDesignBrief(mood, 'loop-test')
      expect(brief.length).toBeGreaterThan(100)
      expect(brief).toContain('# Design Brief')
    }
  })
})
