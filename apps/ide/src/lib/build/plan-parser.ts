/**
 * Plan TSX parser — extracts component tree from .ralph/plan.tsx
 *
 * Primary: @babel/parser via esm.sh (real JSX AST)
 * Fallback: regex character scanner (works offline)
 */
import type { PlanNode } from '@wiggum/planning/validate'
import type { SourceJsxNode } from '@wiggum/planning/diff'

// ============================================================================
// PUBLIC API
// ============================================================================

export interface PlanParseResult {
  root: PlanNode | null
  errors: string[]
}

/**
 * Parse a plan.tsx file into a PlanNode tree.
 * Tries @babel/parser first, falls back to regex if unavailable.
 */
export async function parsePlanTsx(content: string): Promise<PlanParseResult> {
  const babelResult = await tryBabelParse(content)
  if (babelResult) return babelResult
  return regexParse(content)
}

// ============================================================================
// BABEL PATH — @babel/parser via esm.sh
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedBabelParse: ((code: string, opts: any) => any) | null = null

async function tryBabelParse(content: string): Promise<PlanParseResult | null> {
  try {
    if (!cachedBabelParse) {
      const mod = await import(/* @vite-ignore */ 'https://esm.sh/@babel/parser@7')
      cachedBabelParse = mod.parse ?? mod.default?.parse
      if (!cachedBabelParse) return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ast: any = cachedBabelParse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    // Find the root JSX element in the default export
    const rootJsx = findRootJsx(ast)
    if (!rootJsx) {
      return { root: null, errors: ['No JSX found in default export'] }
    }

    const root = jsxElementToPlanNode(rootJsx)
    return { root, errors: [] }
  } catch {
    // Babel unavailable or parse error — fall through to regex
    return null
  }
}

/** Walk Babel AST to find the root JSXElement in the default export */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findRootJsx(ast: any): any {
  for (const node of ast.program?.body ?? []) {
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration
      // export default (<JSX />) — ParenthesizedExpression or direct JSXElement
      if (decl.type === 'JSXElement') return decl
      if (decl.type === 'ParenthesizedExpression' && decl.expression?.type === 'JSXElement') {
        return decl.expression
      }
      // export default (\n<JSX />\n) — the parenthesized form
      if (decl.type === 'JSXElement') return decl
      // Sometimes the expression is wrapped in extra parens
      if (decl.extra?.parenthesized && decl.type === 'JSXElement') return decl
    }
  }
  return null
}

/** Convert a Babel JSXElement to a PlanNode */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsxElementToPlanNode(element: any): PlanNode {
  const name = element.openingElement?.name?.name ?? 'Unknown'
  const props = extractPropsFromAttributes(element.openingElement?.attributes ?? [])
  const children: PlanNode[] = []

  for (const child of element.children ?? []) {
    if (child.type === 'JSXElement') {
      children.push(jsxElementToPlanNode(child))
    }
  }

  return {
    component: name,
    props,
    children,
    line: element.loc?.start?.line ?? 0,
  }
}

/** Extract props from Babel JSXAttribute nodes */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPropsFromAttributes(attrs: any[]): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {}
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue
    const key = attr.name?.name
    if (!key) continue

    if (!attr.value) {
      // Boolean prop: <Component required />
      props[key] = true
    } else if (attr.value.type === 'StringLiteral') {
      props[key] = attr.value.value
    } else if (attr.value.type === 'JSXExpressionContainer') {
      const expr = attr.value.expression
      if (expr.type === 'NumericLiteral') {
        props[key] = expr.value
      }
      // Array/object expressions are not needed for validation — skip
    }
  }
  return props
}

// ============================================================================
// SOURCE TSX PARSER — full-file JSX walker for plan diffing
// ============================================================================

/**
 * Parse a source .tsx file and extract all JSX trees as SourceJsxNode arrays.
 * Unlike parsePlanTsx (which only looks at export default), this walks the
 * full AST body — function returns, variable declarations, etc.
 *
 * Returns [] if babel is unavailable or the file can't be parsed.
 */
export async function parseSourceTsx(content: string): Promise<SourceJsxNode[]> {
  if (!cachedBabelParse) {
    try {
      const mod = await import(/* @vite-ignore */ 'https://esm.sh/@babel/parser@7')
      cachedBabelParse = mod.parse ?? mod.default?.parse
    } catch { return [] }
  }
  if (!cachedBabelParse) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ast: any = cachedBabelParse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    const nodes: SourceJsxNode[] = []
    walkAstForJsx(ast.program, nodes)
    return nodes
  } catch {
    return []
  }
}

/** Recursively walk Babel AST to find ALL JSXElement nodes and convert them */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkAstForJsx(node: any, out: SourceJsxNode[]): void {
  if (!node || typeof node !== 'object') return
  if (node.type === 'JSXElement') {
    out.push(jsxToSourceNode(node))
    return // Don't double-walk children — jsxToSourceNode recurses
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue
    const val = node[key]
    if (Array.isArray(val)) {
      for (const item of val) walkAstForJsx(item, out)
    } else if (val && typeof val === 'object' && val.type) {
      walkAstForJsx(val, out)
    }
  }
}

/** Convert Babel JSXElement to SourceJsxNode (reuses extractPropsFromAttributes) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsxToSourceNode(element: any): SourceJsxNode {
  const name = element.openingElement?.name?.name ?? 'unknown'
  const props = extractPropsFromAttributes(element.openingElement?.attributes ?? [])
  const children: SourceJsxNode[] = []
  for (const child of element.children ?? []) {
    if (child.type === 'JSXElement') children.push(jsxToSourceNode(child))
  }
  return { name, props, children }
}

// ============================================================================
// REGEX PATH — character scanner fallback
// ============================================================================

interface TagEvent {
  type: 'open' | 'close' | 'self-close'
  name: string
  propsStr: string
  line: number
}

function regexParse(content: string): PlanParseResult {
  const jsxBody = stripWrapper(content)
  if (!jsxBody) {
    return { root: null, errors: ['Could not find JSX body — missing export default'] }
  }

  const cleaned = stripComments(jsxBody)
  const events = scanTags(cleaned)

  if (events.length === 0) {
    return { root: null, errors: ['No JSX components found'] }
  }

  return buildTree(events)
}

/** Strip imports and export default wrapper, return just the JSX body */
function stripWrapper(content: string): string | null {
  // Remove import lines
  const noImports = content.replace(/^import\s+.*$/gm, '')

  // Find export default ( ... ) — the JSX is inside the parens
  const exportMatch = noImports.match(/export\s+default\s*\(\s*([\s\S]*)\s*\)\s*$/)
  if (exportMatch) return exportMatch[1].trim()

  // Try without parens: export default <App>...</App>
  const directMatch = noImports.match(/export\s+default\s+(<[\s\S]*>)\s*$/)
  if (directMatch) return directMatch[1].trim()

  return null
}

/** Remove JSX comments: {/* ... *\/} */
function stripComments(jsx: string): string {
  return jsx.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

/** Scan source character by character to find tags with brace-depth tracking */
function scanTags(source: string): TagEvent[] {
  const events: TagEvent[] = []
  let i = 0
  let line = 1

  while (i < source.length) {
    // Track line numbers
    if (source[i] === '\n') { line++; i++; continue }

    if (source[i] !== '<') { i++; continue }

    // Closing tag: </Name>
    if (source[i + 1] === '/') {
      const endAngle = source.indexOf('>', i + 2)
      if (endAngle === -1) break
      const name = source.slice(i + 2, endAngle).trim()
      if (name && /^[A-Z]/.test(name)) {
        events.push({ type: 'close', name, propsStr: '', line })
      }
      i = endAngle + 1
      continue
    }

    // Opening or self-closing tag
    const nameEnd = source.slice(i + 1).search(/[\s/>]/)
    if (nameEnd === -1) break
    const name = source.slice(i + 1, i + 1 + nameEnd)

    // Only process capitalized component names
    if (!name || !/^[A-Z]/.test(name)) { i++; continue }

    // Find end of tag, respecting brace nesting
    let j = i + 1 + nameEnd
    let braceDepth = 0
    while (j < source.length) {
      if (source[j] === '{') braceDepth++
      else if (source[j] === '}') braceDepth--
      else if (source[j] === '>' && braceDepth === 0) break
      j++
    }
    if (j >= source.length) break

    const tagContent = source.slice(i + 1 + nameEnd, j)
    const selfClosing = tagContent.trimEnd().endsWith('/')
    const propsStr = selfClosing
      ? tagContent.slice(0, tagContent.lastIndexOf('/')).trim()
      : tagContent.trim()

    events.push({
      type: selfClosing ? 'self-close' : 'open',
      name,
      propsStr,
      line,
    })

    i = j + 1
  }

  return events
}

/** Extract props from a tag's attribute string */
function extractProps(attrString: string): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {}
  if (!attrString.trim()) return props

  // String props: name="value"
  for (const m of attrString.matchAll(/(\w+)="([^"]*)"/g)) {
    props[m[1]] = m[2]
  }

  // Number props: name={123}
  for (const m of attrString.matchAll(/(\w+)=\{(\d+(?:\.\d+)?)\}/g)) {
    props[m[1]] = Number(m[2])
  }

  // Boolean props: bare identifiers not already captured
  // Match word characters followed by whitespace, / or end of string,
  // but not followed by = (which would mean it's a key=value prop)
  for (const m of attrString.matchAll(/\b(\w+)(?=\s|\/|$)(?!=)/g)) {
    if (!(m[1] in props)) {
      props[m[1]] = true
    }
  }

  return props
}

/** Build a PlanNode tree from tag events using a stack */
function buildTree(events: TagEvent[]): PlanParseResult {
  const errors: string[] = []
  const stack: PlanNode[] = []
  let root: PlanNode | null = null

  for (const event of events) {
    if (event.type === 'open') {
      const node: PlanNode = {
        component: event.name,
        props: extractProps(event.propsStr),
        children: [],
        line: event.line,
      }
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node)
      }
      stack.push(node)
      if (!root) root = node
    } else if (event.type === 'self-close') {
      const node: PlanNode = {
        component: event.name,
        props: extractProps(event.propsStr),
        children: [],
        line: event.line,
      }
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node)
      } else if (!root) {
        root = node
      }
    } else if (event.type === 'close') {
      if (stack.length === 0) {
        errors.push(`Unexpected closing tag </${event.name}> at line ${event.line}`)
      } else if (stack[stack.length - 1].component !== event.name) {
        errors.push(
          `Mismatched closing tag: expected </${stack[stack.length - 1].component}>, found </${event.name}> at line ${event.line}`
        )
      } else {
        stack.pop()
      }
    }
  }

  if (stack.length > 1) {
    errors.push(`Unclosed tags: ${stack.map(n => `<${n.component}>`).join(', ')}`)
  }

  return { root, errors }
}
