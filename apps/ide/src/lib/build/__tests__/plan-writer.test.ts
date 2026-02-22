import { describe, it, expect } from 'vitest'
import { serializeThemeJsx, createPlanSkeleton, replaceThemeBlock } from '../plan-writer'

describe('serializeThemeJsx', () => {
  it('serializes all props correctly', () => {
    const result = serializeThemeJsx({
      mood: 'cyberpunk',
      seed: 200,
      pattern: 'golden-ratio',
      font: 'Outfit',
      shadowProfile: 'moderate',
      radius: 'moderate',
    })
    expect(result).toContain('mood="cyberpunk"')
    expect(result).toContain('seed={200}')
    expect(result).toContain('pattern="golden-ratio"')
    expect(result).toContain('font="Outfit"')
    expect(result).toContain('shadowProfile="moderate"')
    expect(result).toContain('radius="moderate"')
    expect(result).toContain('/>')
  })

  it('serializes only mood when other props are undefined', () => {
    const result = serializeThemeJsx({ mood: 'minimal' })
    expect(result).toBe('<Theme mood="minimal" />')
  })

  it('returns empty theme when no props', () => {
    const result = serializeThemeJsx({})
    expect(result).toBe('<Theme />')
  })

  it('formats seed as JSX expression not string', () => {
    const result = serializeThemeJsx({ mood: 'zen', seed: 42 })
    expect(result).toContain('seed={42}')
    expect(result).not.toContain('seed="42"')
  })

  it('omits empty string props', () => {
    const result = serializeThemeJsx({ mood: 'premium', font: '', radius: '' })
    expect(result).toBe('<Theme mood="premium" />')
    expect(result).not.toContain('font')
    expect(result).not.toContain('radius')
  })

  it('multi-line formats when 3+ props', () => {
    const result = serializeThemeJsx({ mood: 'corporate', font: 'Inter', radius: 'subtle' })
    expect(result).toContain('\n')
    expect(result.split('\n').length).toBeGreaterThan(1)
  })
})

describe('createPlanSkeleton', () => {
  it('wraps theme in App component', () => {
    const result = createPlanSkeleton('<Theme mood="cyberpunk" />')
    expect(result).toContain('import { App, Theme }')
    expect(result).toContain('@wiggum/planning')
    expect(result).toContain('<App name="Untitled"')
    expect(result).toContain('<Theme mood="cyberpunk" />')
    expect(result).toContain('export default')
  })

  it('produces valid plan.tsx structure', () => {
    const result = createPlanSkeleton('<Theme mood="zen" font="Inter" />')
    expect(result).toContain('</App>')
    expect(result).toContain('description="(describe your project)"')
  })
})

describe('replaceThemeBlock', () => {
  const PLAN_SELF_CLOSING = `import { App, Theme, Screen, Section } from '@wiggum/planning'

export default (
  <App name="My App" description="Test app">
    <Theme mood="old-mood" font="Old Font" />
    <Screen name="Home" layout="single">
      <Section gumdrop="hero" variant="centered" />
    </Screen>
  </App>
)
`

  const PLAN_WITH_CHILDREN = `import { App, Theme, Typography, Rule, Screen, Section } from '@wiggum/planning'

export default (
  <App name="My App" description="Test app">
    <Theme mood="old-mood" font="Old Font">
      <Typography hero="4xl light" body="sm normal" />
      <Rule always="use warm colors" />
      <Rule no="cold grays" />
    </Theme>
    <Screen name="Home" layout="single">
      <Section gumdrop="hero" />
    </Screen>
  </App>
)
`

  it('replaces self-closing Theme tag', () => {
    const newTheme = '<Theme mood="cyberpunk" font="Outfit" />'
    const result = replaceThemeBlock(PLAN_SELF_CLOSING, newTheme)
    expect(result).not.toBeNull()
    expect(result).toContain('mood="cyberpunk"')
    expect(result).toContain('font="Outfit"')
    expect(result).not.toContain('old-mood')
    expect(result).not.toContain('Old Font')
  })

  it('preserves screens when replacing self-closing Theme', () => {
    const newTheme = '<Theme mood="zen" />'
    const result = replaceThemeBlock(PLAN_SELF_CLOSING, newTheme)!
    expect(result).toContain('<Screen name="Home"')
    expect(result).toContain('<Section gumdrop="hero"')
    expect(result).toContain('<App name="My App"')
  })

  it('replaces opening tag props but preserves children for open Theme', () => {
    const newTheme = '<Theme mood="cyberpunk" font="Outfit" />'
    const result = replaceThemeBlock(PLAN_WITH_CHILDREN, newTheme)
    expect(result).not.toBeNull()
    expect(result).toContain('mood="cyberpunk"')
    expect(result).toContain('font="Outfit"')
    expect(result).not.toContain('old-mood')
    // Children preserved
    expect(result).toContain('<Typography hero="4xl light"')
    expect(result).toContain('<Rule always="use warm colors"')
    expect(result).toContain('</Theme>')
  })

  it('preserves screens when replacing open Theme', () => {
    const newTheme = '<Theme mood="zen" />'
    const result = replaceThemeBlock(PLAN_WITH_CHILDREN, newTheme)!
    expect(result).toContain('<Screen name="Home"')
    expect(result).toContain('<Section gumdrop="hero"')
  })

  it('returns null when no Theme found', () => {
    const noTheme = `import { App } from '@wiggum/planning'
export default (<App name="No Theme"><Screen name="Home" /></App>)`
    const result = replaceThemeBlock(noTheme, '<Theme mood="zen" />')
    expect(result).toBeNull()
  })
})
