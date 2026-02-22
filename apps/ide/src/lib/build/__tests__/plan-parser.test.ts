import { describe, it, expect, vi } from 'vitest'

// Test the regex fallback path directly (babel path requires network)
// We test by mocking the dynamic import to fail, forcing regex path
vi.stubGlobal('import', undefined) // Ensure no dynamic import leaks

// Import internals for regex-path testing
// The public parsePlanTsx is async and tries babel first, so we test
// a minimal plan through it with babel mocked out

const SIMPLE_PLAN = `
import { App, Theme, Screen, Section } from '@wiggum/planning'

export default (
  <App name="Test App" description="A test app">
    <Theme mood="minimal" seed={42} font="Inter" monoFont="JetBrains Mono" shadowProfile="subtle" radius="moderate" />
    <Screen name="Home" layout="single">
      <Section gumdrop="hero" variant="centered" />
      <Section gumdrop="features" cols={3} />
    </Screen>
    <Screen name="About" layout="sidebar">
      <Section gumdrop="article-layout" />
    </Screen>
  </App>
)
`

const NESTED_PLAN = `
import { App, Theme, Screen, Nav, NavItem, Content, Section, Gumdrop } from '@wiggum/planning'

export default (
  <App name="Nested" description="Test nesting">
    <Theme mood="premium" />
    <Screen name="Dashboard" layout="dashboard">
      <Nav>
        <NavItem icon="home" label="Home" to="/" />
        <NavItem icon="settings" label="Settings" to="/settings" />
      </Nav>
      <Content>
        <Section gumdrop="stats-dashboard">
          <Gumdrop use="blog-grid" variant="card" label="Sub-gumdrop" />
        </Section>
        <Section gumdrop="data-table" />
      </Content>
    </Screen>
  </App>
)
`

const WITH_COMMENTS = `
import { App, Theme, Screen, Section } from '@wiggum/planning'

export default (
  <App name="Comments">
    <Theme mood="playful" />
    {/* This is a comment */}
    <Screen name="Home" layout="single">
      {/* Another comment
          spanning multiple lines */}
      <Section gumdrop="hero" />
    </Screen>
  </App>
)
`

const WITH_OBJECT_PROPS = `
import { App, Theme, Screen, Section, Data, Schema, Endpoint, Field } from '@wiggum/planning'

export default (
  <App name="Data App">
    <Theme mood="corporate" />
    <Screen name="Form" layout="single">
      <Section gumdrop="form-layout">
        <Field name="title" type="text" required placeholder="Enter title" />
      </Section>
    </Screen>
    <Data>
      <Schema name="Item" fields={{
        id: 'string',
        title: 'string',
        count: 'number',
      }} />
      <Endpoint resource="items" pattern="crud" auth />
    </Data>
  </App>
)
`

const MALFORMED = `
import { App } from '@wiggum/planning'

export default (
  <App name="Broken">
    <Screen name="Home">
      <Section gumdrop="hero" />
    </App>
)
`

const EMPTY = ``

const NO_EXPORT = `
import { App } from '@wiggum/planning'

const plan = (
  <App name="No Export" />
)
`

// For testing, we use parsePlanTsx which will fall back to regex when babel is unavailable
import { parsePlanTsx } from '../../build/plan-parser'

describe('plan-parser', () => {
  describe('simple plan', () => {
    it('parses root App with correct props', async () => {
      const { root, errors } = await parsePlanTsx(SIMPLE_PLAN)
      expect(errors).toHaveLength(0)
      expect(root).not.toBeNull()
      expect(root!.component).toBe('App')
      expect(root!.props.name).toBe('Test App')
      expect(root!.props.description).toBe('A test app')
    })

    it('finds Theme child with all props', async () => {
      const { root } = await parsePlanTsx(SIMPLE_PLAN)
      const theme = root!.children.find(c => c.component === 'Theme')
      expect(theme).toBeDefined()
      expect(theme!.props.mood).toBe('minimal')
      expect(theme!.props.seed).toBe(42)
      expect(theme!.props.font).toBe('Inter')
      expect(theme!.props.monoFont).toBe('JetBrains Mono')
      expect(theme!.props.shadowProfile).toBe('subtle')
      expect(theme!.props.radius).toBe('moderate')
    })

    it('finds Screen children', async () => {
      const { root } = await parsePlanTsx(SIMPLE_PLAN)
      const screens = root!.children.filter(c => c.component === 'Screen')
      expect(screens).toHaveLength(2)
      expect(screens[0].props.name).toBe('Home')
      expect(screens[1].props.name).toBe('About')
    })

    it('finds Section children of Screens', async () => {
      const { root } = await parsePlanTsx(SIMPLE_PLAN)
      const home = root!.children.find(c => c.props.name === 'Home')!
      expect(home.children).toHaveLength(2)
      expect(home.children[0].props.gumdrop).toBe('hero')
      expect(home.children[0].props.variant).toBe('centered')
      expect(home.children[1].props.gumdrop).toBe('features')
      expect(home.children[1].props.cols).toBe(3)
    })
  })

  describe('nested plan', () => {
    it('preserves Content/Nav hierarchy', async () => {
      const { root, errors } = await parsePlanTsx(NESTED_PLAN)
      expect(errors).toHaveLength(0)
      const screen = root!.children.find(c => c.component === 'Screen')!
      const nav = screen.children.find(c => c.component === 'Nav')
      const content = screen.children.find(c => c.component === 'Content')
      expect(nav).toBeDefined()
      expect(content).toBeDefined()
      expect(nav!.children).toHaveLength(2)
      expect(nav!.children[0].component).toBe('NavItem')
      expect(nav!.children[0].props.label).toBe('Home')
    })

    it('finds Sections inside Content', async () => {
      const { root } = await parsePlanTsx(NESTED_PLAN)
      const screen = root!.children.find(c => c.component === 'Screen')!
      const content = screen.children.find(c => c.component === 'Content')!
      expect(content.children).toHaveLength(2)
      expect(content.children[0].props.gumdrop).toBe('stats-dashboard')
      expect(content.children[1].props.gumdrop).toBe('data-table')
    })

    it('finds Gumdrop nested inside Section', async () => {
      const { root } = await parsePlanTsx(NESTED_PLAN)
      const screen = root!.children.find(c => c.component === 'Screen')!
      const content = screen.children.find(c => c.component === 'Content')!
      const section = content.children[0]
      expect(section.children).toHaveLength(1)
      expect(section.children[0].component).toBe('Gumdrop')
      expect(section.children[0].props.use).toBe('blog-grid')
    })
  })

  describe('comments', () => {
    it('strips JSX comments cleanly', async () => {
      const { root, errors } = await parsePlanTsx(WITH_COMMENTS)
      expect(errors).toHaveLength(0)
      expect(root!.component).toBe('App')
      const screen = root!.children.find(c => c.component === 'Screen')!
      expect(screen.children).toHaveLength(1)
      expect(screen.children[0].props.gumdrop).toBe('hero')
    })
  })

  describe('object props', () => {
    it('does not break on fields={{ ... }} syntax', async () => {
      const { root, errors } = await parsePlanTsx(WITH_OBJECT_PROPS)
      expect(errors).toHaveLength(0)
      expect(root!.component).toBe('App')

      // Find Data block
      const data = root!.children.find(c => c.component === 'Data')
      expect(data).toBeDefined()
      const schema = data!.children.find(c => c.component === 'Schema')
      expect(schema).toBeDefined()
      expect(schema!.props.name).toBe('Item')
    })

    it('extracts boolean props', async () => {
      const { root } = await parsePlanTsx(WITH_OBJECT_PROPS)
      const data = root!.children.find(c => c.component === 'Data')!
      const endpoint = data.children.find(c => c.component === 'Endpoint')!
      expect(endpoint.props.resource).toBe('items')
      expect(endpoint.props.pattern).toBe('crud')
      expect(endpoint.props.auth).toBe(true)
    })

    it('extracts Field props', async () => {
      const { root } = await parsePlanTsx(WITH_OBJECT_PROPS)
      const screen = root!.children.find(c => c.component === 'Screen')!
      const section = screen.children[0]
      const field = section.children.find(c => c.component === 'Field')!
      expect(field.props.name).toBe('title')
      expect(field.props.type).toBe('text')
      expect(field.props.required).toBe(true)
      expect(field.props.placeholder).toBe('Enter title')
    })
  })

  describe('error handling', () => {
    it('returns errors for malformed JSX', async () => {
      const { errors } = await parsePlanTsx(MALFORMED)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('returns null root for empty input', async () => {
      const { root } = await parsePlanTsx(EMPTY)
      expect(root).toBeNull()
    })

    it('returns null root for missing export default', async () => {
      const { root } = await parsePlanTsx(NO_EXPORT)
      expect(root).toBeNull()
    })
  })
})
