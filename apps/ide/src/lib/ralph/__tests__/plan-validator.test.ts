import { describe, it, expect } from 'vitest'
import { validatePlan } from '@wiggum/planning/validate'
import type { PlanNode, PlanRegistries } from '@wiggum/planning/validate'

// Test registries — minimal sets for isolated testing
const TEST_REGISTRIES: PlanRegistries = {
  moods: ['minimal', 'premium', 'playful'],
  presets: ['cyberpunk', 'bubblegum'],
  patterns: ['goldenRatio', 'fibonacci'],
  fonts: ['Inter', 'Lora', 'JetBrains Mono'],
  shadows: ['none', 'subtle', 'dramatic'],
  radii: ['none', 'moderate', 'pill'],
  gumdrops: ['hero', 'features', 'blog-grid', 'gallery', 'data-table', 'form-layout', 'article-layout', 'pricing', 'stats-dashboard', 'kanban-board', 'newsletter', 'search-results'],
}

// Helper to build PlanNode trees concisely
function node(
  component: string,
  props: Record<string, string | number | boolean> = {},
  children: PlanNode[] = [],
  line = 1
): PlanNode {
  return { component, props, children, line }
}

/** A valid plan tree for baseline testing */
function validPlan(): PlanNode {
  return node('App', { name: 'Test', description: 'A test app' }, [
    node('Theme', { mood: 'minimal', font: 'Inter', monoFont: 'JetBrains Mono' }, [], 2),
    node('Screen', { name: 'Home', layout: 'single' }, [
      node('Section', { gumdrop: 'hero' }, [], 4),
      node('Section', { gumdrop: 'features' }, [], 5),
      node('Section', { gumdrop: 'newsletter' }, [], 6),
    ], 3),
    node('Screen', { name: 'About' }, [
      node('Nav', {}, [
        node('NavItem', { label: 'Home', to: '/' }, [], 9),
      ], 8),
      node('Content', {}, [
        node('Section', { gumdrop: 'article-layout' }, [], 11),
      ], 10),
    ], 7),
  ], 1)
}

describe('validatePlan', () => {
  describe('FAIL checks', () => {
    it('passes for a valid plan', () => {
      const result = validatePlan(validPlan(), TEST_REGISTRIES)
      expect(result.failures).toHaveLength(0)
    })

    it('parseable — fails for null root', () => {
      const result = validatePlan(null, TEST_REGISTRIES)
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0].id).toBe('parseable')
    })

    it('has-app-root — fails when root is not App', () => {
      const root = node('Theme', { mood: 'minimal' })
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'has-app-root')).toBe(true)
    })

    it('has-theme — fails when no Theme child', () => {
      const root = node('App', { name: 'Test' }, [
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'has-theme')).toBe(true)
    })

    it('has-screens — fails when no Screen children', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'has-screens')).toBe(true)
    })

    it('valid-mood — fails for unknown mood', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'midnite' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'valid-mood')).toBe(true)
      expect(result.failures.find(f => f.id === 'valid-mood')!.message).toContain('midnite')
    })

    it('valid-mood — accepts preset names', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'cyberpunk' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.filter(f => f.id === 'valid-mood')).toHaveLength(0)
    })

    it('valid-mood — skips when mood prop absent', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', {}),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.filter(f => f.id === 'valid-mood')).toHaveLength(0)
    })

    it('valid-font — fails for unknown font', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal', font: 'ComicSans' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'valid-font')).toBe(true)
      expect(result.failures.find(f => f.id === 'valid-font')!.message).toContain('ComicSans')
    })

    it('valid-font — fails for unknown monoFont', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal', font: 'Inter', monoFont: 'BadMono' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'valid-font' && f.message.includes('BadMono'))).toBe(true)
    })

    it('valid-gumdrops — fails for unknown gumdrop', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'nonexistent-widget' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'valid-gumdrops')).toBe(true)
      expect(result.failures.find(f => f.id === 'valid-gumdrops')!.message).toContain('nonexistent-widget')
    })

    it('valid-gumdrops — fails for unknown use prop', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }, [
            node('Gumdrop', { use: 'fake-gumdrop' }),
          ]),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'valid-gumdrops' && f.message.includes('fake-gumdrop'))).toBe(true)
    })

    it('sections-have-gumdrops — fails for section without gumdrop', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { variant: 'centered' }, [], 5),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'sections-have-gumdrops')).toBe(true)
    })

    it('no-empty-screens — fails for screen with no sections', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Empty' }),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'no-empty-screens')).toBe(true)
      expect(result.failures.find(f => f.id === 'no-empty-screens')!.message).toContain('Empty')
    })

    it('no-empty-screens — passes when sections are inside Content', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Nested' }, [
          node('Content', {}, [
            node('Section', { gumdrop: 'hero' }),
          ]),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.filter(f => f.id === 'no-empty-screens')).toHaveLength(0)
    })

    it('schema-endpoint-match — fails when endpoint has no matching schema', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
        node('Data', {}, [
          node('Schema', { name: 'User' }),
          node('Endpoint', { resource: 'orders', pattern: 'crud' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.some(f => f.id === 'schema-endpoint-match')).toBe(true)
      expect(result.failures.find(f => f.id === 'schema-endpoint-match')!.message).toContain('orders')
    })

    it('schema-endpoint-match — passes with pluralized resource', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
        ]),
        node('Data', {}, [
          node('Schema', { name: 'Recipe' }),
          node('Endpoint', { resource: 'recipes', pattern: 'crud' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.failures.filter(f => f.id === 'schema-endpoint-match')).toHaveLength(0)
    })

    it('reports multiple failures without short-circuit', () => {
      const root = node('App', { name: 'Test' }, [
        // No Theme
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'nonexistent' }), // Invalid gumdrop
        ]),
        node('Screen', { name: 'Empty' }), // Empty screen
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      const ids = result.failures.map(f => f.id)
      expect(ids).toContain('has-theme')
      expect(ids).toContain('valid-gumdrops')
      expect(ids).toContain('no-empty-screens')
    })
  })

  describe('WARN checks', () => {
    it('adjacent-grids — warns for consecutive grid sections', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'blog-grid' }),
          node('Section', { gumdrop: 'gallery' }),
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.some(w => w.id === 'adjacent-grids')).toBe(true)
    })

    it('adjacent-grids — no warning when non-grid between', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'blog-grid' }),
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'gallery' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.filter(w => w.id === 'adjacent-grids')).toHaveLength(0)
    })

    it('low-diversity — warns when fewer than 3 distinct gumdrops', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'hero' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.some(w => w.id === 'low-diversity')).toBe(true)
    })

    it('low-diversity — no warning with 3+ distinct gumdrops', () => {
      const root = validPlan() // Has hero, features, newsletter, article-layout
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.filter(w => w.id === 'low-diversity')).toHaveLength(0)
    })

    it('missing-nav — warns for multi-screen app without Nav', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'features' }),
          node('Section', { gumdrop: 'newsletter' }),
        ]),
        node('Screen', { name: 'About' }, [
          node('Section', { gumdrop: 'article-layout' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.some(w => w.id === 'missing-nav')).toBe(true)
    })

    it('missing-nav — no warning for single screen app', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'features' }),
          node('Section', { gumdrop: 'newsletter' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.filter(w => w.id === 'missing-nav')).toHaveLength(0)
    })

    it('no-data-for-stateful — warns for stateful gumdrop without Data', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'data-table' }),
          node('Section', { gumdrop: 'newsletter' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.some(w => w.id === 'no-data-for-stateful')).toBe(true)
      expect(result.warnings.find(w => w.id === 'no-data-for-stateful')!.message).toContain('data-table')
    })

    it('no-data-for-stateful — no warning when Data block present', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Section', { gumdrop: 'hero' }),
          node('Section', { gumdrop: 'data-table' }),
          node('Section', { gumdrop: 'newsletter' }),
        ]),
        node('Data', {}, [
          node('Schema', { name: 'Item' }),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.filter(w => w.id === 'no-data-for-stateful')).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('valid plan with all defaults (no registries override) works', () => {
      // This uses the real generated-values as defaults
      const root = validPlan()
      const result = validatePlan(root)
      // Should pass since our test plan uses real values
      expect(result.failures).toHaveLength(0)
    })

    it('adjacent-grids checks inside Content wrapper', () => {
      const root = node('App', { name: 'Test' }, [
        node('Theme', { mood: 'minimal' }),
        node('Screen', { name: 'Home' }, [
          node('Content', {}, [
            node('Section', { gumdrop: 'pricing' }),
            node('Section', { gumdrop: 'stats-dashboard' }),
          ]),
        ]),
      ])
      const result = validatePlan(root, TEST_REGISTRIES)
      expect(result.warnings.some(w => w.id === 'adjacent-grids')).toBe(true)
    })
  })
})
