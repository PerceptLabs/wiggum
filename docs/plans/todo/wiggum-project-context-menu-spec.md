# Wiggum Project Context Menu — Design Specification

> Spec for the project-level dropdown menu, detail modal, rollback system, session management, and Chief-era enhancements. Adapted from Shakespeare's proven patterns, rebuilt for Wiggum's architecture.

---

## TABLE OF CONTENTS

1. [Architecture Context](#1-architecture-context)
2. [The Dropdown Menu](#2-the-dropdown-menu)
3. [Feature Mechanics](#3-feature-mechanics)
   - 3.1 Favorite
   - 3.2 Project Details (Modal)
   - 3.3 Rollback
   - 3.4 New Task
   - 3.5 Duplicate Project
   - 3.6 Export
   - 3.7 Delete Project
4. [Chief-Era Enhancements](#4-chief-era-enhancements)
   - 4.1 Chief Context in Project Details
   - 4.2 Rollback + Session Intelligence
   - 4.3 Plan Management
   - 4.4 Project Handoff
   - 4.5 Build History Timeline
5. [Data Flow Summary](#5-data-flow-summary)
6. [Supporting Patterns](#6-supporting-patterns)
7. [Integration Points](#7-integration-points)
8. [File Change Index](#8-file-change-index)
9. [CC Prompt Strategy](#9-cc-prompt-strategy)

---

## 1. ARCHITECTURE CONTEXT

### How Wiggum Stores Projects

Every project is a real git repository at `/projects/{project-id}/` inside the virtual filesystem (LightningFS today, ZenFS after migration — both behind the `JSRuntimeFS` interface). The `.git/` directory stores version history. Two companion metadata namespaces live inside `.git/` so git ignores them naturally:

```
/projects/{project-id}/
├── src/                          # User's source code (Ralph writes here)
│   ├── App.tsx
│   ├── index.css                 # CSS variables (theme output)
│   └── ...
├── .ralph/                       # Ralph's working state (per-task, reset each loop)
│   ├── origin.md                 # Immutable project concept
│   ├── task.md                   # Current task
│   ├── plan.tsx                  # Plan file (future: planning language)
│   ├── summary.md                # What was built
│   ├── feedback.md               # Gate failure details
│   ├── status.txt                # running | complete | waiting
│   ├── iteration.txt             # Current iteration number
│   ├── reflections.jsonl         # Post-task reflection data
│   └── gaps.jsonl                # Command-not-found tracking
├── .chief/                       # Chief's state (future: when Chief ships)
│   ├── prompt.md                 # Refined prompt sent to Ralph
│   ├── plan.md                   # Chief's planning notes
│   ├── status.txt                # ready | sent
│   └── history.json              # Compressed conversation turns
├── .git/
│   ├── ai/                       # Session metadata (NOT committed)
│   │   ├── MODEL                 # Current model identifier
│   │   ├── COST                  # Accumulated USD cost (float)
│   │   ├── FINISH_REASON         # Last completion reason
│   │   └── history/              # Session archives
│   │       ├── 2026-02-21T15-20-00Z-x7k.jsonl
│   │       └── 2026-02-21T15-25-00Z-a3f.jsonl
│   └── builder/                  # Builder metadata (NOT committed)
│       ├── COST                  # Total accumulated cost across all sessions
│       ├── template.json         # { name, description, gumdrop, domain }
│       ├── labels.json           # ["portfolio", "client-work"]
│       └── snapshots/            # Future: preview screenshots per commit
└── .git/refs/heads/main          # Branch pointer (standard git)
```

### Project Identity

A project's `id` is its directory name — a slug derived from the display name (lowercased, non-alphanumeric replaced with hyphens, trimmed). The display name IS the slug. No separate database or manifest. The project list is derived by reading `/projects/` and stat-ing each entry.

### Key Abstractions Already in Wiggum

These already exist or are planned. The context menu wires into them rather than creating parallel infrastructure:

| Abstraction | Location | Role |
|-------------|----------|------|
| `JSRuntimeFS` | `src/lib/fs/types.ts` | Filesystem interface (all operations go through this) |
| `Git` wrapper | `src/lib/git/Git.ts` | Pre-binds `fs` to every isomorphic-git call |
| `useAIChat` | `src/hooks/useAIChat.ts` | Ralph session management (messages, streaming, abort, cost) |
| `useChiefChat` | `src/hooks/useChiefChat.ts` (future) | Chief conversation management |
| `Coordinator` | `src/lib/coordinator/` (future) | Chief ↔ Ralph communication |
| Shell commands | `src/lib/shell/commands/` | 38+ commands operating on the virtual filesystem |
| Skills search | `src/lib/skills/` | Orama-indexed skill lookup |
| Theme generator | `src/lib/theme-generator/` | OKLCH math, presets, CSS variable output |

### What Doesn't Exist Yet

The context menu spec introduces these new pieces:

| New Piece | Purpose |
|-----------|---------|
| `ProjectsManager` | CRUD class for project lifecycle (create, list, rename, duplicate, delete, export) |
| `DotBuilder` | Utility for `.git/builder/` metadata reads/writes |
| Project Details modal | UI for project metadata, rename, labels, export, delete |
| Rollback dialog | Commit history viewer with revert capability |
| Sidebar project list | Filterable, sortable project browser with favorites |

---

## 2. THE DROPDOWN MENU

### Trigger

The dropdown attaches to the project name in the header/toolbar of the active project view. Renders as: **project name + chevron-down icon**. Clicking opens a menu positioned below the trigger.

### Menu Structure (Pre-Chief)

```
┌─────────────────────────────┐
│ ☆  Favorite                 │
│ ℹ  Project Details          │
│ ↺  Rollback                 │
│ ✦  New Task                 │
│ ─────────────────────────── │
│ 🔀 Duplicate Project        │
│ 📦 Export                   │
│ ─────────────────────────── │
│ 🗑  Delete Project           │
└─────────────────────────────┘
```

### Menu Structure (Post-Chief)

When Chief ships, the menu gains additional items:

```
┌─────────────────────────────┐
│ ☆  Favorite                 │
│ ℹ  Project Details          │
│ ↺  Rollback                 │
│ ✦  New Task                 │
│ 📋 View Plan                │  ← NEW: opens .ralph/plan.tsx or .chief/plan.md
│ 📊 Build History            │  ← NEW: timeline of all builds + sessions
│ ─────────────────────────── │
│ 🔀 Duplicate Project        │
│ 📦 Export                   │
│ 🔗 Share Plan with Chief    │  ← NEW: sends current state to Chief for review
│ ─────────────────────────── │
│ 🗑  Delete Project           │
└─────────────────────────────┘
```

### Accessibility

Each item uses `role="menuitem"` inside a `role="menu"` container. Standard accessible dropdown: focus management, Escape to close, arrow keys to navigate, Enter/Space to activate. Built with `@wiggum/stack` `DropdownMenu` component (Radix primitive underneath).

---

## 3. FEATURE MECHANICS

### 3.1 Favorite

**What it does:** Toggles a "favorite" flag on the project. Favorited projects sort to the top of the sidebar project list with a star indicator.

**Storage:** `localStorage` — not in the git repo, since it's a UI preference, not project data.

```typescript
// Key: "wiggum.favorites"
// Value: JSON array of project IDs
localStorage["wiggum.favorites"] = '["lullleaf", "neon-surge"]'
```

**Mechanics:**
1. Read the favorites set from localStorage
2. Add/remove the current project ID
3. Write it back
4. Sidebar re-renders: favorites first (sorted by last-modified), then non-favorites (sorted by last-modified)

**Menu item:** Text toggles between "Favorite" and "Unfavorite". Icon toggles between outlined star and filled star.

---

### 3.2 Project Details (Modal)

**What it does:** Opens a dialog showing project metadata with in-place editing and access to labels, export, and delete. This is where Wiggum diverges significantly from Shakespeare — the modal surfaces project intelligence, not just filesystem stats.

**Modal Layout:**

```
┌─────────────────────────────────────────────┐
│  📁 lullleaf                            ✕   │
│                                             │
│  📅 Last Modified: 2 hours ago              │
│  💰 Total Cost: $0.42                       │
│  🎨 Mood: Warm Botanical                    │
│                                             │
│  ┌─ Theme Tokens ──────────────────────┐    │
│  │  ● primary   ● secondary   ● accent │    │
│  │  ● background ● foreground ● muted  │    │
│  │  Font: Cormorant Garamond + Nunito  │    │
│  │  Radius: rounded · Shadow: subtle   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ Stack Usage ───────────────────────┐    │
│  │  Button, Card, Dialog, Tabs, Input, │    │
│  │  Badge, Sheet, Separator, Carousel  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ Origin ────────────────────────────┐    │
│  │  Gumdrop: hero + pricing + features │    │
│  │  Domain: marketing                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Project Name                               │
│  ┌──────────────────────────────┐ [save]    │
│  │ lullleaf                     │           │
│  └──────────────────────────────┘           │
│                                             │
│  ○ Add label                                │
│                                             │
│  ┌──────────── Export Project ────────────┐  │
│  └───────────────────────────────────────┘  │
│  ┌──────────── Delete Project ────────────┐  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Data sources — all read from the filesystem on open:**

| Field | Source | How to Read |
|-------|--------|-------------|
| Project name | Directory slug | `projectPath.split('/').pop()` |
| Last modified | `fs.stat(projectPath).mtimeMs` | Display as relative time ("2 hours ago") |
| Total cost | `.git/builder/COST` | Single float (accumulated USD), format as currency |
| Mood / theme name | Parse `src/index.css` for `/* mood: xyz */` comment, or read `.ralph/plan.tsx` `<Theme mood="...">` | Display mood name as label |
| Design tokens | Parse `src/index.css` `:root` block | Extract `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--muted`. Render as OKLCH color swatches. Also extract `--radius`, `--font-sans`, `--font-heading` for personality display |
| Stack usage | Scan `src/**/*.tsx` for `@wiggum/stack` imports | Collect component names (Button, Card, Dialog, etc.), deduplicate, display as tag list |
| Origin | `.git/builder/template.json` | Contains `{ name, description, gumdrop?, domain? }`. If gumdrop field exists, show gumdrop name + domain. If only template name, show that |
| Labels | `.git/builder/labels.json` | Array of strings. Allow adding/removing from a managed vocabulary |

**Rename mechanics:**
1. User edits the name field and clicks save
2. Validate: lowercase, alphanumeric + hyphens only, no collision with existing project IDs
3. Call `ProjectsManager.renameProject(oldId, newId)` which does `fs.rename(oldPath, newPath)`
4. Update URL/route to reflect new ID
5. Update favorites in localStorage if the old ID was favorited

**Labels:**
Tags assigned to the project. Stored in `.git/builder/labels.json` (array of strings). A "Manage Labels" feature (accessible from the New Project dropdown) lets users define the global label vocabulary — stored in `localStorage["wiggum.labels"]`.

**Design token rendering:**
Parse the CSS variables from `src/index.css`. For color tokens, extract the `oklch(L C H)` values and render as small color chips. For non-color tokens (font, radius, shadow), show human-readable names by matching against the theme generator's registries.

```typescript
// Pseudo-code for token extraction
const cssContent = await fs.readFile(`${projectPath}/src/index.css`, { encoding: 'utf8' })
const rootBlock = extractRootBlock(cssContent)  // regex for :root { ... }
const tokens = parseCssVariables(rootBlock)      // { '--primary': 'oklch(0.65 0.15 150)', ... }
```

**Stack usage scanning:**

```typescript
// Walk src/ files, find import statements matching @wiggum/stack
const files = await walkDir(fs, `${projectPath}/src`)
const tsxFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
const components = new Set<string>()

for (const file of tsxFiles) {
  const content = await fs.readFile(file, { encoding: 'utf8' })
  // Match: import { Button, Card } from '../components/ui/button'
  // Match: import { Button } from '@wiggum/stack' (if using package imports)
  const importMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*(?:components\/ui|@wiggum\/stack)[^'"]*['"]/g)
  for (const match of importMatches) {
    match[1].split(',').map(s => s.trim()).filter(Boolean).forEach(c => components.add(c))
  }
}
```

---

### 3.3 Rollback

**What it does:** Shows a commit history timeline and lets the user revert the project's working directory to any previous commit. This is the most mechanically complex feature — and the highest-value one.

**Why Wiggum is perfectly positioned:** Every time Ralph completes a task and quality gates pass, the loop creates a git commit with a detailed message describing what changed, what was built, and design decisions made. That commit history IS the rollback timeline.

**Reading the commit log:**

```typescript
const commits = await git.log({ dir: projectPath })
// Returns array of: { oid, commit: { message, author: { name, timestamp } } }
```

Display as an ordered list, newest first. The newest commit gets a "Current" badge. All older commits get a "Rollback" button.

**Dialog layout:**

```
┌────────────────────────────────────────────────────┐
│  ↺ Rollback                                    ✕   │
│  Revert to an older commit                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Create Lullleaf cozy lo-fi tea brand   ▾     │  │
│  │ website                          [Current]   │  │
│  │                                              │  │
│  │  (expanded: full commit message body)        │  │
│  │  - Added 12 artisan drink products           │  │
│  │  - Beautiful hero section with floating...   │  │
│  │  - Product cards with hover effects...       │  │
│  │                                              │  │
│  │  shakespeare.diy · committed 1 hour ago      │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ New project created with Wiggum  ▾           │  │
│  │                             [Rollback]       │  │
│  │                                              │  │
│  │  wiggum.diy · committed 1 hour ago           │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Expandable commit details:** Each commit row has a chevron that expands to show the full commit message body. Ralph's commit messages are detailed multi-line descriptions (file list, features added, design decisions), so this expanded view serves as the changelog.

**Performing the rollback:**

Wiggum uses the **linear history approach** — simpler and safer than branch pointer manipulation in a browser context where users won't understand detached HEAD states:

1. **Stop active generation** — If Ralph is running, abort the session via `useAIChat`'s abort controller
2. **Force checkout** — `git.checkout({ dir: projectPath, ref: targetOid, force: true })`. The `force: true` overwrites any working directory changes
3. **Create a rollback commit** — Immediately commit the current state with message: `"Rolled back to: {original commit message first line}"`. This keeps history linear and creates a clear audit trail
4. **Reset branch pointer** — `git.writeRef({ dir: projectPath, ref: 'refs/heads/main', value: newCommitOid, force: true })` then `git.checkout({ dir: projectPath, ref: 'main', force: true })` to get off detached HEAD
5. **Start new session** — Clear Ralph's `.ralph/` state files (keep `origin.md`). Clear the active session messages. Generate a new session name. Reset cost counter for the new session. The old session history persists in `.git/ai/history/{old-session}.jsonl`
6. **Trigger rebuild** — Force a preview rebuild of the rolled-back code
7. **Close dialog**

**Edge cases:**
- Project has uncommitted changes → `force: true` discards them (desired behavior — the user is explicitly choosing to roll back)
- Only one commit exists → No rollback possible, show disabled state
- Ralph is mid-iteration → Must abort before checkout or git will conflict

---

### 3.4 New Task

**What it does:** Clears the current AI session while keeping all project files intact. Starts a fresh task context. Named "New Task" instead of "New Chat" because Ralph operates in task-oriented sessions, not open-ended conversations.

**Mechanics:**

1. **Stop active generation** — Abort any in-progress Ralph loop or Chief conversation
2. **Archive current session** — The current session's JSONL file (`.git/ai/history/{session-name}.jsonl`) is already on disk. It stays there as a historical record
3. **Clear session state:**
   - `messages = []`
   - `streamingMessage = null`
   - Generate new `sessionName` (timestamp-based: `2026-02-21T15-25-00Z-a3f`)
   - `totalCost = 0` (session cost resets; project-level cost in `.git/builder/COST` does NOT reset)
   - `lastInputTokens = 0`
   - `lastFinishReason = null`
   - Emit events to update UI (cost display resets, context usage resets)
4. **Clear Ralph's working state:**
   - Delete `.ralph/task.md`
   - Delete `.ralph/plan.tsx` (or plan.md)
   - Delete `.ralph/summary.md`
   - Delete `.ralph/feedback.md`
   - Reset `.ralph/status.txt` to empty or delete it
   - Reset `.ralph/iteration.txt` to "0"
   - Keep `.ralph/origin.md` — it's the project concept, not the task
   - Keep `.ralph/reflections.jsonl` and `.ralph/gaps.jsonl` — historical data
5. **Project files are untouched.** The git working directory stays exactly as-is. The user can now start a new conversation with full context of the existing codebase.

**Session history format:**

```
.git/ai/history/
  2026-02-21T15-20-00Z-x7k.jsonl   ← old session (archived)
  2026-02-21T15-25-00Z-a3f.jsonl   ← new session (empty until first message)
```

Each `.jsonl` file has one JSON object per line — OpenAI-format chat messages (`{ role, content, tool_calls?, tool_call_id? }`). On session load, the system reads the most recent `.jsonl` file (sorted alphabetically — works because names are ISO timestamps). This is how sessions survive page reloads.

---

### 3.5 Duplicate Project

**What it does:** Creates a complete copy of the project with a new ID, including full git history.

**Mechanics:**

1. **Generate new project ID** — Take source ID, append `-copy`. If `lullleaf-copy` exists, try `lullleaf-copy-1`, `lullleaf-copy-2`, etc.
2. **Deep copy the entire directory** — Recursively walk the source project path and copy every file and directory to the new path. Include `.git/` — the duplicate starts with the same commit history and can diverge. Include `.ralph/` — the duplicate inherits the project concept and last task state. Include `.git/builder/` and `.git/ai/` — metadata carries over.
3. **Reset session** — In the duplicate, start a fresh session (new session name in `.git/ai/history/`). The cost in `.git/builder/COST` carries over (it represents total project investment, which includes the duplicated work).
4. **Navigate** — Route to the new project in the UI.
5. **Request persistent storage** — `navigator.storage.persist()` to protect IndexedDB from eviction.

**Implementation note:** This is a filesystem-level deep copy, NOT a `git clone`. Raw file copy is faster and preserves everything including `.git/` internals, `.ralph/` state, and `.git/builder/` metadata.

```typescript
// Recursive copy via JSRuntimeFS
async function deepCopy(fs: JSRuntimeFS, src: string, dest: string): Promise<void> {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src)
    for (const entry of entries) {
      await deepCopy(fs, `${src}/${entry}`, `${dest}/${entry}`)
    }
  } else {
    const content = await fs.readFile(src)
    await fs.writeFile(dest, content)
  }
}
```

---

### 3.6 Export

**What it does:** Downloads the project as a zip file. Pulled out of the details modal into a top-level menu item for discoverability — export is a primary action, not a detail.

**Mechanics:**

1. **Walk the project tree** — Recursively read all files in the project directory, excluding `.git/`, `.ralph/`, and `.chief/` (metadata stays local, source code exports)
2. **Build zip** — Use JSZip to construct the archive

```typescript
import JSZip from 'jszip'

async function exportProject(fs: JSRuntimeFS, projectPath: string, projectId: string): Promise<void> {
  const zip = new JSZip()
  const excludeDirs = ['.git', '.ralph', '.chief']

  async function addToZip(dirPath: string, zipFolder: JSZip): Promise<void> {
    const entries = await fs.readdir(dirPath)
    for (const entry of entries) {
      if (excludeDirs.includes(entry) && dirPath === projectPath) continue
      const fullPath = `${dirPath}/${entry}`
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        await addToZip(fullPath, zipFolder.folder(entry)!)
      } else {
        const content = await fs.readFile(fullPath)
        zipFolder.file(entry, content)
      }
    }
  }

  await addToZip(projectPath, zip)
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectId}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
```

**Future enhancement (post-Hono):** "Export as standalone" — run the esbuild pipeline and bundle everything into a single deployable HTML file with inlined CSS and JS. The build infrastructure already exists; this just packages the output differently.

---

### 3.7 Delete Project

**What it does:** Permanently removes the project. Destructive action with confirmation.

**Confirmation flow:**

```
┌──────────────────────────────────────────┐
│  Delete "lullleaf"?                      │
│                                          │
│  This will permanently delete all files, │
│  history, and session data. This action  │
│  cannot be undone.                       │
│                                          │
│  Type "lullleaf" to confirm:             │
│  ┌──────────────────────────────┐        │
│  │                              │        │
│  └──────────────────────────────┘        │
│                                          │
│  [Cancel]              [Delete Project]  │
│                         (danger styled)  │
└──────────────────────────────────────────┘
```

Require the user to type the project name. This prevents accidental deletion and matches destructive action patterns users expect from tools like GitHub.

**Mechanics:**

1. **Stop active session** — Abort any in-progress Ralph loop or Chief conversation. Tear down session state.
2. **Recursively delete** — Walk the project tree depth-first: unlink all files, then rmdir all directories, bottom-up. LightningFS/ZenFS don't have `rm -rf`, so implement recursive deletion:

```typescript
async function recursiveDelete(fs: JSRuntimeFS, path: string): Promise<void> {
  const stat = await fs.stat(path)
  if (stat.isDirectory()) {
    const entries = await fs.readdir(path)
    for (const entry of entries) {
      await recursiveDelete(fs, `${path}/${entry}`)
    }
    await fs.rmdir(path)
  } else {
    await fs.unlink(path)
  }
}
```

3. **Remove from favorites** — Update localStorage if the project was favorited
4. **Navigate away** — Redirect to the next project in the list, or to the home/empty state if no projects remain

---

## 4. CHIEF-ERA ENHANCEMENTS

When Chief ships (per the chief-implementation-plan), the context menu gains intelligence. Chief can read project state, suggest iterations, and coordinate with Ralph. The context menu becomes the bridge between manual project management and AI-assisted workflows.

### 4.1 Chief Context in Project Details

The modal gains a **"Chief's Notes"** section when `.chief/plan.md` exists:

```
┌─ Chief's Notes ─────────────────────────┐
│  Last plan: "Wellness tea brand with    │
│  3 product categories, hero section     │
│  with floating animations..."           │
│                                         │
│  Status: Plan sent to Ralph ✓           │
│  Sessions: 3 conversations              │
│                                         │
│  [Open in Chief]  [Clear Plan]          │
└─────────────────────────────────────────┘
```

**Data sources:**
- Plan content: `.chief/plan.md` (truncated preview)
- Status: `.chief/status.txt` ("ready" or "sent")
- Session count: count files in `.chief/` matching conversation patterns
- "Open in Chief" navigates to the Chief tab with the current project loaded
- "Clear Plan" deletes `.chief/plan.md` and resets `.chief/status.txt`

### 4.2 Rollback + Session Intelligence

Post-Chief, the rollback dialog gains session awareness. Each commit knows which session produced it, so rollback can offer:

**"Rollback and re-plan"** — Rolls back to the commit, then switches to the Chief tab with context: "The project was rolled back to [state]. Here's what was changed since then: [diff summary]. What would you like to do differently?"

This turns rollback from a destructive "undo" into a productive "let's try a different approach" workflow.

**Implementation:** When creating commits, include session metadata in the commit message trailer:

```
Create Lullleaf cozy lo-fi tea brand website

- Added 12 artisan drink products across 3 categories
- Beautiful hero section with floating animations
...

Session: 2026-02-21T15-20-00Z-x7k
Mood: warm-botanical
Cost: $0.18
```

The rollback dialog parses these trailers to show session-level grouping and cost attribution.

### 4.3 Plan Management

The **"View Plan"** menu item opens the current plan in a read-only viewer:

- If `.ralph/plan.tsx` exists (planning language): render with syntax highlighting, show which sections have been implemented vs. pending
- If `.chief/plan.md` exists: render as formatted markdown
- If neither exists: show empty state with "Start planning with Chief" CTA

**Plan diffing (post-implementation):** When a plan exists AND Ralph has completed work, show a visual diff of what was planned vs. what was built. This uses the `plan-diff` quality gate output from `.ralph/plan-diff.md` (if it exists).

### 4.4 Project Handoff

The **"Share Plan with Chief"** menu item sends the current project state to Chief for review. This is different from starting a new Chief conversation — it pre-loads context:

1. Read `.ralph/summary.md` (what Ralph built)
2. Read `.ralph/plan.tsx` or `.chief/plan.md` (what was planned)
3. Scan `src/` for a component inventory
4. Switch to the Chief tab
5. Inject a system-level context message: "The user wants to review the current build. Here's the project state: [summary]. Here's what was planned: [plan]. Components in use: [list]."
6. Chief can then discuss changes, suggest iterations, or send a refined prompt back to Ralph

This enables the iterate loop described in the Chief plan:
```
User → Chief → Ralph → Review → Chief → Ralph → Review → Done
```

### 4.5 Build History Timeline

The **"Build History"** menu item opens a more comprehensive view than Rollback — it shows the full timeline of ALL activity on the project:

```
┌──────────────────────────────────────────────────┐
│  📊 Build History                            ✕   │
│                                                  │
│  Session 3 — Feb 21, 2:15 PM                     │
│  ┌────────────────────────────────────────────┐  │
│  │ ✦ Chief: Refined hero section prompt       │  │
│  │ ⚡ Ralph: Rebuilt hero with gradient orbs   │  │
│  │ ✓ Commit: "Redesign hero with floating..." │  │
│  │   Cost: $0.12 · 8 iterations               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Session 2 — Feb 21, 1:45 PM                     │
│  ┌────────────────────────────────────────────┐  │
│  │ ⚡ Ralph: Added product cards + cart        │  │
│  │ ✓ Commit: "Add product catalog with..."    │  │
│  │   Cost: $0.22 · 14 iterations              │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Session 1 — Feb 21, 1:00 PM                     │
│  ┌────────────────────────────────────────────┐  │
│  │ ✦ Chief: Initial planning conversation     │  │
│  │ ⚡ Ralph: Scaffolded Lullleaf tea brand     │  │
│  │ ✓ Commit: "Create Lullleaf cozy lo-fi..."  │  │
│  │   Cost: $0.08 · 6 iterations               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Total project cost: $0.42                       │
│  Total iterations: 28                            │
└──────────────────────────────────────────────────┘
```

**Data sources:**
- Sessions list: enumerate `.git/ai/history/*.jsonl` files, sorted by timestamp
- Commits per session: `git.log()`, grouped by session trailer metadata
- Chief interactions: enumerate `.chief/` state or parse session JSONL for Chief-originated messages
- Cost per session: parse JSONL for cost deltas, or read from commit trailers
- Iteration count: parse JSONL for iteration markers

**Future enhancement: Preview thumbnails.** Capture a screenshot of the preview iframe after each commit and store in `.git/builder/snapshots/{oid}.png`. The build history timeline then becomes a visual timeline showing the project at each state. This is a significant differentiator — most version control shows text diffs; Wiggum would show visual diffs.

---

## 5. DATA FLOW SUMMARY

```
User clicks dropdown item
        │
        ▼
┌─────────────────────────────────────┐
│         UI Event Handler            │
│  (React component / menu action)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    ProjectsManager / Git / DotBuilder│
│  (filesystem + git operations)       │
│                                      │
│  Favorite  → localStorage            │
│  Details   → fs.stat + DotBuilder    │
│             + CSS parse + import scan│
│  Rollback  → git.log + git.checkout  │
│             + git.commit (linear)    │
│  New Task  → session reset + .ralph/ │
│  Duplicate → recursive fs.copy       │
│  Export    → JSZip + blob download   │
│  Delete    → recursive fs.unlink     │
│                                      │
│  [Chief-era additions]               │
│  View Plan   → read .ralph/plan.tsx  │
│  Build Hist  → git.log + session     │
│  Share Chief → Coordinator.inject    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     JSRuntimeFS (LightningFS/ZenFS) │
│     isomorphic-git operates on      │
│     this in-browser filesystem      │
│     IndexedDB persistence           │
└─────────────────────────────────────┘
```

---

## 6. SUPPORTING PATTERNS

### ProjectsManager Class

A class that owns the `fs` and `git` instances and handles all CRUD operations on projects. Operates purely on the filesystem — no external state, no database.

```typescript
interface ProjectInfo {
  id: string           // directory slug
  path: string         // /projects/{id}
  lastModified: number // mtimeMs from fs.stat
}

class ProjectsManager {
  constructor(private fs: JSRuntimeFS, private git: Git) {}

  async listProjects(): Promise<ProjectInfo[]>
  async getProject(id: string): Promise<ProjectInfo>
  async createProject(name: string, template?: TemplateConfig): Promise<ProjectInfo>
  async renameProject(oldId: string, newId: string): Promise<ProjectInfo>
  async duplicateProject(sourceId: string): Promise<ProjectInfo>
  async deleteProject(id: string): Promise<void>
  async exportProject(id: string): Promise<Blob>
}
```

**Location:** `src/lib/projects/ProjectsManager.ts`

### DotBuilder Utility

Small utility class for reading/writing metadata files inside `.git/builder/`.

```typescript
class DotBuilder {
  constructor(private fs: JSRuntimeFS, private projectPath: string) {}

  async getCost(): Promise<number>
  async addCost(amount: number): Promise<void>
  async getTemplate(): Promise<TemplateInfo | null>
  async setTemplate(info: TemplateInfo): Promise<void>
  async getLabels(): Promise<string[]>
  async setLabels(labels: string[]): Promise<void>
  async saveSnapshot(oid: string, imageData: Uint8Array): Promise<void>  // future
  async getSnapshot(oid: string): Promise<Uint8Array | null>             // future
}
```

**Location:** `src/lib/projects/DotBuilder.ts`

### Sidebar Project List

Scrollable list of all projects. Each row shows the project name and optionally a favorite star. Supports text search/filter via an input at the top. Sorted: favorites first (by last-modified), then non-favorites (by last-modified).

Clicking a project navigates to it. The active project is highlighted.

**The Split Button for New Project:** Main area creates a blank project; a small chevron dropdown reveals: "Import Repository" (future), "From Template" (loads a gumdrop scaffold), and "Manage Labels".

### Git Commit as the Version Unit

Every meaningful Ralph action that changes files ends with a git commit. The commit flow:

1. Ralph writes/edits files using shell commands (write, edit, etc.)
2. Ralph calls `build` to verify compilation succeeds
3. Quality gates run and pass
4. Harness calls `git.add()` on all changed files → `git.commit()` with a descriptive message
5. The UI shows "Committed: {message}" as a collapsible action item in the chat

This is what makes rollback possible — every state transition is a commit.

### The `.git/ai/` and `.git/builder/` Convention

Storing metadata inside `.git/` subdirectories is deliberate:
- **Not committed** — git only tracks content in the working tree, not inside `.git/` itself
- **Tied to the project** — moves/copies/deletes with the project directory
- **Invisible to user's files** — doesn't pollute the source tree
- **Preserved across duplications** — deep copy includes `.git/` internals

The namespace `ai/` is for session data (model, cost, history). The namespace `builder/` is for project-level metadata (total cost, template origin, labels, snapshots).

---

## 7. INTEGRATION POINTS

### With Existing Systems

| System | Integration |
|--------|------------|
| `useAIChat` hook | New Task calls abort + reset methods. Rollback calls abort before checkout. Session name generation reuses existing pattern |
| `JSRuntimeFS` | All file operations go through the interface. Migration-safe: works with LightningFS today, ZenFS tomorrow |
| `isomorphic-git` | Rollback uses `git.log`, `git.checkout`, `git.writeRef`, `git.commit`. Duplicate preserves `.git/` |
| Theme generator | Project Details parses CSS variables that the theme generator wrote. Uses same OKLCH format and token names |
| Skills / Orama search | Stack usage scan could be backed by Orama for larger projects. Not needed initially |
| Shell commands | Export could be invoked as a shell command (`export --format zip`) for Chief/Ralph to trigger programmatically |
| Quality gates | Rollback triggers a rebuild which runs gates. New Task resets gate state |
| `@wiggum/stack` | UI components (DropdownMenu, Dialog, Button, Input, Badge, ScrollArea) from the existing library |

### With Future Systems

| Future System | Integration |
|---------------|------------|
| Chief (Coordinator) | "Share Plan with Chief" injects context into Chief via Coordinator. Build History shows Chief-originated sessions. Rollback + re-plan sends state to Chief |
| Planning language (plan.tsx) | "View Plan" renders the plan. Plan diffing shows planned vs. built. Rollback clears plan state |
| ZenFS migration | Zero impact — all operations use JSRuntimeFS interface |
| Hono full-stack | Export gains "Export as deployable" option. Project Details shows API route inventory alongside component inventory |
| Visual review | Preview thumbnails per commit use the same screenshot capture mechanism as the visual review system |
| PWA | `navigator.storage.persist()` calls after create/duplicate/import |

---

## 8. FILE CHANGE INDEX

### New Files

| File | LOC (est.) | Purpose |
|------|-----------|---------|
| `src/lib/projects/ProjectsManager.ts` | ~200 | Project CRUD (create, list, rename, duplicate, delete, export) |
| `src/lib/projects/DotBuilder.ts` | ~100 | `.git/builder/` metadata reads/writes |
| `src/lib/projects/types.ts` | ~40 | ProjectInfo, TemplateInfo, LabelSet interfaces |
| `src/lib/projects/index.ts` | ~10 | Barrel exports |
| `src/components/project/ProjectContextMenu.tsx` | ~80 | Dropdown trigger + menu items |
| `src/components/project/ProjectDetailsModal.tsx` | ~250 | Metadata display, rename, labels, export, delete |
| `src/components/project/RollbackDialog.tsx` | ~200 | Commit history + rollback action |
| `src/components/project/DeleteConfirmDialog.tsx` | ~80 | Type-to-confirm deletion |
| `src/components/project/DesignTokens.tsx` | ~120 | OKLCH swatch renderer + font/radius/shadow display |
| `src/components/project/StackUsage.tsx` | ~60 | Import scanner + tag list renderer |
| `src/components/project/BuildHistory.tsx` | ~200 | Timeline view (Chief-era, can ship empty initially) |
| `src/lib/projects/css-parser.ts` | ~80 | Extract CSS variables from index.css |
| `src/lib/projects/import-scanner.ts` | ~60 | Scan source files for @wiggum/stack imports |

**New file total: ~1,480 LOC**

### Modified Files

| File | Changes | LOC Changed (est.) |
|------|---------|-------------------|
| `src/components/layout/Header.tsx` | Add ProjectContextMenu trigger to project name | ~20 |
| `src/hooks/useAIChat.ts` | Add `resetSession()` and `archiveSession()` methods | ~40 |
| `src/pages/Workspace.tsx` | Wire ProjectContextMenu, modals, navigation | ~30 |
| `src/contexts/index.ts` | Export ProjectsManager context (if using context pattern) | ~5 |

**Modified file total: ~95 LOC changed**

### Chief-Era Files (created later, when Chief ships)

| File | LOC (est.) | Purpose |
|------|-----------|---------|
| `src/components/project/ChiefNotes.tsx` | ~80 | Chief's Notes section in Project Details |
| `src/components/project/PlanViewer.tsx` | ~120 | Read-only plan.tsx / plan.md viewer |
| `src/components/project/BuildHistory.tsx` | ~200 | Full timeline (expands the empty shell) |

**Chief-era total: ~400 LOC**

---

## 9. CC PROMPT STRATEGY

Each prompt describes patterns, concepts, and files to edit. No code copying. Clean room implementation.

### Prompt 1: ProjectsManager + DotBuilder

```
Create the ProjectsManager class for Wiggum's project lifecycle management.

Location: src/lib/projects/

ProjectsManager is a plain TypeScript class that receives a JSRuntimeFS
instance and a Git instance in its constructor. It handles:

- listProjects(): read /projects/ directory, stat each entry, return sorted
  array of { id, path, lastModified }
- getProject(id): stat a single project, return info or throw
- createProject(name): validate slug (lowercase, alphanum + hyphens),
  create directory at /projects/{slug}/, git init, create initial commit,
  call navigator.storage.persist()
- renameProject(oldId, newId): validate new slug, check no collision,
  fs.rename entire directory, update favorites in localStorage
- duplicateProject(sourceId): generate unique copy ID, deep copy entire
  directory tree (including .git/), reset session state in the copy,
  return new project info
- deleteProject(id): recursive depth-first deletion (unlink files,
  rmdir directories bottom-up), remove from localStorage favorites
- exportProject(id): walk tree excluding .git/.ralph/.chief, build
  JSZip archive, return Blob

Also create DotBuilder class in same package:
- Constructor takes JSRuntimeFS + projectPath
- getCost() / addCost(n) — reads/writes .git/builder/COST (float)
- getTemplate() / setTemplate(info) — reads/writes .git/builder/template.json
- getLabels() / setLabels(labels) — reads/writes .git/builder/labels.json
- Ensure .git/builder/ directory exists before writes (mkdir recursive)

Create types.ts with ProjectInfo, TemplateInfo interfaces.

Dependencies: JSZip (already available or add via esm.sh import).

Pattern reference: Look at how Git.ts wraps isomorphic-git with pre-bound
fs. ProjectsManager follows the same pattern — wraps fs operations with
project-aware paths.

DO NOT modify existing files. This is purely additive.
```

### Prompt 2: CSS Parser + Import Scanner

```
Create two small utility modules for Wiggum's Project Details modal.

1. src/lib/projects/css-parser.ts
   - extractCssVariables(cssContent: string): Record<string, string>
   - Parses a CSS file string, extracts all custom properties from :root {}
   - Returns map like { '--primary': 'oklch(0.65 0.15 150)', '--radius': '0.5rem' }
   - Handle both :root { } and .dark { } blocks (return separately)
   - Handle /* mood: warm-botanical */ style comments (extract mood name)
   - Pure string parsing — no CSS parser library needed. Regex is fine for
     this constrained format (we control what Ralph writes)

2. src/lib/projects/import-scanner.ts
   - scanStackImports(fs: JSRuntimeFS, srcPath: string): Promise<string[]>
   - Recursively walk srcPath for .tsx/.ts files
   - Find import statements that reference @wiggum/stack components
     (look for imports from paths containing 'components/ui' or '@wiggum/stack')
   - Return deduplicated sorted array of component names
   - Handle: named imports { Button, Card }, renamed imports { Button as Btn }
   - Ignore: default imports, type-only imports

Both are pure functions with no side effects beyond fs reads. No new
dependencies needed.
```

### Prompt 3: UI Components

```
Create the Project Context Menu UI components for Wiggum.

Components to create (all in src/components/project/):

1. ProjectContextMenu.tsx
   - Uses @wiggum/stack DropdownMenu (Radix primitive)
   - Trigger: project name text + ChevronDown icon
   - Menu items: Favorite, Project Details, Rollback, New Task,
     separator, Duplicate, Export, separator, Delete
   - Each item calls a callback prop (actual logic lives in parent)
   - Favorite item toggles text/icon based on isFavorited prop

2. ProjectDetailsModal.tsx
   - Uses @wiggum/stack Dialog
   - On open: reads all data from filesystem via ProjectsManager + DotBuilder
   - Sections: metadata (last modified, cost, mood), design tokens
     (color swatches + font/radius/shadow), stack usage (component tags),
     origin (gumdrop/template info), rename input, labels, export button,
     delete button
   - Rename: validate on blur/submit, call ProjectsManager.renameProject()
   - Design tokens section uses DesignTokens subcomponent
   - Stack usage section uses StackUsage subcomponent

3. DesignTokens.tsx
   - Receives cssVariables: Record<string, string>
   - Renders color tokens as small circular swatches (parse oklch values,
     render as background-color)
   - Renders font name, radius stop name, shadow profile name
   - Collapsible section (collapsed by default for space)

4. StackUsage.tsx
   - Receives components: string[]
   - Renders as horizontal wrapping list of Badge components
   - If empty, show subtle "No stack components detected" text

5. RollbackDialog.tsx
   - Uses @wiggum/stack Dialog + ScrollArea
   - On open: calls git.log() to get commit array
   - Each commit: title (first line of message), expandable body (full message),
     author timestamp, "Current" badge on newest, "Rollback" button on rest
   - Rollback button calls onRollback(oid) prop
   - Expanding uses @wiggum/stack Collapsible or Accordion

6. DeleteConfirmDialog.tsx
   - Uses @wiggum/stack AlertDialog
   - Shows project name, warning text
   - Text input that must match project name to enable delete button
   - Delete button is danger-styled, disabled until name matches

Wire all components together in the parent (Workspace.tsx or a new
ProjectActions wrapper). The parent holds state, calls ProjectsManager
methods, and handles navigation.

Use relative imports to @wiggum/stack components following the existing
pattern in the codebase — check how other components import from stack.
```

### Prompt 4: Chief-Era Enhancements (later)

```
Enhance the Project Context Menu with Chief-aware features.

This prompt assumes Chief (Coordinator, useChiefChat, tab UI) is already
implemented per the chief-implementation-plan.

1. Add "View Plan" menu item to ProjectContextMenu.tsx
   - Reads .ralph/plan.tsx (if planning language exists) or .chief/plan.md
   - Opens a read-only viewer dialog with syntax highlighting
   - If neither file exists, show empty state with CTA to Chief tab

2. Add "Share Plan with Chief" menu item
   - Reads .ralph/summary.md + .ralph/plan.tsx + scans src/ for components
   - Calls coordinator.injectContext(summary, plan, components)
   - Switches active tab to Chief
   - Chief receives pre-loaded context about current project state

3. Add ChiefNotes section to ProjectDetailsModal
   - Only renders when .chief/plan.md exists
   - Shows truncated plan preview, chief status, session count
   - "Open in Chief" button switches to Chief tab
   - "Clear Plan" button deletes .chief/plan.md + resets status

4. Expand BuildHistory.tsx from empty shell to full timeline
   - Enumerate .git/ai/history/*.jsonl files for session list
   - git.log() for commits, grouped by session (parse commit trailers)
   - Show Chief interactions alongside Ralph builds
   - Display per-session cost and iteration counts
   - Total project cost at bottom

5. Enhance RollbackDialog with "Rollback and Re-plan" option
   - Next to "Rollback" button, add "Rollback & Re-plan" secondary action
   - Performs standard rollback, then:
     - Reads diff between current and target commit
     - Switches to Chief tab
     - Injects context: "Project rolled back to [state]. Changes since:
       [diff summary]. What would you like to do differently?"

Pattern: All Chief interactions go through the Coordinator class. Never
call useChiefChat directly from these components — use Coordinator's
methods and let the hook react to state changes.
```

---

## 10. NOTES FOR IMPLEMENTATION

**No server required.** Everything is client-side: JSRuntimeFS for storage, isomorphic-git for version control, localStorage for preferences, JSZip for export.

**Call `navigator.storage.persist()`** after project creation, duplication, and import to protect IndexedDB from browser eviction.

**Rollback is the trickiest feature.** Test thoroughly with isomorphic-git's checkout + writeRef + force flags. Handle: uncommitted changes (force discards), single-commit projects (no rollback available), mid-iteration abort (stop Ralph before checkout).

**Session JSONL files can grow large.** Consider pruning old sessions or setting a max file count. A project with 50+ sessions accumulated over weeks could have substantial history. Low priority — address when it becomes a real problem.

**The recursive directory copy and delete functions are needed** because neither LightningFS nor ZenFS provide `rm -rf` or `cp -r`. Walk the tree with `readdir` + `stat`, handle files vs. directories, and recurse.

**CSS parsing is deliberately simple.** Ralph writes CSS in a predictable format (`:root { }` block with `--token: value;` lines). A regex-based parser is sufficient and avoids adding a CSS parsing library. If the format evolves, upgrade the parser.

**Design tokens display degrades gracefully.** If `src/index.css` doesn't exist or has no `:root` block, the section simply doesn't render. Same for stack usage — if no imports found, show a subtle empty state. Never error on missing data.

**Relationship to other plans:**
- ZenFS migration: No conflicts. All operations use JSRuntimeFS
- Chief implementation: Chief-era features layer on top. Base features ship independently
- Hono full-stack: Export gains a "deployable" variant. Project Details shows API inventory
- Planning language: "View Plan" renders plan.tsx. Plan diff gate feeds Build History
- Skills tightening: No interaction. Context menu is pure UI + filesystem
