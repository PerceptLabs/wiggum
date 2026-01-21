# Wiggum

<p align="center">
  <img src="docs/images/ralph-loops.png" alt="Oops! It's All Loops!" width="400">
</p>

<p align="center">
  <strong>A browser-based AI coding IDE where every task runs through an autonomous loop.</strong>
</p>

---

## What is Wiggum?

Wiggum is a fully browser-based AI coding assistant that works autonomously. Unlike traditional AI chat interfaces where you go back and forth, Wiggum takes your task and **runs with it** — iterating automatically until the job is done.

**Oops! It's All Loops.**

Every message you send goes through the Ralph loop:
- Simple tasks (questions, small fixes) complete in one iteration
- Complex tasks (build an app, refactor a codebase) run multiple iterations with fresh context each time
- The AI signals when it's done — you don't have to babysit it

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
│  - Add styling and interactions     │
│  - Test the code works              │
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
Done! Your todo app is ready.
```

Each iteration gets **fresh context** — the AI reads its task and progress from files, not from an ever-growing conversation. This means complex tasks don't hit token limits.

## Features

- **Autonomous by Default** — Every task runs through the Ralph loop automatically
- **Fully Browser-Based** — No server required; runs entirely in your browser
- **In-Browser Filesystem** — LightningFS with IndexedDB persistence
- **Git Integration** — Full git support via isomorphic-git
- **Live Preview** — In-browser code compilation with esbuild-wasm
- **Tool-Using AI** — File read/write, shell commands, and more
- **Skills System** — Extensible AI capabilities via skill definitions

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/PerceptLabs/wiggum.git
cd wiggum

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Configuration

1. Open Wiggum in your browser
2. Go to Settings and enter your OpenAI-compatible API key
3. Start chatting — your tasks will automatically run through the loop

## The Ralph Loop

Ralph is the heart of Wiggum. It's the autonomous iteration system that handles every task.

### How Ralph Works

1. **Task Capture** — Your message becomes `.ralph/task.md`
2. **Iteration** — AI reads task, makes progress, updates `.ralph/progress.md`
3. **Fresh Context** — Each iteration starts clean, reading state from files
4. **Completion Signal** — AI writes "complete" to `.ralph/status.txt` when done

### The .ralph Directory

```
.ralph/
├── task.md        # The original task
├── progress.md    # What's been accomplished
├── status.txt     # Current status (running/complete/waiting)
└── iteration.txt  # Current iteration number
```

### Why Loops?

Traditional AI chat has a problem: as conversations grow, you hit context limits. The AI forgets earlier messages or gets confused.

Ralph solves this with a simple idea: **don't accumulate context, iterate with fresh context**. Each iteration:
- Reads the task (what to do)
- Reads progress (what's done)
- Does the next step
- Updates progress

This means a 50-iteration task works just as well as a 2-iteration task.

## Project Structure

```
wiggum/
├── apps/
│   └── ide/                    # Wiggum IDE application
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── contexts/       # React context providers
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Core libraries
│       │   │   ├── ai/         # AI client and streaming
│       │   │   ├── build/      # esbuild-wasm integration
│       │   │   ├── commands/   # Shell command implementations
│       │   │   ├── fs/         # Filesystem abstraction
│       │   │   ├── session/    # Session management
│       │   │   ├── skills/     # Skills system
│       │   │   └── tools/      # AI tool definitions
│       │   └── pages/          # Route pages
│       └── package.json
├── packages/
│   └── stack/                  # @wiggum/stack UI library
│       ├── src/
│       │   ├── components/ui/  # 53 shadcn/ui components
│       │   ├── hooks/          # Shared React hooks
│       │   └── lib/            # Utilities (cn, formatters)
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

### Apps/IDE

| Category | Technology |
|----------|------------|
| Framework | React 19, TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | @tanstack/react-query |
| Filesystem | LightningFS, isomorphic-git |
| Bundler | esbuild-wasm |
| AI | OpenAI-compatible API |

### @wiggum/stack

| Category | Technology |
|----------|------------|
| Components | 53 shadcn/ui components |
| Primitives | Radix UI |
| Tables | @tanstack/react-table |
| Forms | react-hook-form, zod |
| Utilities | clsx, tailwind-merge |

## License

MIT
