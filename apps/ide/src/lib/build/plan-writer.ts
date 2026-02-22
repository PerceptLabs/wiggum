/**
 * Plan TSX writer — serializes theme config into plan.tsx
 *
 * Counterpart to plan-parser.ts (read side).
 * Used by the theme command to write <Theme> blocks to .ralph/plan.tsx.
 */

// ============================================================================
// THEME JSX SERIALIZER
// ============================================================================

export interface ThemeJsxProps {
  mood?: string
  seed?: number
  pattern?: string
  font?: string
  monoFont?: string
  shadowProfile?: string
  radius?: string
  philosophy?: string
}

/**
 * Serialize theme config into a `<Theme ... />` JSX string.
 * Only includes non-undefined/non-empty props.
 */
export function serializeThemeJsx(props: ThemeJsxProps): string {
  const attrs: string[] = []

  // String props — order matches ThemeProps interface
  const stringKeys: (keyof ThemeJsxProps)[] = [
    'mood', 'pattern', 'font', 'monoFont', 'shadowProfile', 'radius', 'philosophy',
  ]
  for (const key of stringKeys) {
    const val = props[key]
    if (val !== undefined && val !== '' && typeof val === 'string') {
      attrs.push(`${key}="${val}"`)
    }
  }

  // Numeric props
  if (props.seed !== undefined) {
    attrs.push(`seed={${props.seed}}`)
  }

  if (attrs.length === 0) return '<Theme />'

  // Multi-line for readability when 3+ props
  if (attrs.length >= 3) {
    const indent = '      '
    return `<Theme\n${indent}${attrs.join('\n' + indent)}\n    />`
  }

  return `<Theme ${attrs.join(' ')} />`
}

// ============================================================================
// PLAN SKELETON
// ============================================================================

/**
 * Create a skeleton plan.tsx with just App + Theme.
 * Used when no plan.tsx exists yet.
 */
export function createPlanSkeleton(themeJsx: string): string {
  return `import { App, Theme } from '@wiggum/planning'

export default (
  <App name="Untitled" description="(describe your project)">
    ${themeJsx}
  </App>
)
`
}

// ============================================================================
// THEME BLOCK REPLACER
// ============================================================================

/**
 * Replace the <Theme> block in existing plan.tsx content.
 *
 * - Self-closing `<Theme ... />` → replace entire tag with new themeJsx
 * - Open `<Theme ...>...</Theme>` → replace only opening tag props, preserve children
 *
 * Returns null if no `<Theme` found.
 */
export function replaceThemeBlock(existingContent: string, themeJsx: string): string | null {
  // Strategy 1: self-closing <Theme ... />
  // Match <Theme followed by anything (including newlines) up to />
  const selfClosingRe = /<Theme\b[^>]*\/>/s
  if (selfClosingRe.test(existingContent)) {
    return existingContent.replace(selfClosingRe, themeJsx)
  }

  // Strategy 2: open <Theme ...> with children </Theme>
  // Replace only the opening tag, preserve everything between > and </Theme>
  const openTagRe = /<Theme\b[^>]*>/
  if (openTagRe.test(existingContent)) {
    // Extract props portion from new themeJsx (everything between <Theme and />)
    const propsMatch = themeJsx.match(/<Theme\b([^/]*)\/>/)
    if (!propsMatch) return null

    const newProps = propsMatch[1].trim()
    const openTag = newProps ? `<Theme\n      ${newProps}\n    >` : '<Theme>'
    return existingContent.replace(openTagRe, openTag)
  }

  return null
}
