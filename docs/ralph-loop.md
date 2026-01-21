# The Ralph Loop

Ralph is Wiggum's autonomous AI coding loop. Every task runs through it.

## What is Ralph?

Traditional AI chat accumulates context. As conversations grow, you hit token limits. The AI forgets earlier messages or gets confused.

Ralph solves this: **iterate with fresh context instead of accumulating**.

Each iteration:
1. Reads the task (what to do)
2. Reads progress (what's done)
3. Does the next step
4. Updates progress

A 50-iteration task works as well as a 2-iteration task.

## How It Works

```
You: "Create a todo app with local storage"
     ↓
┌─────────────────────────────────────┐
│         Ralph Loop (Iteration 1)    │
│  - Read task from .ralph/task.md    │
│  - Plan approach                    │
│  - Create initial files             │
│  - Update .ralph/progress.md        │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│         Ralph Loop (Iteration 2)    │
│  - Read progress from last round    │
│  - Add functionality                │
│  - Test the code                    │
│  - Update progress                  │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│         Ralph Loop (Iteration 3)    │
│  - Read progress                    │
│  - Final polish                     │
│  - Write "complete" to status.txt   │
└─────────────────────────────────────┘
     ↓
Done!
```

## Every Message Loops

In Wiggum, every message enters the Ralph loop:

- **Simple tasks** (questions, small fixes) → 1 iteration
- **Complex tasks** (build features, refactor code) → N iterations
- **You don't choose** — it's automatic

## The .ralph/ Directory

State is stored in files, not conversation history.

```
.ralph/
├── task.md        # The original task
├── progress.md    # What's been accomplished
├── status.txt     # Current status
├── iteration.txt  # Current iteration number
└── feedback.md    # User feedback (if paused)
```

### task.md

The original user request, preserved exactly.

```markdown
Create a todo app with local storage persistence
```

### progress.md

Accumulated progress across iterations.

```markdown
## Iteration 1
- Created TodoApp component
- Added basic state management
- Created TodoItem component

## Iteration 2
- Added local storage hook
- Implemented add/remove functionality
- Added persistence on state change
```

### status.txt

Current loop status:

| Status | Meaning |
|--------|---------|
| `running` | Loop is active |
| `complete` | Task is done |
| `waiting` | Paused for user input |

### iteration.txt

Simple counter: `1`, `2`, `3`, etc.

## Fresh Context

Each iteration builds context from files:

```typescript
const context = `
## Task
${await fs.readFile('.ralph/task.md')}

## Progress So Far
${await fs.readFile('.ralph/progress.md')}

## Current Iteration
${iteration}

Continue working on this task. Update progress.md with what you accomplish.
When the task is complete, write "complete" to status.txt.
`
```

The AI sees:
- What to do (task)
- What's done (progress)
- What iteration this is

It doesn't see previous conversation — just structured state.

## Completion

The AI signals completion by writing to status.txt:

```typescript
await fs.writeFile('.ralph/status.txt', 'complete')
```

The loop checks after each iteration. If complete, it stops.

## Why This Works

1. **No token limits** — Fresh context each iteration
2. **Structured memory** — Progress is explicit, not implicit
3. **Resumable** — State is in files, not memory
4. **Observable** — You can read .ralph/ to see what's happening
5. **Git-friendly** — Each iteration can be a commit

## Implementation

Core loop in `apps/ide/src/lib/commands/ralph/loop.ts`:

```typescript
export async function initLoopState(fs, cwd, task): Promise<void>
export async function readLoopState(fs, cwd): Promise<RalphState>
export function buildLoopContext(state, iteration): string
export async function updateIteration(fs, cwd, iteration): Promise<void>
export async function appendProgress(fs, cwd, iteration, summary): Promise<void>
export async function checkComplete(fs, cwd): Promise<boolean>
export async function setStatus(fs, cwd, status): Promise<void>
```

Chat integration in `apps/ide/src/hooks/useAIChat.ts`:

```typescript
const sendMessage = async (content: string) => {
  // Initialize .ralph/
  await initLoopState(fs, cwd, content)

  // Run loop until complete
  while (true) {
    const state = await readLoopState(fs, cwd)
    const context = buildLoopContext(state, iteration)

    await runAIWithContext(context)

    if (await checkComplete(fs, cwd)) break
    iteration++
  }
}
```
