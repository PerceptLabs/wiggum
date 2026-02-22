/**
 * Example: Recipe Tracker app plan
 *
 * Exercises all planning components and type constraints.
 * This file type-checks via `tsc --noEmit` but never executes.
 */
import {
  App, Theme, Typography, Animation, Rule,
  Screen, Nav, NavItem, Content, Section,
  Gumdrop, Column, Field, Action, Slot,
  Custom, Data, Schema, Endpoint,
} from '@wiggum/planning'

export default (
  <App name="Recipe Tracker" description="Collect, organize, and share recipes">
    <Theme
      mood="organic"
      seed={142}
      pattern="goldenRatio"
      font="Lora"
      monoFont="JetBrains Mono"
      shadowProfile="subtle"
      radius="moderate"
      philosophy="Warm, kitchen-table feel with serif headings and earthy tones"
    >
      <Typography
        hero="60px serif, tight tracking"
        titles="28px semi-bold"
        body="16px/1.6 comfortable reading"
        code="14px mono for ingredient quantities"
      />
      <Animation
        hover="gentle lift with shadow"
        cards="stagger fade-in on scroll"
        pages="cross-fade 200ms"
        micro="subtle scale on tap"
      />
      <Rule no="neon colors, harsh shadows, brutalist layouts" />
      <Rule always="warm palette, rounded imagery, generous whitespace" />
      <Rule prefer="card-based layouts over dense lists" />
    </Theme>

    {/* ===== SCREENS ===== */}

    <Screen name="Home" layout="single">
      <Nav>
        <NavItem icon="book" label="Recipes" to="/" />
        <NavItem icon="plus" label="New Recipe" to="/new" />
        <NavItem icon="heart" label="Favorites" to="/favorites" />
        <NavItem icon="user" label="Profile" to="/profile" />
      </Nav>
      <Content>
        <Section gumdrop="hero" variant="centered">
          <Action trigger="click CTA" gumdrop="search-results" intent="navigate to search" />
        </Section>
        <Section gumdrop="grid-list" cols={3} source="recipes">
          <Gumdrop use="blog-grid" variant="card" label="Recipe cards" />
        </Section>
        <Section gumdrop="newsletter" variant="minimal" />
      </Content>
    </Screen>

    <Screen name="Recipe Detail" layout="sidebar">
      <Content>
        <Section gumdrop="article-layout">
          <Slot name="ingredients" description="Structured ingredient list with quantities" />
          <Slot name="steps" description="Numbered cooking steps with timers" />
          <Action trigger="click save" intent="add to favorites" />
          <Action trigger="click share" intent="generate share link" />
        </Section>
        <Custom intent="Interactive cooking mode with step-by-step timer overlay">
          Step through each instruction with auto-advancing timers.
          Highlight current step. Voice readback optional.
        </Custom>
      </Content>
    </Screen>

    <Screen name="New Recipe" layout="single">
      <Content>
        <Section gumdrop="form-layout">
          <Field name="title" type="text" required placeholder="Recipe name" />
          <Field name="description" type="textarea" placeholder="Brief description" />
          <Field name="cuisine" type="select" options={['Italian', 'Mexican', 'Japanese', 'Indian', 'French', 'Thai']} />
          <Field name="prepTime" type="number" range={[1, 480]} placeholder="Minutes" />
          <Field name="difficulty" type="select" options={['Easy', 'Medium', 'Hard']} required />
          <Field name="ingredients" type="repeater" />
          <Field name="photo" type="file" />
          <Action trigger="submit" intent="save recipe and navigate to detail" />
        </Section>
      </Content>
    </Screen>

    <Screen name="Search" layout="single">
      <Content>
        <Section gumdrop="search-results" source="recipes">
          <Column field="title" sortable />
          <Column field="cuisine" filterable />
          <Column field="prepTime" sortable format="minutes" width="100px" />
          <Column field="difficulty" filterable />
          <Action trigger="click row" intent="navigate to recipe detail" />
        </Section>
      </Content>
    </Screen>

    {/* ===== DATA MODEL ===== */}

    <Data>
      <Schema name="Recipe" fields={{
        id: 'string',
        title: 'string',
        description: 'string',
        cuisine: 'string',
        prepTime: 'number',
        difficulty: 'enum(easy,medium,hard)',
        ingredients: 'Ingredient[]',
        steps: 'string[]',
        photo: 'string?',
        favorited: 'boolean',
        createdAt: 'datetime',
      }} />
      <Schema name="Ingredient" fields={{
        name: 'string',
        amount: 'number',
        unit: 'string',
      }} />
      <Endpoint resource="recipes" pattern="crud" auth />
    </Data>
  </App>
)
