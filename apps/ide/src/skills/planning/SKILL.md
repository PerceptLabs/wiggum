---
name: planning
description: JSX planning language for structuring app architecture before implementation
when_to_use: Every new project — write .ralph/plan.tsx before implementing
triggers:
  - plan
  - plan.tsx
  - planning
  - structure
  - screen
  - section
  - architecture
---

# Planning — Structured App Architecture

Write `.ralph/plan.tsx` to define your app's structure before coding. The harness validates it automatically — invalid plans get immediate feedback.

plan.tsx replaces plan.md, intent.md, and design-brief.md. One file, structured and validated.

## Component Hierarchy

```
<App name="..." description="...">
  <Theme mood="..." font="..." shadowProfile="..." radius="...">
    <Typography hero="..." body="..." />
    <Animation hover="..." reveals="..." />
    <Rule always="..." />
    <Rule no="..." />
  </Theme>

  <Screen name="..." layout="...">
    <Nav>
      <NavItem label="..." to="..." icon="..." />
    </Nav>
    <Content>
      <Section gumdrop="..." variant="..." cols={3} />
      <Section gumdrop="...">
        <Gumdrop use="..." variant="..." />
      </Section>
    </Content>
    <Aside>
      <Section gumdrop="..." />
    </Aside>
  </Screen>

  <Data>
    <Schema name="..." fields={{ id: 'string', title: 'string' }} />
    <Endpoint resource="..." pattern="crud" auth />
  </Data>
</App>
```

## Constrained Props (validated by harness)

| Prop | Component | Valid Values | How to List |
|------|-----------|-------------|-------------|
| mood | Theme | 12 moods + 12 presets | `theme list moods` / `theme list presets` |
| font | Theme | 32 curated fonts | `theme list fonts` |
| monoFont | Theme | 32 curated fonts | `theme list fonts` |
| shadowProfile | Theme | none, subtle, moderate, dramatic, harsh | — |
| radius | Theme | none, subtle, moderate, rounded, pill | — |
| gumdrop | Section | 52 recipes | `grep skill "gumdrop"` |
| use | Gumdrop | 52 recipes | `grep skill "gumdrop"` |

## Free Props (not validated)

| Prop | Component | Purpose |
|------|-----------|---------|
| name | App, Screen, Schema | Identifier — use for navigation and data references |
| description | App | Brief project description — serves as intent acknowledgment |
| layout | Screen | Layout strategy: single, sidebar, dashboard, split, etc. |
| variant | Section | Gumdrop variant: centered, split, card, minimal, etc. |
| cols | Section | Column count for grid layouts |
| span | Section, Gumdrop | Grid column span |
| source | Section, Gumdrop | Data source reference |
| className | Content, Aside, Section | Additional Tailwind classes |
| philosophy | Theme | Free-text design philosophy description |
| seed | Theme | Numeric seed for generated themes |
| pattern | Theme | Sacred geometry pattern: goldenRatio, fibonacci, etc. |

## Theme Sub-Components

Use these inside `<Theme>` to describe design intent (not validated, but guides implementation):

| Component | Props | Purpose |
|-----------|-------|---------|
| Typography | hero, titles, labels, body, code | Describe font scale and weight choices |
| Animation | hover, cards, pages, micro, reveals | Describe motion and timing intent |
| Rule | no, always, prefer | Design constraints Ralph must follow |

## Data Components

| Component | Props | Purpose |
|-----------|-------|---------|
| Data | — | Container for schema and endpoint declarations |
| Schema | name, fields | Data model with field types |
| Endpoint | resource, pattern, auth | API endpoint (resource must match a Schema name) |
| Field | name, type, required, placeholder | Form field definition inside Section |
| Column | field, sortable, filterable, format | Table column definition inside Section |
| Action | trigger, gumdrop, intent, hotkey | User interaction trigger |

## Escape Hatches

When no existing gumdrop fits, use these:

**Custom** — Freeform section with intent description:
```tsx
<Section gumdrop="hero">
  <Custom intent="Interactive 3D product configurator with color picker" />
</Section>
```

**Slot** — Named extension point for future content:
```tsx
<Section gumdrop="hero">
  <Slot name="testimonial-carousel" description="Customer quotes with auto-rotation" />
</Section>
```

**Rule** — Design constraints:
```tsx
<Theme mood="minimal">
  <Rule always="Use monochrome palette with single accent color" />
  <Rule no="Gradients, shadows heavier than subtle, rounded corners beyond moderate" />
  <Rule prefer="Generous whitespace, large typography, minimal UI chrome" />
</Theme>
```

## Example: Landing Page

```tsx
import { App, Theme, Screen, Section, Nav, NavItem, Content, Rule } from '@wiggum/planning'

export default (
  <App name="Acme SaaS" description="Project management tool landing page">
    <Theme mood="premium" font="Plus Jakarta Sans" shadowProfile="subtle" radius="moderate">
      <Rule always="Professional tone, trust-building social proof" />
    </Theme>
    <Screen name="Home" layout="single">
      <Section gumdrop="hero" variant="centered" />
      <Section gumdrop="features" cols={3} />
      <Section gumdrop="social-proof" />
      <Section gumdrop="pricing" cols={3} />
      <Section gumdrop="testimonials" />
      <Section gumdrop="faq" />
      <Section gumdrop="cta" />
      <Section gumdrop="footer" />
    </Screen>
    <Screen name="About" layout="single">
      <Nav>
        <NavItem label="Home" to="/" icon="home" />
        <NavItem label="About" to="/about" icon="info" />
      </Nav>
      <Content>
        <Section gumdrop="article-layout" />
        <Section gumdrop="team" cols={4} />
      </Content>
    </Screen>
  </App>
)
```

## Example: Dashboard App

```tsx
import { App, Theme, Screen, Section, Nav, NavItem, Content, Aside, Data, Schema, Endpoint } from '@wiggum/planning'

export default (
  <App name="TaskFlow" description="Team task management dashboard">
    <Theme mood="corporate" font="Inter" monoFont="JetBrains Mono" shadowProfile="moderate" radius="subtle">
      <Rule always="Dense information display, clear data hierarchy" />
      <Rule no="Decorative elements, large hero sections" />
    </Theme>
    <Screen name="Dashboard" layout="dashboard">
      <Nav>
        <NavItem label="Dashboard" to="/" icon="layout-dashboard" />
        <NavItem label="Tasks" to="/tasks" icon="check-square" />
        <NavItem label="Settings" to="/settings" icon="settings" />
      </Nav>
      <Content>
        <Section gumdrop="stats-dashboard" cols={4} />
        <Section gumdrop="kanban-board" />
      </Content>
      <Aside>
        <Section gumdrop="activity-feed" />
      </Aside>
    </Screen>
    <Screen name="Tasks" layout="single">
      <Content>
        <Section gumdrop="data-table" />
      </Content>
    </Screen>
    <Data>
      <Schema name="Task" fields={{ id: 'string', title: 'string', status: 'string', assignee: 'string' }} />
      <Endpoint resource="tasks" pattern="crud" auth />
    </Data>
  </App>
)
```

## Anti-Patterns

**Too vague** — Sections without context:
```tsx
<!-- BAD -->
<Section gumdrop="hero" />
<!-- BETTER -->
<Section gumdrop="hero" variant="centered" />
```

**All same gumdrops** — Repetitive layout creates visual monotony:
```tsx
<!-- BAD: 4 grid sections in a row -->
<Section gumdrop="features" />
<Section gumdrop="pricing" />
<Section gumdrop="team" />
<Section gumdrop="gallery" />
<!-- BETTER: alternate dense and breathing sections -->
<Section gumdrop="features" cols={3} />
<Section gumdrop="cta" />
<Section gumdrop="pricing" cols={3} />
<Section gumdrop="testimonials" />
```

**Missing Theme** — Always start with `<Theme>`. It's your design contract.

**Missing Data for stateful gumdrops** — `data-table`, `kanban-board`, `calendar-view`, etc. need a `<Data>` block with matching schemas.

**Over-specified plans** — Plans describe WHAT, not HOW. Don't specify pixel values, exact Tailwind classes, or component internals. Implementation details belong in src/.

**Mismatched Endpoint resources** — Endpoint `resource` must match a Schema `name` (singular/plural normalization: Schema "Task" matches Endpoint "tasks").
