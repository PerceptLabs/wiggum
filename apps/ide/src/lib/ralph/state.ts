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
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 3.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 3.9%);
  --primary: hsl(210 100% 50%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(0 0% 96.1%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --accent: hsl(0 0% 96.1%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 89.8%);
  --input: hsl(0 0% 89.8%);
  --ring: hsl(210 100% 50%);
  --radius: 0.5rem;
  --sidebar-background: hsl(0 0% 98%);
  --sidebar-foreground: hsl(0 0% 3.9%);
  --sidebar-primary: hsl(210 100% 50%);
  --sidebar-primary-foreground: hsl(0 0% 100%);
  --sidebar-accent: hsl(0 0% 96.1%);
  --sidebar-accent-foreground: hsl(0 0% 9%);
  --sidebar-border: hsl(0 0% 89.8%);
  --sidebar-ring: hsl(210 100% 50%);
  --chart-1: hsl(210 100% 50%);
  --chart-2: hsl(160 60% 45%);
  --chart-3: hsl(30 80% 55%);
  --chart-4: hsl(280 65% 60%);
  --chart-5: hsl(340 75% 55%);
}

.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  --card: hsl(0 0% 7%);
  --card-foreground: hsl(0 0% 98%);
  --popover: hsl(0 0% 7%);
  --popover-foreground: hsl(0 0% 98%);
  --primary: hsl(210 100% 60%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(0 0% 14.9%);
  --secondary-foreground: hsl(0 0% 98%);
  --muted: hsl(0 0% 14.9%);
  --muted-foreground: hsl(0 0% 63.9%);
  --accent: hsl(0 0% 14.9%);
  --accent-foreground: hsl(0 0% 98%);
  --destructive: hsl(0 62.8% 50.6%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 14.9%);
  --input: hsl(0 0% 14.9%);
  --ring: hsl(210 100% 60%);
  --sidebar-background: hsl(0 0% 5%);
  --sidebar-foreground: hsl(0 0% 98%);
  --sidebar-primary: hsl(210 100% 60%);
  --sidebar-primary-foreground: hsl(0 0% 100%);
  --sidebar-accent: hsl(0 0% 14.9%);
  --sidebar-accent-foreground: hsl(0 0% 98%);
  --sidebar-border: hsl(0 0% 14.9%);
  --sidebar-ring: hsl(210 100% 60%);
  --chart-1: hsl(210 100% 60%);
  --chart-2: hsl(160 60% 55%);
  --chart-3: hsl(30 80% 65%);
  --chart-4: hsl(280 65% 70%);
  --chart-5: hsl(340 75% 65%);
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
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    @theme {
      --color-background: var(--background);
      --color-foreground: var(--foreground);
      --color-card: var(--card);
      --color-card-foreground: var(--card-foreground);
      --color-popover: var(--popover);
      --color-popover-foreground: var(--popover-foreground);
      --color-primary: var(--primary);
      --color-primary-foreground: var(--primary-foreground);
      --color-secondary: var(--secondary);
      --color-secondary-foreground: var(--secondary-foreground);
      --color-muted: var(--muted);
      --color-muted-foreground: var(--muted-foreground);
      --color-accent: var(--accent);
      --color-accent-foreground: var(--accent-foreground);
      --color-destructive: var(--destructive);
      --color-destructive-foreground: var(--destructive-foreground);
      --color-border: var(--border);
      --color-input: var(--input);
      --color-ring: var(--ring);
      --color-sidebar-background: var(--sidebar-background);
      --color-sidebar-foreground: var(--sidebar-foreground);
      --color-sidebar-primary: var(--sidebar-primary);
      --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
      --color-sidebar-accent: var(--sidebar-accent);
      --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
      --color-sidebar-border: var(--sidebar-border);
      --color-sidebar-ring: var(--sidebar-ring);
      --color-chart-1: var(--chart-1);
      --color-chart-2: var(--chart-2);
      --color-chart-3: var(--chart-3);
      --color-chart-4: var(--chart-4);
      --color-chart-5: var(--chart-5);
      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --radius-xl: calc(var(--radius) + 4px);
    }
  </style>
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
  // 1. Always ensure index.html exists (required for Tailwind preview)
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
  // Preserve plan/intent/summary from prior runs (continuation support)
  for (const file of [FILES.intent, FILES.plan, FILES.summary]) {
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
 * Enables `cat .skills/creativity.md` to work
 */
async function initSkillsFiles(fs: JSRuntimeFS, cwd: string): Promise<void> {
  const skillsDir = path.join(cwd, '.skills')
  await fs.mkdir(skillsDir, { recursive: true }).catch(() => {})

  for (const skill of getSkillsRaw()) {
    await fs.writeFile(
      path.join(skillsDir, `${skill.id}.md`),
      skill.content
    )
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


