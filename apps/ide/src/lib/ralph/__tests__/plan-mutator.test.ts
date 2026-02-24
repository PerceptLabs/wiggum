import { describe, it, expect } from 'vitest'
import { extractPlanSections, findAffectedSections, formatMutationContext } from '../plan-mutator'
import type { PlanNode } from '@wiggum/planning/validate'
import type { StructuredTask } from '../task-types'

// ============================================================================
// extractPlanSections
// ============================================================================

describe('extractPlanSections', () => {
  const tree: PlanNode = {
    component: 'App',
    props: { name: 'Test App' },
    line: 1,
    children: [
      {
        component: 'Theme',
        props: { mood: 'zen' },
        line: 2,
        children: [],
      },
      {
        component: 'Screen',
        props: { name: 'Home' },
        line: 3,
        children: [
          { component: 'Section', props: { gumdrop: 'hero', variant: 'centered' }, line: 4, children: [] },
          { component: 'Section', props: { gumdrop: 'features', name: 'Features Grid' }, line: 5, children: [] },
        ],
      },
      {
        component: 'Screen',
        props: { name: 'About' },
        line: 8,
        children: [
          { component: 'Section', props: { gumdrop: 'stats' }, line: 9, children: [] },
        ],
      },
    ],
  }

  it('extracts all Screen and Section nodes', () => {
    const sections = extractPlanSections(tree)
    // 2 Screens + 3 Sections = 5
    expect(sections).toHaveLength(5)
  })

  it('captures name and gumdrop props', () => {
    const sections = extractPlanSections(tree)
    const heroSection = sections.find(s => s.gumdrop === 'hero')
    expect(heroSection).toBeDefined()
    expect(heroSection!.component).toBe('Section')
    expect(heroSection!.line).toBe(4)
  })

  it('captures Screen names', () => {
    const sections = extractPlanSections(tree)
    const homeScreen = sections.find(s => s.name === 'Home')
    expect(homeScreen).toBeDefined()
    expect(homeScreen!.component).toBe('Screen')
  })

  it('skips non-Screen/Section components', () => {
    const sections = extractPlanSections(tree)
    const themeNode = sections.find(s => s.component === 'Theme')
    expect(themeNode).toBeUndefined()
  })
})

// ============================================================================
// findAffectedSections
// ============================================================================

describe('findAffectedSections', () => {
  const sections = [
    { component: 'Screen', name: 'Home', line: 3 },
    { component: 'Section', gumdrop: 'hero', line: 4 },
    { component: 'Section', name: 'Features Grid', gumdrop: 'features', line: 5 },
    { component: 'Screen', name: 'About', line: 8 },
  ]

  it('maps requirements to sections by name match', () => {
    const reqs = [
      { marker: 'MODIFY' as const, description: 'Update the hero section copy' },
    ]
    const result = findAffectedSections(sections, reqs)
    expect(result.size).toBeGreaterThan(0)
    // "hero" in description matches section with gumdrop "hero"
    const heroKey = [...result.keys()].find(k => k.includes('hero'))
    expect(heroKey).toBeDefined()
  })

  it('maps requirements by keyword matching', () => {
    const reqs = [
      { marker: 'ADD' as const, description: 'Add items to the features grid' },
    ]
    const result = findAffectedSections(sections, reqs)
    // "features" in description matches section with name/gumdrop "features"
    const featuresKey = [...result.keys()].find(k => k.includes('features') || k.includes('Features'))
    expect(featuresKey).toBeDefined()
  })

  it('returns empty map when no sections match', () => {
    const reqs = [
      { marker: 'ADD' as const, description: 'Add a pricing table' },
    ]
    const result = findAffectedSections(sections, reqs)
    expect(result.size).toBe(0)
  })
})

// ============================================================================
// formatMutationContext
// ============================================================================

describe('formatMutationContext', () => {
  const planContent = `import { App, Theme, Screen, Section } from '@wiggum/planning'

export default (
  <App name="My App" description="Test app">
    <Theme mood="zen" />
    <Screen name="Home" layout="single">
      <Section gumdrop="hero" variant="centered" />
      <Section gumdrop="features" />
    </Screen>
  </App>
)
`

  const task: StructuredTask = {
    type: 'mutation',
    title: 'Update hero section',
    taskNumber: 3,
    requirements: [
      { marker: 'MODIFY', description: 'Refine hero copy' },
    ],
    scope: {
      preserve: ['All existing features'],
      affectedFiles: ['HeroSection.tsx'],
    },
    rawMessage: 'Update the hero',
  }

  it('includes task number in header', async () => {
    const ctx = await formatMutationContext(task, planContent)
    expect(ctx).toContain('## Plan Update (Task 3)')
  })

  it('includes task type', async () => {
    const ctx = await formatMutationContext(task, planContent)
    expect(ctx).toContain('Type: mutation')
  })

  it('includes scope constraints', async () => {
    const ctx = await formatMutationContext(task, planContent)
    expect(ctx).toContain('PRESERVE: All existing features')
    expect(ctx).toContain('AFFECTED FILES: HeroSection.tsx')
  })

  it('includes change marker instructions', async () => {
    const ctx = await formatMutationContext(task, planContent)
    expect(ctx).toContain('TASK-3')
    expect(ctx).toContain('[ADD|MODIFY|FIX]')
  })

  it('handles plan with no matching sections gracefully', async () => {
    const noMatchTask = {
      ...task,
      requirements: [{ marker: 'ADD' as const, description: 'Add a pricing table' }],
    }
    const ctx = await formatMutationContext(noMatchTask, planContent)
    // Should still produce valid output, just no affected sections
    expect(ctx).toContain('## Plan Update')
    expect(ctx).not.toContain('### Affected Sections')
  })
})
