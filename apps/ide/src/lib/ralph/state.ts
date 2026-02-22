/**
 * Ralph state management - Files as memory (.ralph/ directory)
 */
import * as path from 'path-browserify'
import type { JSRuntimeFS } from '../fs/types'
import { getSkillsRaw } from './skills'

export const RALPH_DIR = '.ralph'

// ============================================================================
// PROJECT SCAFFOLD - React project structure created on init
// ============================================================================

/**
 * React project scaffold - created on init ONLY if src/ doesn't exist
 */
const PROJECT_SCAFFOLD: Record<string, string> = {
  'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,

  'src/App.tsx': `import { Button } from '@wiggum/stack'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold">Hello Wiggum</h1>
        <p className="text-muted-foreground mt-2">
          Edit src/App.tsx to get started.
        </p>
        <Button className="mt-4">Get Started</Button>
      </main>
    </div>
  )
}
`,

  'src/index.css': `/* Default theme — Ralph replaces this with theme preset --apply */
:root {
  --background: oklch(0.98 0.005 240);
  --foreground: oklch(0.145 0.005 240);
  --primary: oklch(0.205 0.015 265);
  --primary-foreground: oklch(0.985 0.002 240);
  --secondary: oklch(0.965 0.005 240);
  --secondary-foreground: oklch(0.205 0.015 240);
  --muted: oklch(0.965 0.005 240);
  --muted-foreground: oklch(0.556 0.01 240);
  --accent: oklch(0.965 0.005 240);
  --accent-foreground: oklch(0.205 0.015 240);
  --destructive: oklch(0.577 0.245 27);
  --destructive-foreground: oklch(0.985 0.002 0);
  --success: oklch(0.55 0.18 145);
  --success-foreground: oklch(0.985 0.002 145);
  --warning: oklch(0.75 0.16 85);
  --warning-foreground: oklch(0.21 0.01 85);
  --card: oklch(1.0 0 0);
  --card-foreground: oklch(0.145 0.005 240);
  --popover: oklch(1.0 0 0);
  --popover-foreground: oklch(0.145 0.005 240);
  --border: oklch(0.922 0.005 240);
  --input: oklch(0.922 0.005 240);
  --ring: oklch(0.205 0.015 265);
  --radius: 0.5rem;
  --sidebar-background: oklch(0.98 0.005 240);
  --sidebar-foreground: oklch(0.145 0.005 240);
  --sidebar-primary: oklch(0.205 0.015 265);
  --sidebar-primary-foreground: oklch(0.985 0.002 240);
  --sidebar-accent: oklch(0.965 0.005 240);
  --sidebar-accent-foreground: oklch(0.205 0.015 240);
  --sidebar-border: oklch(0.922 0.005 240);
  --sidebar-ring: oklch(0.205 0.015 265);
  --chart-1: oklch(0.646 0.222 16);
  --chart-2: oklch(0.6 0.118 184);
  --chart-3: oklch(0.398 0.07 227);
  --chart-4: oklch(0.828 0.189 84);
  --chart-5: oklch(0.769 0.188 70);
}

.dark {
  --background: oklch(0.145 0.005 240);
  --foreground: oklch(0.985 0.002 240);
  --primary: oklch(0.985 0.002 240);
  --primary-foreground: oklch(0.205 0.015 265);
  --secondary: oklch(0.269 0.005 240);
  --secondary-foreground: oklch(0.985 0.002 240);
  --muted: oklch(0.269 0.005 240);
  --muted-foreground: oklch(0.716 0.01 240);
  --accent: oklch(0.269 0.005 240);
  --accent-foreground: oklch(0.985 0.002 240);
  --destructive: oklch(0.396 0.141 25);
  --destructive-foreground: oklch(0.985 0.002 0);
  --success: oklch(0.45 0.153 145);
  --success-foreground: oklch(0.015 0.002 145);
  --warning: oklch(0.25 0.136 85);
  --warning-foreground: oklch(0.79 0.009 85);
  --card: oklch(0.145 0.005 240);
  --card-foreground: oklch(0.985 0.002 240);
  --popover: oklch(0.145 0.005 240);
  --popover-foreground: oklch(0.985 0.002 240);
  --border: oklch(0.269 0.005 240);
  --input: oklch(0.269 0.005 240);
  --ring: oklch(0.871 0.006 286);
  --sidebar-background: oklch(0.145 0.005 240);
  --sidebar-foreground: oklch(0.985 0.002 240);
  --sidebar-primary: oklch(0.985 0.002 240);
  --sidebar-primary-foreground: oklch(0.205 0.015 265);
  --sidebar-accent: oklch(0.269 0.005 240);
  --sidebar-accent-foreground: oklch(0.985 0.002 240);
  --sidebar-border: oklch(0.269 0.005 240);
  --sidebar-ring: oklch(0.871 0.006 286);
  --chart-1: oklch(0.488 0.243 264);
  --chart-2: oklch(0.696 0.17 162);
  --chart-3: oklch(0.769 0.188 70);
  --chart-4: oklch(0.627 0.265 303);
  --chart-5: oklch(0.645 0.246 16);
}

* {
  box-sizing: border-box;
  border-color: var(--border);
}

body {
  margin: 0;
  background-color: var(--background);
  color: var(--foreground);
}
`,

  'package.json': `{
  "name": "wiggum-project",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@wiggum/stack": "workspace:*",
    "lucide-react": "^0.294.0"
  }
}
`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; border-color: var(--border); }
    body { margin: 0; background-color: var(--background); color: var(--foreground); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>`,
}

/**
 * Initialize React project scaffold
 * - index.html and package.json: always create if missing (independent of src/)
 * - src/ files: only create if src/ doesn't exist
 */
async function initProjectScaffold(fs: JSRuntimeFS, cwd: string): Promise<void> {
  // 1. Always ensure index.html exists (required for build config)
  try {
    await fs.stat(path.join(cwd, 'index.html'))
  } catch {
    await fs.writeFile(path.join(cwd, 'index.html'), PROJECT_SCAFFOLD['index.html'])
  }

  // 2. Always ensure package.json exists
  try {
    await fs.stat(path.join(cwd, 'package.json'))
  } catch {
    await fs.writeFile(path.join(cwd, 'package.json'), PROJECT_SCAFFOLD['package.json'])
  }

  // 3. Only create src/ scaffold if src/ doesn't exist
  try {
    await fs.stat(path.join(cwd, 'src'))
    return // src/ exists, don't overwrite React files
  } catch {
    // src/ doesn't exist, create React scaffold
  }

  // Create directories
  const dirs = ['src', 'src/sections', 'src/components']
  for (const dir of dirs) {
    await fs.mkdir(path.join(cwd, dir), { recursive: true }).catch(() => {})
  }

  // Write only src/ files (index.html and package.json already handled above)
  const srcFiles = ['src/main.tsx', 'src/App.tsx', 'src/index.css']
  for (const filePath of srcFiles) {
    await fs.writeFile(path.join(cwd, filePath), PROJECT_SCAFFOLD[filePath])
  }
}

export interface RalphState {
  task: string
  origin: string
  intent: string
  plan: string
  planTsx: string
  summary: string
  feedback: string
  iteration: number
  status: string
}

const FILES = {
  task: `${RALPH_DIR}/task.md`,
  origin: `${RALPH_DIR}/origin.md`,
  intent: `${RALPH_DIR}/intent.md`,
  plan: `${RALPH_DIR}/plan.md`,
  planTsx: `${RALPH_DIR}/plan.tsx`,
  summary: `${RALPH_DIR}/summary.md`,
  feedback: `${RALPH_DIR}/feedback.md`,
  iteration: `${RALPH_DIR}/iteration.txt`,
  status: `${RALPH_DIR}/status.txt`,
}

async function readFile(fs: JSRuntimeFS, filePath: string, fallback: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return (content as string).trim()
  } catch {
    return fallback
  }
}

/**
 * Initialize .ralph/ directory with task
 */
export async function initRalphDir(fs: JSRuntimeFS, cwd: string, task: string): Promise<void> {
  // 1. Create .ralph/ directory and state files
  const ralphDir = path.join(cwd, RALPH_DIR)
  await fs.mkdir(ralphDir, { recursive: true })

  // 2. Handle origin.md specially - preserves project founding concept
  const originPath = path.join(cwd, FILES.origin)
  let originExists = false
  try {
    await fs.stat(originPath)
    originExists = true
  } catch {
    // File doesn't exist
  }

  if (!originExists) {
    // First run: create origin.md with original prompt
    await fs.writeFile(
      originPath,
      `# Project Origin\n\n## Original Prompt\n${task}\n\n## Refinements\n`
    )
  } else {
    // Subsequent runs: append to refinements section
    const existing = await fs.readFile(originPath, { encoding: 'utf8' }) as string
    await fs.writeFile(originPath, `${existing}- ${task}\n`)
  }

  // 3. Initialize ephemeral state files (reset each loop)
  await fs.writeFile(path.join(cwd, FILES.task), `# Task\n\n${task}\n`)
  // Preserve plan/intent from prior runs (continuation support)
  // Summary is always cleared — it belongs to the previous task
  for (const file of [FILES.intent, FILES.plan]) {
    const filePath = path.join(cwd, file)
    let hasContent = false
    try {
      const existing = await fs.readFile(filePath, { encoding: 'utf8' }) as string
      hasContent = existing.trim().length > 0
    } catch {
      // File doesn't exist yet
    }
    if (!hasContent) {
      await fs.writeFile(filePath, '')
    }
  }
  await fs.writeFile(path.join(cwd, FILES.summary), '')
  await fs.writeFile(path.join(cwd, FILES.feedback), '')
  await fs.writeFile(path.join(cwd, FILES.iteration), '0')
  await fs.writeFile(path.join(cwd, FILES.status), 'running')

  // 4. Scaffold React project structure (only if new)
  await initProjectScaffold(fs, cwd)

  // 5. Write skills to .skills/ directory for cat access
  await initSkillsFiles(fs, cwd)
}

/**
 * Write bundled skills to .skills/ directory
 * Enables `cat .skills/theming.md` and `cat .skills/personalities/minimal.json` to work
 */
async function initSkillsFiles(fs: JSRuntimeFS, cwd: string): Promise<void> {
  const skillsDir = path.join(cwd, '.skills')
  await fs.mkdir(skillsDir, { recursive: true }).catch(() => {})

  for (const skill of getSkillsRaw()) {
    // Personality templates are .json, everything else is .md
    const ext = skill.id.startsWith('personalities/') ? '.json' : '.md'
    const filePath = path.join(skillsDir, `${skill.id}${ext}`)

    // Create parent directory for nested IDs (e.g. personalities/minimal)
    if (skill.id.includes('/')) {
      const parentDir = path.dirname(filePath)
      await fs.mkdir(parentDir, { recursive: true }).catch(() => {})
    }

    await fs.writeFile(filePath, skill.content)
  }
}

/**
 * Read fresh state from .ralph/ files
 */
export async function getRalphState(fs: JSRuntimeFS, cwd: string): Promise<RalphState> {
  return {
    task: await readFile(fs, path.join(cwd, FILES.task), ''),
    origin: await readFile(fs, path.join(cwd, FILES.origin), ''),
    intent: await readFile(fs, path.join(cwd, FILES.intent), ''),
    plan: await readFile(fs, path.join(cwd, FILES.plan), ''),
    planTsx: await readFile(fs, path.join(cwd, FILES.planTsx), ''),
    summary: await readFile(fs, path.join(cwd, FILES.summary), ''),
    feedback: await readFile(fs, path.join(cwd, FILES.feedback), ''),
    iteration: parseInt(await readFile(fs, path.join(cwd, FILES.iteration), '0'), 10),
    status: await readFile(fs, path.join(cwd, FILES.status), 'running'),
  }
}

/**
 * Check if status.txt is "complete"
 */
export async function isComplete(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  const status = await readFile(fs, path.join(cwd, FILES.status), '')
  return status === 'complete'
}

/**
 * Check if status.txt is "waiting"
 */
export async function isWaiting(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  const status = await readFile(fs, path.join(cwd, FILES.status), '')
  return status === 'waiting'
}

/**
 * Update iteration count
 */
export async function setIteration(fs: JSRuntimeFS, cwd: string, iteration: number): Promise<void> {
  await fs.writeFile(path.join(cwd, FILES.iteration), String(iteration))
}


