# Wiggum

A browser-based AI coding IDE with an autonomous iteration loop.

## Features

- **Fully Browser-Based** — No server required for core functionality
- **In-Browser Filesystem** — LightningFS with IndexedDB persistence
- **Git Integration** — Full git support via isomorphic-git
- **AI Chat** — Tool-using AI assistant for coding tasks
- **Ralph Command** — Autonomous AI coding loop with fresh context per iteration
- **Live Preview** — In-browser code compilation with esbuild-wasm
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

## The Ralph Command

Ralph is Wiggum's autonomous coding loop. When invoked, it:

1. Reads the task from a prompt file
2. Executes the AI with full tool access (file read/write, shell commands)
3. Completes when the AI signals done or max iterations reached
4. Each iteration gets fresh context to avoid token limits

```bash
# In the Wiggum terminal
ralph run task.md
```

Ralph enables complex, multi-step coding tasks without manual intervention.

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
