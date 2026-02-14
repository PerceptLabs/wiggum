# WIGGUM CHIEF IMPLEMENTATION PLAN

> Add a conversational planner ("Chief") to Wiggum that sits alongside Ralph. Chief helps users refine ideas, plan projects, and craft precise prompts before sending work to Ralph for autonomous execution. Two-tab UI, shared filesystem, Coordinator seam for future extensibility.

---

## TABLE OF CONTENTS

1. [Context & Discovery Summary](#1-context--discovery-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Implementation Phases](#3-implementation-phases)
4. [File Change Index](#4-file-change-index)
5. [CC Prompt Strategy](#5-cc-prompt-strategy)
6. [Risk Assessment](#6-risk-assessment)
7. [Relationship to Other Plans](#7-relationship-to-other-plans)

---

## 1. CONTEXT & DISCOVERY SUMMARY

### What Exists Today

**LLM Client** (`src/lib/llm/client.ts`):
- Self-rolled fetch wrapper (~160 LOC), OpenAI-compatible format
- Retry with exponential backoff (3 attempts, jitter, Retry-After support)
- No streaming — batch request/response only
- Stateless: `chat(provider, messages, tools?, signal?) → Promise<Message>`
- Tool call support built-in (tool_calls, tool_call_id in Message type)

**Ralph Loop** (`src/lib/ralph/loop.ts`):
- Fresh context per iteration, files as memory (`.ralph/` directory)
- One tool: shell (dispatched via ShellExecutor)
- Up to 20 iterations × 50 tool calls each
- Quality gates with auto-patch after 2 failures
- Reflection capture and gap tracking
- ~350 line system prompt embedded in the file

**Callback System** (`RalphCallbacks`):
- Direct callback bag, NOT a pub/sub bus
- Passed into `runRalphLoop()` as parameter
- Callbacks: `onIterationStart`, `onIterationEnd`, `onToolCall`, `onStatus`, `onAction`, `onIntent`, `onSummary`, `onComplete`, `onError`, `onGatesChecked`, `onGapRecorded`, `onReflectionCaptured`
- AbortSignal for cancellation

**UI Hook** (`src/hooks/useAIChat.ts`):
- Single hook creates ShellExecutor + Git, wires RalphCallbacks to React state
- Manages abort/cancel/retry, persists chat to localStorage
- One instance, one loop, everything flows through here

**Shell Executor** (`src/lib/shell/executor.ts`):
- Full pipeline: piping, `&&`/`||`, heredocs, redirects, glob expansion
- Write guards, gap tracking, command redirects
- All commands use `JSRuntimeFS` interface

**FS Layer**:
- `JSRuntimeFS` interface (abstraction seam) → `LightningFSAdapter` → IndexedDB
- Every consumer talks to the interface, not the implementation
- ZenFS migration planned (replaces adapter, keeps interface)

### What Chief Needs

1. **A conversational chat loop** — multi-turn dialogue with the user (not autonomous like Ralph)
2. **Its own tools** — read project files, write plans, send prompts to Ralph
3. **A shared coordination layer** — tell Ralph to start, know when Ralph finishes
4. **Tab-based UI** — Chief tab and Ralph tab in the same chat panel
5. **File-based state** — `.chief/` directory for plans, prompts, conversation context

### Key Design Decisions

| Decision | Options | Chosen | Why |
|----------|---------|--------|-----|
| Coordination pattern | Event bus / Direct calls / Zustand | Coordinator class (direct calls now, bus-ready seam) | Same play as JSRuntimeFS — build the seam, swap internals later |
| Chief's tool execution | ShellExecutor / Inline dispatch | Inline dispatch | Chief's tools are simple fs reads/writes, not shell pipelines |
| Streaming | Add to client.ts / Batch only | Batch only (phase 1), streaming later | Ship working Chief first, optimize UX second |
| State persistence | localStorage / IndexedDB / FS | localStorage (chat) + FS (.chief/ directory) | Matches existing useAIChat pattern |
| LLM client | New client / Reuse client.ts | Reuse client.ts | Stateless fetch — just call chat() with different prompts/tools |
| Tab UI | Tabs / Accordion / Split pane | Tabs at top of chat panel | Clean mental model, matches mockup |

---

## 2. ARCHITECTURE OVERVIEW

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Chat Panel (tabbed)                                      │
│                                                          │
│  ┌──────────┬──────────┐                                │
│  │  Chief   │  Ralph   │  ← tab selector                │
│  └──────────┴──────────┘                                │
│                                                          │
│  [Chief Tab]              [Ralph Tab]                    │
│  useChiefChat.ts          useAIChat.ts (existing)        │
│    ↓                        ↓                            │
│  Coordinator ──────────→ Coordinator                     │
│    ↓                        ↓                            │
│  chat() ← client.ts      runRalphLoop() ← loop.ts       │
│    ↓                        ↓                            │
│  Chief tools              Shell tool                     │
│  (inline dispatch)        (ShellExecutor)                │
│    ↓                        ↓                            │
│  .chief/ directory        .ralph/ directory              │
│         ↘                ↙                               │
│          JSRuntimeFS interface                           │
│              ↓                                           │
│          LightningFS (now) → ZenFS (later)               │
└─────────────────────────────────────────────────────────┘
```

### The Coordinator

The Coordinator is the seam between Chief and Ralph. It starts as direct function calls and can evolve into an event bus without changing consumers.

```typescript
// src/lib/coordinator/index.ts

interface CoordinatorCallbacks {
  onRalphStatusChange?: (status: RalphStatus) => void
  onRalphIteration?: (iteration: number) => void
  onRalphComplete?: (result: RalphResult) => void
  onRalphError?: (error: Error) => void
}

interface RalphStatus {
  state: 'idle' | 'running' | 'waiting' | 'complete' | 'error'
  iteration: number
  lastUpdate: number
}

class Coordinator {
  private fs: JSRuntimeFS
  private callbacks: CoordinatorCallbacks = {}
  private ralphStatus: RalphStatus = { state: 'idle', iteration: 0, lastUpdate: 0 }
  
  constructor(fs: JSRuntimeFS) {
    this.fs = fs
  }

  // --- Chief → Ralph ---
  
  /** Chief writes a plan and signals Ralph to start */
  async sendToRalph(prompt: string, plan?: string): Promise<void> {
    // Write Chief's artifacts to filesystem
    await this.fs.mkdir('.chief', { recursive: true })
    await this.fs.writeFile('.chief/prompt.md', prompt)
    if (plan) {
      await this.fs.writeFile('.chief/plan.md', plan)
    }
    await this.fs.writeFile('.chief/status.txt', 'ready')
    
    // Direct call (today) — bus.emit('chief:plan-ready') (tomorrow)
    // The UI layer (useChiefChat) calls startRalph() after this
  }

  // --- Ralph → Chief (status tracking) ---
  
  updateRalphStatus(status: Partial<RalphStatus>): void {
    this.ralphStatus = { ...this.ralphStatus, ...status, lastUpdate: Date.now() }
    this.callbacks.onRalphStatusChange?.(this.ralphStatus)
  }

  getRalphStatus(): RalphStatus {
    return this.ralphStatus
  }

  // --- Subscriptions ---
  
  subscribe(callbacks: CoordinatorCallbacks): () => void {
    this.callbacks = { ...this.callbacks, ...callbacks }
    return () => { this.callbacks = {} }
  }

  // --- File-based state recovery ---
  
  async recoverState(): Promise<{ hasChiefPlan: boolean; ralphWasRunning: boolean }> {
    let hasChiefPlan = false
    let ralphWasRunning = false
    
    try {
      const chiefStatus = await this.fs.readFile('.chief/status.txt', { encoding: 'utf8' })
      hasChiefPlan = (chiefStatus as string).trim() === 'ready'
    } catch { /* no chief state */ }
    
    try {
      const ralphStatus = await this.fs.readFile('.ralph/status.txt', { encoding: 'utf8' })
      ralphWasRunning = (ralphStatus as string).trim() === 'running'
    } catch { /* no ralph state */ }
    
    return { hasChiefPlan, ralphWasRunning }
  }
}
```

**Why a class, not a hook?** The Coordinator holds shared state that both tabs need. If it were a hook, each tab would get its own instance. A class singleton (provided via React context) gives both `useChiefChat` and `useAIChat` the same coordination layer.

### Chief's System Prompt (Concept)

Chief is NOT an autonomous agent. It's a conversational assistant that helps the user think through what they want to build.

```
You are Chief — a senior engineering partner who helps plan projects before they're built.

Your job is to:
1. Understand what the user wants to build
2. Ask clarifying questions (one at a time, not a barrage)
3. Help them think through design decisions
4. Produce a clear, actionable prompt for Ralph

You have tools to:
- Read project files to understand current state
- Search skills for design guidance
- Write plans to .chief/plan.md
- Send refined prompts to Ralph when the user is ready

You are conversational, not autonomous. You suggest, the user decides.
You never write code directly — that's Ralph's job.
When the user says "go", "build it", "send to Ralph", or similar — 
use the send_to_ralph tool with the refined prompt.
```

### Chief's Tools

Chief needs 4-5 tools, all simpler than Ralph's shell:

```typescript
// Tool definitions for Chief's chat() calls

const CHIEF_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a project file to understand current state. Use to check what exists before planning.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root (e.g., "src/App.tsx")' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files in a directory to understand project structure.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path (e.g., "src/components")' },
          recursive: { type: 'boolean', description: 'List recursively (default: false)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_skills',
      description: 'Search the design skills library for guidance on themes, layouts, typography, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for (e.g., "bento grid layout", "dark theme preset")' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_plan',
      description: 'Save the current plan to .chief/plan.md. Use this to checkpoint your thinking.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The plan content in markdown' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_to_ralph',
      description: 'Send a refined prompt to Ralph for autonomous execution. Only use when the user confirms they are ready to build.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The refined, detailed prompt for Ralph' },
          plan: { type: 'string', description: 'Optional: structured plan Ralph should follow' }
        },
        required: ['prompt']
      }
    }
  }
]
```

### Chief's Tool Dispatch

Unlike Ralph (which routes everything through ShellExecutor), Chief's tools are dispatched inline in a simple while loop:

```typescript
// Inside useChiefChat — conceptual, not final code

async function dispatchChiefTool(
  toolCall: ToolCall,
  fs: JSRuntimeFS,
  cwd: string,
  coordinator: Coordinator
): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments)
  
  switch (toolCall.function.name) {
    case 'read_file': {
      const content = await fs.readFile(`${cwd}/${args.path}`, { encoding: 'utf8' })
      return content as string
    }
    case 'list_files': {
      const entries = await fs.readdir(`${cwd}/${args.path}`)
      return (entries as string[]).join('\n')
    }
    case 'search_skills': {
      // Reuse existing skills search (grep skill infrastructure)
      const results = await searchSkills(args.query)
      return results
    }
    case 'write_plan': {
      await fs.mkdir(`${cwd}/.chief`, { recursive: true })
      await fs.writeFile(`${cwd}/.chief/plan.md`, args.content)
      return 'Plan saved to .chief/plan.md'
    }
    case 'send_to_ralph': {
      await coordinator.sendToRalph(args.prompt, args.plan)
      return 'Prompt sent to Ralph. Switch to the Ralph tab to watch the build.'
    }
    default:
      return `Unknown tool: ${toolCall.function.name}`
  }
}
```

### Tab UI Structure

```
┌─────────────────────────────────────────────┐
│ ┌──────────────┬───────────────────────────┐ │
│ │   Chief      │   Ralph   ● RUNNING [2]   │ │  ← tabs with status badge
│ └──────────────┴───────────────────────────┘ │
│                                              │
│  [Active tab's message list]                 │
│                                              │
│  Chief messages:                             │
│    - user questions                          │
│    - Chief responses (conversational)        │
│    - tool use indicators (dimmed)            │
│    - "Sent to Ralph →" action markers        │
│                                              │
│  Ralph messages:                             │
│    - user prompts                            │
│    - status updates (_displayType: status)   │
│    - action echoes (_displayType: action)    │
│    - intent (_displayType: intent)           │
│    - summary (_displayType: summary)         │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Ask me to plan something...              │ │  ← input changes placeholder per tab
│ └──────────────────────────────────────────┘ │
│   Cmd + Enter to send                        │
└─────────────────────────────────────────────┘
```

**Status badge on inactive tab:**
- Ralph idle → no badge
- Ralph running → pulsing dot + iteration count `● [2/20]`
- Ralph complete → green check `✓ DONE`
- Ralph error → red dot `● ERROR`

---

## 3. IMPLEMENTATION PHASES

### Phase 1: Coordinator + Chief Hook (Foundation)

**Goal:** Create the Coordinator class, the useChiefChat hook, and Chief's tool dispatch. No UI changes yet — just the wiring. Can be tested via console or a dev button.

**Files to create:**
- `src/lib/coordinator/index.ts` — Coordinator class
- `src/lib/coordinator/types.ts` — Shared types (RalphStatus, CoordinatorCallbacks)
- `src/lib/chief/prompt.ts` — Chief's system prompt
- `src/lib/chief/tools.ts` — Chief tool definitions + dispatch function
- `src/lib/chief/index.ts` — Barrel exports
- `src/hooks/useChiefChat.ts` — Chief chat hook (mirrors useAIChat structure)
- `src/contexts/CoordinatorContext.tsx` — React context providing Coordinator singleton

**Files to edit:**
- `src/hooks/useAIChat.ts` — Wire Coordinator's `updateRalphStatus()` into existing RalphCallbacks
- `src/contexts/index.ts` — Export CoordinatorContext

**How it works:**
1. `CoordinatorContext` creates a Coordinator instance (receives `fs` from FSContext)
2. `useChiefChat` gets Coordinator from context, calls `chat()` with Chief's prompt + tools
3. Tool calls dispatched inline — `read_file`, `list_files`, `search_skills`, `write_plan`, `send_to_ralph`
4. `send_to_ralph` calls `coordinator.sendToRalph()` which writes `.chief/prompt.md` then triggers Ralph
5. `useAIChat` is updated to: (a) accept tasks from Coordinator, (b) call `coordinator.updateRalphStatus()` in its callbacks
6. Both hooks can read Coordinator's `getRalphStatus()` for cross-tab awareness

**Verification:**
- [ ] Chief can have a multi-turn conversation with tool use
- [ ] Chief can read project files via `read_file` tool
- [ ] Chief can search skills via `search_skills` tool  
- [ ] Chief's `send_to_ralph` writes `.chief/prompt.md` and triggers Ralph
- [ ] Ralph runs normally after receiving prompt from Chief
- [ ] Ralph's status changes propagate through Coordinator

---

### Phase 2: Tab UI

**Goal:** Add the Chief/Ralph tab selector to the chat panel. Each tab renders its own message array. Status badge on the inactive tab shows Ralph's state.

**Files to create:**
- `src/components/chat/ChatTabs.tsx` — Tab selector component (Chief | Ralph)
- `src/components/chat/TabStatusBadge.tsx` — Status badge (dot + text for Ralph state)

**Files to edit:**
- `src/components/chat/ChatPanel.tsx` (or equivalent main chat container) — Add tab state, render ChatTabs at top, conditionally render Chief or Ralph message list based on active tab
- `src/components/chat/ChatInput.tsx` (or equivalent) — Change placeholder text based on active tab ("Ask me to plan something..." vs "Ask me to build something...")

**Tab behavior:**
- Default active tab: Chief (encourage planning-first workflow)
- When `send_to_ralph` fires: auto-switch to Ralph tab
- Badge on inactive Ralph tab reflects Coordinator's `getRalphStatus()`
- Each tab has its own message array (Chief: `useChiefChat.messages`, Ralph: `useAIChat.messages`)
- Chat history persistence: both stored in localStorage, keyed by project + tab (`wiggum-chief-{projectId}`, `wiggum-chat-{projectId}`)

**Verification:**
- [ ] Two tabs render at top of chat panel
- [ ] Clicking tabs switches between Chief and Ralph message lists
- [ ] Each tab has its own input placeholder
- [ ] Status badge on Ralph tab updates in real-time during builds
- [ ] Auto-switch to Ralph tab when Chief sends a prompt
- [ ] Chat history persists per tab per project
- [ ] Sending a message in the Ralph tab directly still works (bypass Chief)

---

### Phase 3: Polish + Cross-Tab Intelligence

**Goal:** Chief becomes aware of Ralph's output. After Ralph completes, Chief can reference what was built, suggest improvements, and handle the "iterate" flow.

**Files to edit:**
- `src/lib/chief/prompt.ts` — Enhance system prompt with post-build awareness
- `src/lib/chief/tools.ts` — Add `check_ralph_status` tool, enhance `read_file` to read `.ralph/summary.md`
- `src/hooks/useChiefChat.ts` — Inject Ralph completion context into Chief's next message
- `src/components/chat/ChatTabs.tsx` — Add notification indicator when Ralph completes while user is in Chief tab

**Post-build flow:**
1. Ralph completes → Coordinator fires `onRalphComplete`
2. If user is in Chief tab, show a subtle notification ("Ralph finished building ✓")
3. User asks Chief "how did it go?" or "what should we change?"
4. Chief reads `.ralph/summary.md` and `.ralph/feedback.md` to understand what happened
5. Chief suggests refinements, user approves, Chief sends updated prompt to Ralph

**Verification:**
- [ ] Chief can read Ralph's summary after a build
- [ ] Notification appears on Chief tab when Ralph completes
- [ ] Chief can suggest iterations based on Ralph's output
- [ ] The iterate loop (Chief → Ralph → Chief → Ralph) works smoothly

---

### Phase 4: Streaming (Optional, Future)

**Goal:** Add streaming to client.ts so Chief's responses feel conversational, not batch-delayed.

**Files to edit:**
- `src/lib/llm/client.ts` — Add `chatStream()` function alongside existing `chat()`
- `src/hooks/useChiefChat.ts` — Use `chatStream()` for Chief (Ralph stays batch — streaming adds complexity to tool dispatch)

**Implementation notes:**
- Chief is conversational — streaming matters for UX
- Ralph is autonomous — batch is fine (tool calls need complete JSON)
- `chatStream()` reads SSE events, yields partial content, handles tool_calls at stream end
- Only Chief uses streaming; Ralph continues with `chat()`

**This phase is explicitly deferred.** Chief works fine with batch responses. Streaming is polish, not function.

---

## 4. FILE CHANGE INDEX

### Phase 1 (Foundation)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/lib/coordinator/index.ts` | CREATE | ~80 |
| `src/lib/coordinator/types.ts` | CREATE | ~30 |
| `src/lib/chief/prompt.ts` | CREATE | ~60 |
| `src/lib/chief/tools.ts` | CREATE | ~120 |
| `src/lib/chief/index.ts` | CREATE | ~10 |
| `src/hooks/useChiefChat.ts` | CREATE | ~200 |
| `src/contexts/CoordinatorContext.tsx` | CREATE | ~40 |
| `src/hooks/useAIChat.ts` | EDIT | ~20 lines changed |
| `src/contexts/index.ts` | EDIT | ~2 lines added |

**Phase 1 total:** 7 creates, 2 edits

### Phase 2 (Tab UI)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/components/chat/ChatTabs.tsx` | CREATE | ~60 |
| `src/components/chat/TabStatusBadge.tsx` | CREATE | ~40 |
| `src/components/chat/ChatPanel.tsx` | EDIT | ~30 lines changed |
| `src/components/chat/ChatInput.tsx` | EDIT | ~10 lines changed |

**Phase 2 total:** 2 creates, 2 edits

### Phase 3 (Polish)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/lib/chief/prompt.ts` | EDIT | ~30 lines added |
| `src/lib/chief/tools.ts` | EDIT | ~40 lines added |
| `src/hooks/useChiefChat.ts` | EDIT | ~30 lines changed |
| `src/components/chat/ChatTabs.tsx` | EDIT | ~15 lines added |

**Phase 3 total:** 0 creates, 4 edits

### Overall

- **Creates:** 9 new files
- **Edits:** 8 files modified
- **Deletes:** 0 (purely additive)
- **Estimated total new code:** ~700 LOC

---

## 5. CC PROMPT STRATEGY

Each prompt describes patterns, concepts, and files to edit — not copied code. Claude Code implements fresh from guidance (clean room approach).

### Prompt 1: Coordinator + Types

```
Create the Coordinator class for Wiggum that manages communication between
Chief (conversational planner) and Ralph (autonomous builder).

Location: src/lib/coordinator/

The Coordinator is a plain TypeScript class (not a hook) that:
- Receives a JSRuntimeFS instance in its constructor
- Provides sendToRalph(prompt, plan?) that writes .chief/prompt.md and
  .chief/plan.md to the filesystem, then sets .chief/status.txt to "ready"
- Tracks Ralph's status via updateRalphStatus(status) and getRalphStatus()
- Supports subscribe(callbacks) for status change notifications, returns
  an unsubscribe function
- Has recoverState() that checks .chief/status.txt and .ralph/status.txt
  to detect interrupted sessions

Types to define in types.ts:
- RalphStatus: { state: 'idle'|'running'|'waiting'|'complete'|'error',
  iteration: number, lastUpdate: number }
- CoordinatorCallbacks: { onRalphStatusChange?, onRalphIteration?,
  onRalphComplete?, onRalphError? }

Also create src/contexts/CoordinatorContext.tsx:
- React context that provides a Coordinator singleton
- CoordinatorProvider takes children, gets fs from useFS()
- Creates Coordinator instance once when fs is ready
- Exports useCoordinator() hook

Export CoordinatorContext from src/contexts/index.ts.

Pattern reference: Look at how FSContext.tsx creates the LightningFSAdapter
and provides it via context. Same pattern but for Coordinator.

DO NOT modify any existing files beyond adding the export to contexts/index.ts.
```

### Prompt 2: Chief Tools + Prompt

```
Create Chief's tool definitions and dispatch system for Wiggum.

Location: src/lib/chief/

Chief is a conversational planner that helps users refine ideas before
sending work to Ralph. Chief has 5 tools, all dispatched inline (no
ShellExecutor needed):

1. read_file(path) — reads a project file via JSRuntimeFS
2. list_files(path, recursive?) — lists directory contents
3. search_skills(query) — searches the skills library for design guidance
4. write_plan(content) — saves plan to .chief/plan.md
5. send_to_ralph(prompt, plan?) — writes prompt to .chief/ and signals
   the Coordinator

Create these files:
- tools.ts: Tool[] definitions (OpenAI function calling format matching
  the Tool type from src/lib/llm/client.ts) and a dispatchChiefTool()
  function that takes a ToolCall + JSRuntimeFS + cwd + Coordinator and
  returns Promise<string>
- prompt.ts: Chief's system prompt as a string constant. Chief is
  conversational (not autonomous), asks clarifying questions one at a time,
  helps with design thinking, and uses send_to_ralph when the user says
  "go" or "build it"
- index.ts: barrel exports

For search_skills: import and use the existing skills search from
src/lib/skills/ (check what's exported from that module's index.ts).
Use the existing search infrastructure, don't rebuild it.

For send_to_ralph: call coordinator.sendToRalph() and return a message
telling the user to switch to the Ralph tab.

Pattern reference: Look at the SHELL_TOOL definition in src/lib/ralph/loop.ts
for the Tool type format. Chief's tools follow the same schema but are
simpler — no shell pipeline, just direct fs calls.

DO NOT modify any existing files.
```

### Prompt 3: useChiefChat Hook

```
Create the useChiefChat hook for Wiggum's Chief conversational planner.

Location: src/hooks/useChiefChat.ts

This hook mirrors the structure of useAIChat.ts but with key differences:
- Chief is conversational (multi-turn with user), not autonomous (no loop)
- Chief uses its own tools (from src/lib/chief/tools.ts), not ShellExecutor
- Chief's tool calls are dispatched inline in a while loop, not via shell
- Chief maintains conversation history across messages (unlike Ralph's
  fresh context per iteration)

The hook should:
1. Get fs from useFS(), provider from useAISettings(), coordinator from
   useCoordinator()
2. Maintain messages: ChiefMessage[] state (similar to AIMessage but with
   _displayType variants for Chief: 'response', 'tool_use', 'plan_sent')
3. sendMessage(content):
   - Build messages array: [system prompt, ...conversation history, user msg]
   - Call chat(provider, messages, CHIEF_TOOLS, signal) from client.ts
   - If response has tool_calls: dispatch each via dispatchChiefTool(),
     add tool results to messages, call chat() again (while loop until
     no more tool_calls or finish_reason is 'stop')
   - If send_to_ralph was called: trigger Ralph via coordinator, set a flag
     so the UI knows to switch tabs
   - Add all messages to state for rendering
4. Persist Chief's messages to localStorage keyed by project:
   wiggum-chief-{projectId}
5. Support cancel (AbortController), clearHistory, and retry (same as
   useAIChat patterns)

Return: { messages, isLoading, error, sendMessage, cancel, clearHistory,
  shouldSwitchToRalph (boolean flag set when send_to_ralph executes),
  clearSwitchFlag }

Pattern reference: Study useAIChat.ts closely for state management,
abort handling, localStorage persistence, error handling. Chief's hook
follows the same patterns but with a simpler execution model (no
runRalphLoop, just a tool dispatch while-loop around chat()).

Also update useAIChat.ts:
- Import useCoordinator
- In the RalphCallbacks wiring, add coordinator.updateRalphStatus() calls:
  - onIterationStart: { state: 'running', iteration }
  - onComplete: { state: 'complete', iteration }
  - onError: { state: 'error' }
- Add ability to accept a task from Coordinator (check .chief/prompt.md
  on sendMessage if the message matches a sentinel like "__FROM_CHIEF__",
  read the prompt from .chief/prompt.md instead)

Actually, simpler approach for Chief → Ralph handoff:
- useChiefChat calls coordinator.sendToRalph() which writes files
- useChiefChat then calls a startRalph callback (passed in from parent)
- The parent component reads the prompt from .chief/prompt.md and calls
  useAIChat.sendMessage() with it
- This keeps both hooks independent — coordination happens at the
  component level

DO NOT modify any files other than creating useChiefChat.ts and editing
useAIChat.ts (only the Coordinator status update wiring).
```

### Prompt 4: Tab UI

```
Add a two-tab UI to Wiggum's chat panel: Chief (conversational planner)
and Ralph (autonomous builder).

The chat panel currently shows a single message list from useAIChat.
Replace this with a tabbed layout:

Create src/components/chat/ChatTabs.tsx:
- Two tabs: "Chief" and "Ralph"
- Positioned at the top of the chat panel, replacing the current header area
- Active tab has a highlighted/bright style, inactive tab is dimmed
- The Ralph tab shows a status badge when Ralph is not idle:
  - Running: pulsing dot + "[iteration/20]"
  - Complete: green check "✓ DONE"
  - Error: red dot "ERROR"
- Use @wiggum/stack Tabs component if one exists, otherwise use simple
  button-based tabs with Tailwind styling
- Props: activeTab, onTabChange, ralphStatus (from Coordinator)

Create src/components/chat/TabStatusBadge.tsx:
- Small component rendering the Ralph status indicator
- Props: status (RalphStatus from Coordinator types)
- Returns null when status.state === 'idle'

Edit the main chat panel component (find it — likely in src/components/
or src/panels/):
- Add tab state: const [activeTab, setActiveTab] = useState<'chief'|'ralph'>('chief')
- Render ChatTabs at top
- When activeTab === 'chief': render Chief messages from useChiefChat
- When activeTab === 'ralph': render Ralph messages from useAIChat
- Both hooks are always mounted (Ralph can run in background while
  user is in Chief tab)
- Wire the input box: sendMessage goes to whichever hook is active
- Change input placeholder: "Ask me to plan something..." (Chief) vs
  "Ask me to build something..." (Ralph)
- When useChiefChat.shouldSwitchToRalph becomes true: setActiveTab('ralph'),
  clear the flag

Get Ralph status from useCoordinator().getRalphStatus() and pass it
to ChatTabs for the badge.

Style notes:
- Tabs should match Wiggum's existing dark theme (refer to existing
  CSS variables in index.css)
- Tab bar background should be slightly different from chat background
  for visual separation
- Active tab: bright text + bottom border accent
- Inactive tab: muted text, no border
- Tab transition should be instant (no animation needed)

Pattern reference: Look at the existing chat panel for styling patterns,
message rendering, and input box implementation. The tab UI wraps this
existing structure — it doesn't replace the message renderer or input.
```

### Prompt 5: Cross-Tab Intelligence (Phase 3)

```
Enhance Chief with post-build awareness so it can reference Ralph's
output and suggest iterations.

Edit src/lib/chief/prompt.ts:
- Add context about Ralph's capabilities and output format
- Add instructions for post-build conversation: when the user asks
  about the build, Chief should read .ralph/summary.md and
  .ralph/feedback.md to understand what happened
- Add guidance for the iterate flow: Chief refines the prompt based
  on what Ralph built, then sends an updated prompt

Edit src/lib/chief/tools.ts:
- Add check_ralph_status tool that reads .ralph/status.txt and
  .ralph/summary.md, returns a formatted status report
- Enhance read_file to handle .ralph/ paths naturally

Edit src/hooks/useChiefChat.ts:
- When Coordinator fires onRalphComplete: inject a system-level
  context message into Chief's conversation that summarizes what
  Ralph built (read .ralph/summary.md). This gives Chief awareness
  without the user having to ask.
- Track a ralphJustCompleted flag for the UI

Edit src/components/chat/ChatTabs.tsx:
- When Ralph completes and user is in Chief tab: show a subtle
  notification banner at the top of Chief's chat ("Ralph finished
  building ✓ — ask me about the results")
- Clicking the notification could auto-send "What did Ralph build?"
  or similar

The goal is a smooth loop:
1. User chats with Chief about what they want
2. Chief refines and sends to Ralph
3. Ralph builds autonomously
4. User returns to Chief: "How did it go? Can we change the header?"
5. Chief reads Ralph's output, suggests specific changes
6. User approves, Chief sends updated prompt to Ralph
7. Repeat until satisfied

Pattern reference: Look at how Ralph's loop reads state from .ralph/
files in state.ts (getRalphState function). Chief reads the same files
but from the outside, as an observer rather than the executor.
```

---

## 6. RISK ASSESSMENT

### Low Risk

| Risk | Mitigation |
|------|-----------|
| Chief's tools fail | Same fs interface as Ralph's shell — if Ralph can read/write, so can Chief |
| Bundle size | ~700 LOC new code, no new dependencies |
| localStorage limits | Chief conversations are lighter than Ralph's (no base64 build output) |
| Test compatibility | Chief is additive — all existing Ralph tests unaffected |

### Medium Risk

| Risk | Mitigation |
|------|-----------|
| Two hooks fighting over the LLM provider | Both use the same provider from useAISettings — but only one should be calling chat() at a time. Add a mutex in Coordinator or disable Chief input while Ralph is running. |
| Chief sends bad prompts to Ralph | Ralph has its own quality gates and validation. Bad prompts just mean more iterations, not crashes. |
| Tab state confusion | Keep clear visual indicators — status badge, different placeholders, auto-switch on send_to_ralph. |
| Conversation history token limits | Chief's multi-turn history grows. Add a sliding window (keep last N messages + system prompt) or summarize older messages. Phase 3 concern. |
| ZenFS migration interaction | Chief uses JSRuntimeFS interface only — same seam that makes ZenFS migration safe for Ralph. Zero conflict. |

### High Risk (but unlikely)

| Risk | Mitigation |
|------|-----------|
| Users confused by two-tab model | Default to Chief tab, make Ralph tab feel like "the build view." If user never touches Chief, Ralph tab works exactly as today. |
| LLM provider rate limits with two callers | Chief is conversational (one call per user message). Ralph is autonomous (many calls per iteration). They shouldn't overlap in practice — Chief sends to Ralph, then waits. |

---

## 7. RELATIONSHIP TO OTHER PLANS

### ZenFS Migration

**No conflicts.** Chief uses `JSRuntimeFS` exclusively. The ZenFS migration replaces the adapter behind that interface. Chief's tools (`read_file`, `list_files`, `write_plan`) all go through `fs.readFile()`, `fs.readdir()`, `fs.writeFile()` — interface methods that survive the migration unchanged.

**Execution order:**
```
1. Chief Phase 1 (Coordinator + hook)     ← uses JSRuntimeFS
2. Chief Phase 2 (Tab UI)                 ← no fs involvement
3. ZenFS Phase 0 (spike)                  ← validates new backend
4. ZenFS Phase 1 (adapter swap)           ← Chief unaffected
5. Chief Phase 3 (cross-tab intelligence) ← still uses JSRuntimeFS
6. ZenFS Phase 2 (kill preview cache)     ← Chief unaffected
```

### Mega Plan

**No conflicts.** The Mega Plan covers skills, themes, shell commands, and preview fixes. Chief is a new layer on top — it reads skills (doesn't modify them), reads project files (doesn't change the shell), and coordinates with Ralph (doesn't touch the preview system).

Chief benefits FROM Mega Plan work:
- Better skills → Chief's `search_skills` returns better guidance
- More shell commands → Ralph executes Chief's prompts more effectively
- Preview fixes → Ralph's output looks better after Chief plans it

### Coordinator → Event Bus Migration (Future)

The Coordinator class is designed as a seam. Today it's direct function calls. When Wiggum needs:
- Multiple agents (Ralph + Reviewer + Deployer)
- Persistent event log (replay builds)
- Cross-tab notifications beyond simple status

...the Coordinator's internals can be swapped to an EventEmitter or even a filesystem-backed event log (`/.events/`) without changing `useChiefChat` or `useAIChat`. Same play as `JSRuntimeFS` enabling the LightningFS → ZenFS swap.

---

## APPENDIX A: .chief/ DIRECTORY STRUCTURE

```
.chief/
├── prompt.md       # The refined prompt sent to Ralph
├── plan.md         # Chief's planning notes (written via write_plan tool)
├── status.txt      # "ready" when prompt is waiting for Ralph, "sent" after
├── context.md      # Optional: accumulated context from conversation
└── history.json    # Optional: compressed conversation turns for recovery
```

All files are managed by Chief's tools and the Coordinator. Ralph reads `.chief/prompt.md` as its task (when initiated via Chief) but never writes to `.chief/`.

---

## APPENDIX B: MESSAGE TYPE TAXONOMY

### Chief Messages

| _displayType | Meaning | Rendering |
|-------------|---------|-----------|
| (none) | Standard conversational response | Normal chat bubble |
| `tool_use` | Chief used a tool (read_file, etc.) | Dimmed, collapsible |
| `plan_sent` | Chief sent prompt to Ralph | Action marker with "→ Ralph" |

### Ralph Messages (existing, unchanged)

| _displayType | Meaning | Rendering |
|-------------|---------|-----------|
| (none) | Standard message | Normal chat bubble |
| `status` | Ralph's reasoning | Dimmed status line |
| `action` | Shell command echo | Monospace, dimmed |
| `intent` | Ralph's opening acknowledgment | Highlighted |
| `summary` | Ralph's closing summary | Highlighted with check |

---

## APPENDIX C: DECISION LOG

| Decision | Options | Chosen | Why |
|----------|---------|--------|-----|
| Coordination | Event bus, direct calls, Zustand | Coordinator class (seam) | Explicit over magic. Direct calls now, bus later. Same pattern as JSRuntimeFS. |
| Chief tool dispatch | ShellExecutor, inline switch | Inline switch | Chief's tools are 5 simple fs calls, not shell pipelines. No need for the full executor. |
| Tab default | Chief, Ralph | Chief | Encourage planning-first workflow. Power users can click Ralph directly. |
| Streaming | Phase 1, Phase 4 | Phase 4 | Ship working Chief first. Batch responses are fine for planning conversations. |
| Two hooks vs one | Unified hook, separate hooks | Separate hooks | Clean separation. Each hook manages its own state, messages, abort. Coordinator bridges them. |
| Ralph trigger | Direct function call, file watcher, polling | Component-level handoff | useChiefChat sets flag → parent reads .chief/prompt.md → calls useAIChat.sendMessage(). Simple, explicit. |
| Status badge | Separate component, inline | Separate TabStatusBadge | Reusable, testable, keeps ChatTabs clean. |
