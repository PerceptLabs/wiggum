# Getting Started

## Prerequisites

- Node.js 18+
- pnpm 9+

## Installation

```bash
# Clone the repository
git clone https://github.com/PerceptLabs/wiggum.git
cd wiggum

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

## Running Wiggum

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration

1. Click the **Settings** icon in the sidebar
2. Enter your OpenAI-compatible API endpoint and key
3. Save settings

## Creating Your First Project

1. Click **New Project** in the file explorer
2. Enter a project name
3. Wiggum initializes a git repo and basic structure
4. Start chatting — your task automatically runs through the Ralph loop

## Example Tasks

Try these to get a feel for Wiggum:

```
Create a simple counter component with increment/decrement buttons
```

```
Build a todo list with local storage persistence
```

```
Create a markdown previewer with live updates
```

Each task runs through the Ralph loop. Simple tasks complete in one iteration. Complex tasks iterate until done.

## Development Commands

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build for production
pnpm build
```

## Next Steps

- [Architecture](architecture.md) — Understand how Wiggum is structured
- [Ralph Loop](ralph-loop.md) — Learn how the autonomous loop works
- [Skills](skills.md) — Extend Wiggum with custom capabilities
