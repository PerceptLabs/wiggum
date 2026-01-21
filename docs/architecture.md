# Architecture

Wiggum is a pnpm monorepo with two main packages.

## Monorepo Structure

```
wiggum/
├── apps/
│   └── ide/                 # Main Wiggum application
├── packages/
│   └── stack/               # @wiggum/stack component library
├── pnpm-workspace.yaml
└── package.json
```

## apps/ide

The Wiggum IDE application.

### Source Structure

```
apps/ide/src/
├── components/
│   ├── chat/           # Chat interface (ChatPane, MessageList)
│   ├── files/          # File explorer, editors
│   ├── layout/         # App shell, panels, sidebar
│   └── settings/       # Settings dialogs
├── contexts/
│   ├── FSContext       # Filesystem access
│   ├── AIContext       # AI client and chat
│   ├── ProjectContext  # Current project state
│   └── SessionContext  # Session management
├── hooks/
│   ├── useAIChat       # AI chat with Ralph loop
│   ├── useLocalStorage # Persistent state
│   └── useTheme        # Theme management
├── lib/
│   ├── ai/             # OpenAI client, streaming
│   ├── build/          # esbuild-wasm bundling
│   ├── commands/       # Shell commands (ls, cat, git, ralph)
│   ├── fs/             # LightningFS wrapper
│   ├── git/            # isomorphic-git integration
│   ├── session/        # Session + system prompts
│   ├── skills/         # Skills loader
│   └── tools/          # AI tool definitions
└── pages/              # Route pages
```

### Key Modules

#### lib/fs/ — Filesystem

Wraps LightningFS for browser filesystem with IndexedDB persistence.

```typescript
const fs = useFSContext()
await fs.writeFile('/project/index.ts', content)
const files = await fs.readdir('/project')
```

#### lib/ai/ — AI Client

OpenAI-compatible client with streaming and tool use.

```typescript
const stream = await ai.chat({
  messages,
  tools,
  onToolCall: async (call) => executeToolCall(call)
})
```

#### lib/commands/ralph/ — Ralph Loop

Autonomous iteration system. See [Ralph Loop](ralph-loop.md).

#### lib/tools/ — AI Tools

Tool definitions for file operations, shell commands, git.

```typescript
export const tools = [
  readFileTool,
  writeFileTool,
  listFilesTool,
  shellTool,
  gitTool
]
```

## Data Flow

### Filesystem

```
FSContext → LightningFS → IndexedDB
     ↑
Components read/write via context
```

### AI Chat

```
User message
     ↓
useAIChat (initializes .ralph/)
     ↓
Loop iteration
     ↓
AI client → OpenAI API
     ↓
Tool calls → Execute → Response
     ↓
Check .ralph/status.txt
     ↓
Complete? → Done
Not complete? → Next iteration
```

### Project State

```
ProjectContext
     ↓
  ┌──┴──┐
  ↓     ↓
Files  Git
  ↓     ↓
  └──┬──┘
     ↓
IndexedDB persistence
```

## packages/stack

Shared component library. See [Stack](stack.md).

## Build System

- **Vite 7** — Dev server and production builds
- **esbuild-wasm** — In-browser bundling for previews
- **TypeScript** — Type checking across monorepo

## Testing

- **Vitest** — Unit and integration tests
- Tests run with `pnpm test`
- 230+ tests covering core functionality
