import type { JSRuntimeFS } from '../fs/types'
import type { BuildResult } from './types'

export type ExportFormat = 'single-html' | 'react-source'

export interface ExportResult {
  success: boolean
  files: Array<{ name: string; content: string; type: string }>
  error?: string
}

/**
 * Export as self-contained single HTML file
 * All CSS and JS inlined - zero external dependencies except Tailwind CDN
 */
export async function exportSingleHTML(
  fs: JSRuntimeFS,
  projectPath: string,
  buildResult: BuildResult
): Promise<ExportResult> {
  if (!buildResult.success || !buildResult.outputFiles?.length) {
    return {
      success: false,
      files: [],
      error: buildResult.errors?.[0]?.message || 'Build failed',
    }
  }

  // Get the bundled JS
  const bundleJS = buildResult.outputFiles.find(
    (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs')
  )

  if (!bundleJS) {
    return {
      success: false,
      files: [],
      error: 'No JavaScript bundle generated',
    }
  }

  // Get CSS if any
  const bundleCSS = buildResult.outputFiles.find((f) => f.path.endsWith('.css'))

  // Try to read project title from package.json
  let title = 'Wiggum App'
  try {
    const pkgJson = await fs.readFile(`${projectPath}/package.json`, { encoding: 'utf8' })
    const pkg = JSON.parse(pkgJson as string)
    if (pkg.name && pkg.name !== 'wiggum-project') {
      title = pkg.name
    }
  } catch {
    // Ignore - use default title
  }

  // Generate self-contained HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 3.9%;
      --primary: 0 0% 9%;
      --primary-foreground: 0 0% 98%;
      --secondary: 0 0% 96.1%;
      --secondary-foreground: 0 0% 9%;
      --muted: 0 0% 96.1%;
      --muted-foreground: 0 0% 45.1%;
      --accent: 0 0% 96.1%;
      --accent-foreground: 0 0% 9%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 98%;
      --border: 0 0% 89.8%;
      --input: 0 0% 89.8%;
      --ring: 0 0% 3.9%;
      --radius: 0.5rem;
    }
    * { border-color: hsl(var(--border)); }
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    ${bundleCSS?.contents || ''}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
${bundleJS.contents}
  </script>
</body>
</html>`

  return {
    success: true,
    files: [{ name: 'index.html', content: html, type: 'text/html' }],
  }
}

/**
 * Trigger browser download
 */
export function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
