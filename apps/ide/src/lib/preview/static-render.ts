import { buildProject, initialize, isInitialized, createModuleCache } from '../build'
import type { JSRuntimeFS } from '../fs/types'

// Module-level cache — shared across calls, survives between renders
let moduleCache: Map<string, string> | undefined

export interface StaticRenderResult {
  html: string
  errors: string[]
}

export async function renderToStaticHTML(
  fs: JSRuntimeFS,
  projectPath: string
): Promise<StaticRenderResult> {
  if (!isInitialized()) await initialize()
  if (!moduleCache) moduleCache = createModuleCache()

  // 1. Write wrapper entry that imports App + renderToStaticMarkup
  const wrapperCode = [
    'import React from "react"',
    'import { renderToStaticMarkup } from "react-dom/server"',
    'import App from "../src/App"',
    'export default function render() {',
    '  return renderToStaticMarkup(React.createElement(App))',
    '}',
  ].join('\n')

  await fs.mkdir(`${projectPath}/.ralph`, { recursive: true })
  await fs.writeFile(`${projectPath}/.ralph/__render__.tsx`, wrapperCode, 'utf8')

  // 2. Build with esbuild — all deps inlined via esmPlugin
  const result = await buildProject(fs, projectPath, {
    entryPoint: '.ralph/__render__.tsx',
    format: 'esm',
    moduleCache,
  })

  if (!result.success || !result.outputFiles?.length) {
    return {
      html: '',
      errors: result.errors?.map((e) => e.message) || ['Static render build failed'],
    }
  }

  // 3. Dynamic import from blob URL
  const jsOutput = result.outputFiles.find(
    (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs')
  )
  if (!jsOutput) return { html: '', errors: ['No JS output from static render build'] }

  const blob = new Blob([jsOutput.contents], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)

  try {
    const mod = await import(/* @vite-ignore */ url)
    const html = mod.default()
    return { html: formatHtml(html), errors: [] }
  } catch (err) {
    return {
      html: '',
      errors: [err instanceof Error ? err.message : String(err)],
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Minimal formatter: add newlines between tags for readability.
 *  Splits ALL adjacent tags including inline elements — intentional,
 *  this is cosmetic for Ralph's readability, not structural parsing. */
function formatHtml(html: string): string {
  return html.replace(/></g, '>\n<')
}

/** Count semantic HTML elements for summary display.
 *  Shared utility — used by preview command and quality gates. */
export function countHtmlElements(html: string): string {
  const patterns: [RegExp, string][] = [
    [/<(section|header|footer|nav|main|article|aside)\b/gi, 'sections'],
    [/<button\b/gi, 'buttons'],
    [/<form\b/gi, 'forms'],
    [/<input\b/gi, 'inputs'],
    [/<h[1-3]\b/gi, 'headings'],
    [/<img\b/gi, 'images'],
  ]
  const counts: string[] = []
  for (const [regex, label] of patterns) {
    const matches = html.match(regex)
    if (matches && matches.length > 0) {
      counts.push(`${matches.length} ${label}`)
    }
  }
  return counts.join(', ') || 'basic structure'
}
