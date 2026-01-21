# Wiggum Documentation

<p align="center">
  <img src="images/ralph-loops.png" alt="Oops! It's All Loops!" width="400">
</p>

A browser-based AI coding IDE where every task runs through an autonomous loop.

## Quick Start

```bash
git clone https://github.com/PerceptLabs/wiggum.git
cd wiggum
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

## Documentation

| Doc | Description |
|-----|-------------|
| [Getting Started](getting-started.md) | Setup, installation, first project |
| [Architecture](architecture.md) | Monorepo structure, key modules, data flow |
| [Ralph Loop](ralph-loop.md) | The autonomous iteration system |
| [Skills](skills.md) | Packaged prompts and capabilities |
| [Stack](stack.md) | @wiggum/stack component library |

## Core Concept

Wiggum is different from typical AI chat interfaces. Instead of back-and-forth conversation, you give it a task and it runs autonomously until done.

**Oops! It's All Loops.**

- Simple tasks complete in one iteration
- Complex tasks run multiple iterations with fresh context
- The AI signals when done — no babysitting required
