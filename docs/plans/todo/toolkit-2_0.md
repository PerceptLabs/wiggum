# Wiggum Toolkit 2.0 — Dual-Mode Shell Commands

> Upgrade Wiggum's shell command system so each command can serve as both a shell string command (pipes, chaining, redirects) AND a discrete typed tool in the LLM's tool list. Same command class, two consumers. Zod schemas are the single source of truth. Validate before execute, always.

---

## TABLE OF CONTENTS

1. [Problem](#1-problem)
2. [Architecture](#2-architecture)
3. [The ShellCommand Interface Change](#3-the-shellcommand-interface-change)
4. [Dual-Mode Lifecycle](#4-dual-mode-lifecycle)
5. [The Adapter: toolFromCommand()](#5-the-adapter-toolfromcommand)
6. [Auto-Generated Tool Descriptions](#6-auto-generated-tool-descriptions)
7. [Shell Path: String → Typed → Execute](#7-shell-path-string--typed--execute)
8. [Structured Error Responses](#8-structured-error-responses)
9. [Which Commands Get Promoted](#9-which-commands-get-promoted)
10. [Tool Registration in the LLM Client](#10-tool-registration-in-the-llm-client)
11. [Implementation Phases](#11-implementation-phases)
12. [File Change Index](#12-file-change-index)
13. [Migration Guide per Command](#13-migration-guide-per-command)
14. [Risks & Mitigations](#14-risks--mitigations)

---

## 1. PROBLEM

### Current State

Ralph has one tool: `shell`. Its description is a hand-maintained ~3KB text blob listing all 38 commands. The LLM free-texts a command string into a single `{ command: string }` field. There is no schema validation — if the model sends bad flags, wrong argument order, or misspells a subcommand, the error is an ad-hoc English string the model has to parse to recover.

Wiggum-specific commands (theme, preview, grep's semantic modes) are invisible to the model unless the description blob happens to mention them. The blob is maintained manually and drifts.

### What We Want

Each command class that benefits from it gets a Zod schema. That schema:
- Auto-generates the command's section in the shell tool description
- Generates a discrete typed tool entry in the LLM's tool list
- Validates arguments **before** `execute()` on both the shell path and the discrete tool path
- Produces structured JSON errors with schema details, usage, and examples when validation fails

The model sees both `shell` (for pipes/chaining/redirects) and discrete named tools (for direct typed calls). Same underlying command class serves both. No code duplication.

---

## 2. ARCHITECTURE

### Single Source of Truth

```
src/lib/shell/commands/grep.ts     ← one class, one schema
         ↓                    ↓
    ShellExecutor           toolFromCommand(grep)
    (string path)           (discrete tool path)
    "grep -rn foo src/"    { pattern: "foo", path: "src/", flags: {r:true,n:true} }
         ↓                    ↓
    argsToObject()          already typed
         ↓                    ↓
    Zod safeParse()         Zod parse()
         ↓                    ↓
    execute(typedArgs)      execute(typedArgs)
```

Both paths converge on `execute(typed)`. The command class never touches raw `string[]` — that parsing happens upstream in the shell executor or adapter.

### What the LLM Sees

```
tools: [
  { name: "shell",   params: { command: string } },         ← catch-all, pipes, chaining
  { name: "grep",    params: { pattern, path?, include? } }, ← typed, for direct calls
  { name: "write",   params: { path, content } },            ← typed
  { name: "theme",   params: { preset?, mood?, apply? } },   ← typed
  { name: "replace", params: { file, old, new } },           ← typed
  { name: "preview", params: { action } },                   ← typed
  { name: "build",   params: {} },                           ← typed
  ...etc (8-12 promoted commands)
]
```

The model picks whichever surface fits. Straightforward grep? Use the discrete `grep` tool. `cat file | grep pattern | head -5`? Use `shell`. Both route to the same GrepCommand class.

---

## 3. THE SHELLCOMMAND INTERFACE CHANGE

### Current Interface

Find this in `src/lib/shell/commands/` — the base interface that all 38 commands implement.

```typescript
// CURRENT — conceptual shape (read actual file for exact signature)
interface ShellCommand {
  name: string;
  description: string;
  usage: string;
  isEasterEgg?: boolean;
  execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult>;
}
```

### New Interface

```typescript
import { z } from 'zod';

interface ShellCommand<T = string[]> {
  name: string;
  description: string;
  usage: string;
  isEasterEgg?: boolean;

  // NEW — optional Zod schema for typed arguments
  argsSchema?: z.ZodType<T>;

  // NEW — examples for LLM guidance (shown in auto-generated descriptions)
  examples?: string[];

  // CHANGED — typed args instead of string[]
  // For commands WITH argsSchema: T is the schema's inferred type
  // For commands WITHOUT argsSchema: T defaults to string[] (backward compatible)
  execute(args: T, cwd: string, input?: string): Promise<ShellCommandResult>;
}
```

**Backward compatibility:** The generic defaults to `string[]`. Commands without `argsSchema` keep their existing `execute(args: string[], ...)` signature unchanged. Only commands that add a schema change their execute signature to accept the typed object.

### ShellCommandResult — No Change

```typescript
interface ShellCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  newCwd?: string;  // for cd
}
```

Keep the existing `createSuccessResult()` and `createErrorResult()` helpers.

---

## 4. DUAL-MODE LIFECYCLE

### Path A: Shell (string command)

```
1. LLM emits:  { tool: "shell", args: { command: "grep -rn \"useState\" src/" } }
2. ShellExecutor receives command string
3. parseCompoundCommand() — check for &&, ||, |, ;
4. For each segment: parseCommand() → { name: "grep", rawArgs: ["-rn", "useState", "src/"] }
5. commands.get("grep") → GrepCommand instance
6. IF cmd.argsSchema exists:
     a. argsToObject("grep", rawArgs) → { mode: "regex", pattern: "useState", files: ["src/"], flags: { r: true, n: true } }
     b. cmd.argsSchema.safeParse(parsed)
     c. IF fail → return structured error (see §8)
     d. IF pass → cmd.execute(parsed, cwd, pipeInput)
7. IF no argsSchema:
     a. cmd.execute(rawArgs, cwd, pipeInput)   ← legacy path, unchanged
```

### Path B: Discrete tool (typed object)

```
1. LLM emits:  { tool: "grep", args: { pattern: "useState", path: "src/", include: "*.{ts,tsx}" } }
2. toolFromCommand adapter receives typed args
3. cmd.argsSchema.parse(args)  ← Zod validates (throws on failure)
4. cmd.execute(validatedArgs, cwd)
5. Return { content: result.stdout || result.stderr }
```

### Path C: Shell, piped (string command with pipe)

```
1. LLM emits:  { tool: "shell", args: { command: "cat README.md | grep -i todo" } }
2. ShellExecutor detects pipe
3. Runs "cat README.md" → stdout
4. Passes stdout as `input` to grep:
     a. argsToObject("grep", ["-i", "todo"]) → { mode: "regex", pattern: "todo", flags: { i: true } }
     b. safeParse → pass
     c. GrepCommand.execute({ mode: "regex", pattern: "todo", flags: { i: true } }, cwd, catOutput)
5. Pipe input still works — the typed execute() receives it as the third parameter
```

---

## 5. THE ADAPTER: toolFromCommand()

Create a new file: `src/lib/shell/tool-adapter.ts`

This function takes a ShellCommand that has an `argsSchema` and produces a tool definition object compatible with the OpenAI function-calling format used by `client.ts`.

### Concept

```typescript
// src/lib/shell/tool-adapter.ts

import { z } from 'zod';
// Import the Tool type shape from wherever SHELL_TOOL is currently defined
// (likely src/lib/ralph/loop.ts — check actual location)

/**
 * Convert a schema-enabled ShellCommand into a discrete LLM tool definition.
 *
 * The returned object has:
 * - type/function/name/description/parameters for the LLM tool list
 * - an execute() function that validates via Zod then delegates to the command
 */
function toolFromCommand(
  cmd: ShellCommand<any>,
  cwd: string
): { definition: ToolDefinition; execute: (args: unknown) => Promise<string> } {

  if (!cmd.argsSchema) {
    throw new Error(`Cannot create discrete tool from ${cmd.name}: no argsSchema`);
  }

  // Build the tool definition for the LLM
  const definition = {
    type: 'function' as const,
    function: {
      name: cmd.name,
      description: buildToolDescription(cmd),
      parameters: zodToJsonSchema(cmd.argsSchema),
    }
  };

  // Build the executor
  const execute = async (rawArgs: unknown): Promise<string> => {
    const validated = cmd.argsSchema!.parse(rawArgs);  // throws ZodError on failure
    const result = await cmd.execute(validated, cwd);
    if (result.exitCode !== 0 && result.stderr) {
      return `Error (exit ${result.exitCode}): ${result.stderr}`;
    }
    return result.stdout;
  };

  return { definition, execute };
}
```

### zodToJsonSchema()

Zod v4 has built-in `.toJSONSchema()`. If Wiggum is on Zod v3, use the `zod-to-json-schema` npm package. Check which Zod version is in `package.json`.

**If Zod v4 (zod@^4.0.0):**
```typescript
const jsonSchema = cmd.argsSchema.toJSONSchema();
```

**If Zod v3:**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
const jsonSchema = zodToJsonSchema(cmd.argsSchema, { target: 'openApi3' });
```

Either way, the output is a JSON Schema object that goes directly into the `parameters` field of the OpenAI tool definition.

### buildToolDescription()

```typescript
function buildToolDescription(cmd: ShellCommand<any>): string {
  let desc = cmd.description;

  if (cmd.examples?.length) {
    desc += '\n\nExamples:\n' + cmd.examples.map(e => `  ${e}`).join('\n');
  }

  return desc;
}
```

---

## 6. AUTO-GENERATED TOOL DESCRIPTIONS

### The Shell Tool Description Problem

Currently the SHELL_TOOL has a giant hand-written description string. This drifts. The fix: auto-generate it from the command registry.

### Where To Change

Find where SHELL_TOOL is defined (likely `src/lib/ralph/loop.ts`). The description string that lists all available commands should be generated at tool-construction time from the registered commands.

### Pattern

```typescript
function buildShellDescription(commands: Map<string, ShellCommand>): string {
  const header = 'Execute shell commands. Supports piping (|), chaining (&&, ||, ;), and redirects (>, >>).\n\nAvailable commands:\n';

  const commandDocs = [...commands.values()]
    .filter(c => !c.isEasterEgg)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(cmd => {
      let doc = `- **${cmd.name}**: ${cmd.description}`;
      doc += `\n  Usage: \`${cmd.usage}\``;

      // If command has schema, show parameter info
      if (cmd.argsSchema) {
        const schema = zodToJsonSchema(cmd.argsSchema);
        if (schema.properties) {
          const params = Object.entries(schema.properties)
            .map(([key, val]: [string, any]) => `${key}: ${val.type || 'any'}`)
            .join(', ');
          doc += `\n  Parameters: ${params}`;
        }
      }

      if (cmd.examples?.length) {
        doc += `\n  Examples: ${cmd.examples.map(e => `\`${e}\``).join(', ')}`;
      }

      return doc;
    })
    .join('\n');

  return header + commandDocs;
}
```

This replaces the hand-maintained description blob. Add a command → it appears. Change a schema → description updates. Remove a command → it disappears.

**Important:** The auto-generated description should still be concise enough for the system prompt. If it balloons past ~4KB, consider only including schema'd (promoted) commands in detail and listing non-schema commands as a simple comma-separated list: `Also available: date, env, whoami, which, true, false, clear, stat`.

---

## 7. SHELL PATH: STRING → TYPED → EXECUTE

### argsToObject() — The Bridge Function

This is the critical new function that converts parsed CLI arguments (`string[]`) into the typed object the schema expects. It lives in the ShellExecutor or in a shared utility.

**This function needs to be written per-command or use a convention-based approach.** Two options:

#### Option A: Per-command parser (recommended for phase 1)

Each schema'd command also provides a `parseArgs` static method:

```typescript
class GrepCommand implements ShellCommand<GrepArgs> {
  // ...schema, description, etc...

  /**
   * Convert raw CLI args to the typed shape the schema expects.
   * Called by ShellExecutor before validation.
   */
  static parseCliArgs(args: string[]): unknown {
    // First arg might be a mode keyword
    if (args[0] === 'skill' || args[0] === 'code' || args[0] === 'package') {
      return { mode: args[0], query: args.slice(1).join(' ') };
    }

    // Otherwise it's regex mode — parse flags
    const flags: Record<string, boolean> = {};
    const positional: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('-') && arg !== '-') {
        for (const char of arg.slice(1)) {
          flags[char] = true;
        }
      } else {
        positional.push(arg);
      }
    }

    return {
      mode: 'regex',
      pattern: positional[0] ?? '',
      files: positional.slice(1),
      flags,
    };
  }
}
```

Then in ShellExecutor:

```typescript
// After parseCommand() gives us { name, rawArgs }
const cmd = this.commands.get(name);

if (cmd.argsSchema) {
  // Use the command's own CLI parser if it exists
  const parsed = cmd.parseCliArgs
    ? cmd.parseCliArgs(rawArgs)
    : rawArgs;  // fallback: pass string[] directly

  const result = cmd.argsSchema.safeParse(parsed);
  if (!result.success) {
    return structuredError(cmd, result.error);
  }
  return cmd.execute(result.data, cwd, pipeInput);
} else {
  // Legacy path — no schema, pass string[] directly
  return cmd.execute(rawArgs, cwd, pipeInput);
}
```

#### Option B: Convention-based parser (future optimization)

A generic `cliToObject(schema, args)` that reads the Zod schema shape and maps positional args + flags automatically. More complex to build, but eliminates per-command `parseCliArgs`. Do this in a later phase if the per-command approach creates too much boilerplate.

### Method Signature on ShellCommand

Add an optional static-like method to the interface:

```typescript
interface ShellCommand<T = string[]> {
  // ...existing fields...

  // Optional: convert raw CLI args to the typed shape
  // If absent and argsSchema exists, ShellExecutor passes string[] to safeParse
  parseCliArgs?(args: string[]): unknown;
}
```

---

## 8. STRUCTURED ERROR RESPONSES

When Zod validation fails, return a structured JSON error the model can parse and recover from.

### Error Shape

```typescript
function structuredError(cmd: ShellCommand<any>, zodError: z.ZodError): ShellCommandResult {
  const errorPayload = {
    error: 'invalid_arguments',
    command: cmd.name,
    issues: zodError.issues.map(i => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message,
    })),
    usage: cmd.usage,
    examples: cmd.examples ?? [],
  };

  return {
    exitCode: 1,
    stdout: '',
    stderr: JSON.stringify(errorPayload, null, 2),
  };
}
```

### Why This Matters

Current error for bad grep args: `"grep: missing pattern\nUsage: grep [-i] [-n] [-r] pattern [file...]"`

New error:
```json
{
  "error": "invalid_arguments",
  "command": "grep",
  "issues": [
    { "path": "pattern", "code": "invalid_type", "message": "Required" }
  ],
  "usage": "grep [-i] [-n] [-r] <pattern> <file> | grep skill <query> | grep code <query>",
  "examples": ["grep -rn \"useState\" src/", "grep skill \"form validation\""]
}
```

The model gets the schema violation, the correct usage, and working examples in one structured response. Recovery is deterministic, not "parse this English sentence."

---

## 9. WHICH COMMANDS GET PROMOTED

Not all 38 commands need discrete tool entries. The criteria for promotion:

### Promote (8-12 commands)

Commands where typed fields meaningfully help the model:

| Command | Why Promote | Discrete Tool Schema |
|---------|-------------|---------------------|
| **grep** | 3 modes (regex/skill/code/package) invisible in string form | `{ mode, pattern/query, path?, include?, flags? }` |
| **replace** | Exact string matching, easy to get wrong | `{ file, old, new, wholeWord?, whitespace? }` |
| **theme** | Wiggum-specific, complex subcommands | `{ subcommand: 'preset'/'generate', preset?, mood?, apply? }` |
| **preview** | Wiggum-specific, action-based | `{ action: 'start'/'stop'/'status' }` |
| **write** (cat > heredoc) | File creation is the #1 operation | `{ path, content }` |
| **build** | Simple trigger, but typed signals intent | `{}` or `{ clean? }` |
| **git** | Complex subcommands benefit from typing | `{ subcommand, args... }` |
| **find** | Path + pattern combo easy to mis-order | `{ path?, name?, type? }` |
| **sed** | Regex replacement, fragile as string | `{ file, pattern, replacement, flags?, whitespace? }` |
| **awk** | Field-based processing, conditions + formatted output in one pass | `{ program, files?, fieldSeparator? }` |

### Do NOT Promote (shell-only)

Commands where string args are fine or the command is too simple:

`cat, echo, touch, mkdir, rm, rmdir, cp, mv, ls, pwd, tree, head, tail, wc, sort, uniq, diff, cut, tr, tac, basename, dirname, paths, date, env, whoami, which, true, false, clear, stat, console`

These stay as shell-only commands. No schema needed. They appear in the shell description as a simple list: `Also available via shell: cat, ls, pwd, ...`

### Progressive Adoption

Phase 1 ships with 3-4 promoted commands (grep, replace, theme, preview). Remaining promotions happen incrementally. Each promotion is self-contained — add schema + parseCliArgs to the command class, it automatically appears as both a shell command and a discrete tool.

---

## 10. TOOL REGISTRATION IN THE LLM CLIENT

### Current State

Find where SHELL_TOOL is defined and passed to `chat()` — likely in `src/lib/ralph/loop.ts` or `src/hooks/useAIChat.ts`. Currently it's a single tool definition object.

### New State

The tool list becomes: shell tool (auto-generated description) + N discrete tools (from promoted commands).

**Where to build the tool list:**

```typescript
// Conceptual — adapt to actual file structure

function buildRalphTools(
  executor: ShellExecutor,
  cwd: string
): { definitions: ToolDefinition[]; dispatch: (name: string, args: unknown) => Promise<string> } {

  const tools: ToolDefinition[] = [];
  const dispatchers = new Map<string, (args: unknown) => Promise<string>>();

  // 1. Shell tool — always present
  const shellDef = {
    type: 'function' as const,
    function: {
      name: 'shell',
      description: buildShellDescription(executor.commands),
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command'],
      },
    },
  };
  tools.push(shellDef);
  dispatchers.set('shell', async (args: any) => {
    const result = await executor.execute(args.command);
    return result.stdout || result.stderr;
  });

  // 2. Discrete tools — from schema'd commands
  for (const cmd of executor.commands.values()) {
    if (cmd.argsSchema && !cmd.isEasterEgg) {
      const { definition, execute } = toolFromCommand(cmd, cwd);
      tools.push(definition);
      dispatchers.set(cmd.name, execute);
    }
  }

  // Unified dispatcher
  const dispatch = async (name: string, args: unknown): Promise<string> => {
    const handler = dispatchers.get(name);
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    return handler(args);
  };

  return { definitions: tools, dispatch };
}
```

### Integration with Ralph Loop

In `loop.ts` (or wherever `runRalphLoop` builds the tool list), replace the single SHELL_TOOL with the output of `buildRalphTools()`. The tool dispatch in the iteration loop uses `dispatch(toolName, parsedArgs)` instead of the current single-tool assumption.

**Key change in the loop:** Currently the loop assumes every tool call is a shell command. After this change, it needs to route by tool name:

```typescript
// BEFORE (conceptual)
for (const toolCall of response.tool_calls) {
  const result = await executor.execute(toolCall.function.arguments.command);
}

// AFTER (conceptual)
for (const toolCall of response.tool_calls) {
  const args = JSON.parse(toolCall.function.arguments);
  const result = await dispatch(toolCall.function.name, args);
}
```

The dispatch function handles both shell (routes through executor) and discrete tools (routes through toolFromCommand executors).

---

## 11. IMPLEMENTATION PHASES

### Phase 0: Add Zod (if not already present)

Check if `zod` is in `apps/ide/package.json`. If not, add it.
Also check if `zod-to-json-schema` is needed (Zod v3) or if `.toJSONSchema()` is available (Zod v4).

### Phase 1: Interface + Infrastructure (no command changes yet)

**Goal:** Add the new fields to ShellCommand, create the adapter, wire up the dual-mode dispatch. All existing commands continue working unchanged.

1. **Update ShellCommand interface** — add optional `argsSchema`, `examples`, `parseCliArgs` fields. Generic defaults to `string[]`.
2. **Create `src/lib/shell/tool-adapter.ts`** — `toolFromCommand()`, `buildToolDescription()`, `zodToJsonSchema()` wrapper
3. **Create `src/lib/shell/structured-errors.ts`** — `structuredError()` function
4. **Update ShellExecutor.execute()** — add the schema validation branch (§7). If command has `argsSchema` + `parseCliArgs`, use them. Otherwise fall through to legacy `string[]` path.
5. **Create `src/lib/ralph/tool-builder.ts`** — `buildRalphTools()` function that generates the combined tool list
6. **Update `buildShellDescription()`** — auto-generate from command registry instead of hand-written blob
7. **Update Ralph loop tool dispatch** — route by tool name, not single-tool assumption

**Verification:** All existing tests pass. Shell commands work as before. Tool list now shows shell + zero discrete tools (no commands have schemas yet).

### Phase 2: First Promoted Commands (3-4 commands)

**Goal:** Add schemas to grep, replace, theme, and preview. These become the first commands available as both shell commands and discrete tools.

For each command:
1. Define `argsSchema` as a Zod schema
2. Add `examples` array
3. Add `parseCliArgs()` method
4. Change `execute()` signature from `string[]` to the schema's type
5. Move the manual flag-parsing logic from `execute()` into `parseCliArgs()` (or remove it — the typed args already have the flags parsed)
6. Write tests for both paths (shell string invocation and discrete tool invocation)

**Start with grep** — it's the most complex (3 semantic modes) and benefits most from typed schema.

### Phase 3: Remaining Promotions

Add schemas to: write (file creation), build, git, find, sed, awk. Same pattern as Phase 2. Note: `awk` is a new command (not a migration) — create `src/lib/shell/commands/awk.ts` and register in executor.

### Phase 4: Remove Hand-Written Description

Once auto-generation is stable, delete the hand-written SHELL_TOOL description blob. The auto-generated version is now the single source of truth.

---

## 12. FILE CHANGE INDEX

### New Files

| File | Purpose |
|------|---------|
| `src/lib/shell/tool-adapter.ts` | `toolFromCommand()`, `buildToolDescription()`, JSON Schema conversion |
| `src/lib/shell/structured-errors.ts` | `structuredError()` for Zod validation failures |
| `src/lib/ralph/tool-builder.ts` | `buildRalphTools()` — generates combined tool list from command registry |
| `src/lib/shell/commands/awk.ts` | Field-based text processing: column extraction, conditionals, aggregation (subset of POSIX awk) |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/shell/commands/index.ts` (or wherever ShellCommand interface lives) | Add `argsSchema?`, `examples?`, `parseCliArgs?` to interface. Add generic `<T>`. |
| `src/lib/shell/executor.ts` | Add schema validation branch in execute path. Call `parseCliArgs()` + `safeParse()` before `cmd.execute()` for schema'd commands. |
| `src/lib/ralph/loop.ts` | Replace single SHELL_TOOL with `buildRalphTools()` output. Update tool dispatch to route by name. |
| `src/hooks/useAIChat.ts` | If tool dispatch happens here rather than in loop.ts, update the dispatch logic here instead. Check which file actually dispatches tool calls. |
| `src/lib/shell/commands/grep.ts` | Add `argsSchema`, `examples`, `parseCliArgs()`. Change `execute()` to accept typed `GrepArgs`. |
| `src/lib/shell/commands/replace.ts` | Same pattern as grep. |
| `src/lib/shell/commands/theme.ts` | Same pattern as grep. |
| `src/lib/shell/commands/preview.ts` | Same pattern as grep. |
| `src/lib/shell/commands/awk.ts` | **NEW** command. Create with `argsSchema`, `examples`, `parseCliArgs()`, `execute()`. Register in executor. |

### Files NOT Changed

All non-promoted commands (cat, ls, echo, etc.) — these keep `execute(args: string[], ...)` unchanged. The generic default handles them.

---

## 13. MIGRATION GUIDE PER COMMAND

### Example: Migrating GrepCommand

**Before:**
```typescript
class GrepCommand implements ShellCommand {
  name = 'grep';
  description = 'Search for patterns in files';
  usage = 'grep [-i] [-n] [-r] pattern [file...]';

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    // Manual flag parsing inside execute()
    const { options, pattern, files } = this.parseArgs(args);
    // ... regex matching logic ...
  }

  private parseArgs(args: string[]) {
    // hand-rolled flag parser for -i, -n, -r
  }
}
```

**After:**
```typescript
// Define the typed args shape
interface GrepArgs {
  mode: 'regex' | 'skill' | 'code' | 'package';
  // regex mode
  pattern?: string;
  files?: string[];
  flags?: { i?: boolean; n?: boolean; r?: boolean };
  // semantic modes
  query?: string;
}

class GrepCommand implements ShellCommand<GrepArgs> {
  name = 'grep';
  description = 'Search for patterns in files. Supports regex, skill search (Orama), code search, and package search.';
  usage = 'grep [-i] [-n] [-r] <pattern> [file...] | grep skill <query> | grep code <query> | grep package <query>';

  argsSchema = z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('regex'),
      pattern: z.string().min(1),
      files: z.array(z.string()).optional(),
      flags: z.object({
        i: z.boolean().optional(),
        n: z.boolean().optional(),
        r: z.boolean().optional(),
      }).optional(),
    }),
    z.object({
      mode: z.literal('skill'),
      query: z.string().min(1),
    }),
    z.object({
      mode: z.literal('code'),
      query: z.string().min(1),
    }),
    z.object({
      mode: z.literal('package'),
      query: z.string().min(1),
    }),
  ]);

  examples = [
    'grep -rn "useState" src/',
    'grep skill "form validation"',
    'grep code "authentication"',
    'grep package "drag and drop"',
  ];

  // Convert raw CLI args to typed shape
  parseCliArgs(args: string[]): unknown {
    // Check for semantic mode keywords
    const modeKeywords = ['skill', 'code', 'package'];
    if (args.length > 0 && modeKeywords.includes(args[0])) {
      return { mode: args[0], query: args.slice(1).join(' ').replace(/^["']|["']$/g, '') };
    }

    // Regex mode — parse flags
    const flags: Record<string, boolean> = {};
    const positional: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('-') && arg !== '-') {
        for (const char of arg.slice(1)) {
          flags[char] = true;
        }
      } else {
        positional.push(arg);
      }
    }

    return {
      mode: 'regex',
      pattern: positional[0] ?? '',
      files: positional.slice(1),
      flags,
    };
  }

  // Now receives typed, validated args
  async execute(args: GrepArgs, cwd: string, input?: string): Promise<ShellCommandResult> {
    switch (args.mode) {
      case 'skill':
        return this.searchSkills(args.query!);
      case 'code':
        return this.searchCode(args.query!, cwd);
      case 'package':
        return this.searchPackages(args.query!);
      case 'regex':
        return this.searchRegex(args.pattern!, args.files, args.flags, cwd, input);
    }
  }

  // Private methods for each mode — same logic as before, just cleaner dispatch
  private async searchRegex(pattern: string, files: string[] | undefined, flags: GrepArgs['flags'], cwd: string, input?: string) {
    const ignoreCase = flags?.i ?? false;
    const showLineNumbers = flags?.n ?? false;
    const recursive = flags?.r ?? false;
    // ... existing regex matching logic ...
  }

  private async searchSkills(query: string) { /* existing Orama search */ }
  private async searchCode(query: string, cwd: string) { /* existing code search */ }
  private async searchPackages(query: string) { /* existing package search */ }
}
```

**What changed:**
- `argsSchema` added — Zod discriminated union for the 4 modes
- `examples` added — shown in auto-generated descriptions
- `parseCliArgs()` added — converts `string[]` → typed object (moved from the old private `parseArgs`)
- `execute()` now receives `GrepArgs` not `string[]` — no manual flag parsing inside execute
- The old `this.parseArgs()` private method is deleted — its logic moved to `parseCliArgs()`

### Pattern for Simpler Commands

Most commands are simpler than grep. Example for `preview`:

```typescript
interface PreviewArgs {
  action: 'start' | 'stop' | 'status';
}

class PreviewCommand implements ShellCommand<PreviewArgs> {
  name = 'preview';
  description = 'Build the project and capture a rendered DOM snapshot';
  usage = 'preview [start|stop|status]';

  argsSchema = z.object({
    action: z.enum(['start', 'stop', 'status']).default('start'),
  });

  examples = ['preview', 'preview start', 'preview status'];

  parseCliArgs(args: string[]): unknown {
    return { action: args[0] ?? 'start' };
  }

  async execute(args: PreviewArgs, cwd: string): Promise<ShellCommandResult> {
    switch (args.action) {
      case 'start': return this.buildAndCapture(cwd);
      case 'stop': return this.stopPreview();
      case 'status': return this.getStatus();
    }
  }
}
```

### Pattern for New Commands (awk)

New commands that don't exist yet follow the same pattern — just skip the "before" migration. `awk` is a good example because it's a new command with moderate complexity: field splitting, conditions, and formatted output.

**Scope:** Implement the subset of POSIX awk that covers Ralph's actual usage. NOT a full awk interpreter.

**Supported features:**
- Field splitting: `$0` (whole line), `$1`-`$NF` (fields), `NF` (field count), `NR` (record number)
- Field separator: `-F` flag (default: whitespace)
- Pattern matching: `/regex/` before action block
- BEGIN/END blocks: `BEGIN { ... }` and `END { ... }`
- Print: `print` and `printf` with field references
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `+=` on numeric fields
- String concatenation: adjacent values concatenate
- Variables: user-defined variables, no declaration needed
- Conditions: `if`/`else` within action blocks
- Comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`, `~` (regex match)

**NOT supported (too complex, Ralph doesn't need):**
- Associative arrays
- User-defined functions
- `getline`, `system()`, `pipe`
- Multiple file handling (`FILENAME`, `FNR`)
- Coprocess (`|&`)

**Implementation:**

```typescript
interface AwkArgs {
  program: string;           // the awk program string
  files?: string[];          // input files (or reads from stdin/pipe)
  fieldSeparator?: string;   // -F flag, defaults to whitespace splitting
}

class AwkCommand implements ShellCommand<AwkArgs> {
  name = 'awk';
  description = 'Field-based text processing. Extract columns, filter rows, compute aggregates.';
  usage = "awk [-F sep] 'program' [file...]";

  argsSchema = z.object({
    program: z.string().min(1, 'awk program is required'),
    files: z.array(z.string()).optional(),
    fieldSeparator: z.string().optional(),
  });

  examples = [
    "awk '{print $2, $4}' data.txt",
    "awk -F',' '{print $1 \": \" $3}' file.csv",
    "awk '/error/ {print NR, $0}' log.txt",
    "awk '{sum += $3} END {print \"Total:\", sum}' values.txt",
    "awk -F':' '$3 > 100 {print $1, $3}' records.txt",
  ];

  parseCliArgs(args: string[]): unknown {
    let fieldSeparator: string | undefined;
    const positional: string[] = [];

    let i = 0;
    while (i < args.length) {
      if (args[i] === '-F' && i + 1 < args.length) {
        fieldSeparator = args[i + 1];
        i += 2;
      } else if (args[i].startsWith('-F')) {
        fieldSeparator = args[i].slice(2);
        i += 1;
      } else {
        positional.push(args[i]);
        i += 1;
      }
    }

    // First positional is the program, rest are files
    return {
      program: positional[0] ?? '',
      files: positional.length > 1 ? positional.slice(1) : undefined,
      fieldSeparator,
    };
  }

  async execute(args: AwkArgs, cwd: string, input?: string): Promise<ShellCommandResult> {
    // 1. Parse the awk program into: BEGIN block, pattern/action pairs, END block
    // 2. Get input lines from files or pipe input
    // 3. Run BEGIN block
    // 4. For each line: split into fields, check patterns, execute matching actions
    // 5. Run END block
    // 6. Return collected output

    // Implementation: ~200-300 LOC for the parser + evaluator
    // Key: field splitting, variable env, print formatting, arithmetic eval
    // Use a simple recursive descent parser for the program string
  }
}
```

**What Ralph uses awk for:**
- Build output parsing: `awk '/error|warning/ {print NR ": " $0}' build.log`
- CSS variable inventory: `awk -F':' '/--/ {print $1}' src/index.css`
- Component prop counting: `awk '/props\./ {count++} END {print count}' Component.tsx`
- CSV/TSV data extraction: `awk -F',' '{print $1, $3}' data.csv`
- Pipe integration: `grep "import" src/*.tsx | awk '{print $2}' | sort | uniq`

**Where it replaces multi-command pipes:**
- Before: `grep "color" index.css | cut -d':' -f1 | tr -d ' ' | sort`
- After: `awk -F':' '/color/ {gsub(/ /, "", $1); print $1}' index.css | sort`

One pass instead of four commands. Less shell escaping, fewer pipe failure points.

---

## 14. RISKS & MITIGATIONS

### Risk: Too Many Tools Confuse Weaker Models

Some smaller models perform worse with 15+ tools. Shakespeare runs 24+ across many models and it works, but Wiggum targets an even wider range.

**Mitigation:** Start with 3-4 promoted commands in Phase 2. Measure model performance before promoting more. The shell catch-all means models that ignore discrete tools still work.

### Risk: argsToObject Parsing Complexity

Converting CLI strings to typed objects is inherently fuzzy. Edge cases with quoted strings, escaped characters, etc.

**Mitigation:** Use per-command `parseCliArgs()` rather than a generic parser. Each command knows its own argument structure. Phase 1 keeps the legacy `string[]` path as fallback — if parseCliArgs doesn't exist, skip validation.

### Risk: Zod Bundle Size

Zod adds ~50KB to the bundle (minified).

**Mitigation:** Zod is already likely needed for other features (Hono full-stack plan uses `@hono/zod-validator`). Check if it's already in the dependency tree. If not, the 50KB is justified by the validation + schema generation it provides.

### Risk: Breaking Existing Shell Pipe Behavior

Pipes pass stdout as the `input` parameter. The new typed execute must still accept pipe input.

**Mitigation:** The `input?: string` parameter stays on the execute signature. Typed args + pipe input are orthogonal — args describe what to search for, input is what to search in.

### Risk: Description Size Bloat

Auto-generated descriptions with schemas could exceed useful length.

**Mitigation:** Only promoted commands get detailed entries in the shell description. Non-promoted commands appear as a simple list. Set a character budget (~4KB) and enforce it in `buildShellDescription()`.

---

## APPENDIX: CLEAN ROOM NOTES

This document describes **architectural patterns and concepts only**. No code has been copied from AGPL-licensed projects. The patterns described (Zod schemas for tool validation, adapter functions for dual-mode dispatch, auto-generated descriptions from registries) are common industry practices. Implementation should be written fresh against Wiggum's existing codebase.

Key references for CC:
- Wiggum's existing ShellCommand interface → `src/lib/shell/commands/` (read the actual interface file)
- Wiggum's existing ShellExecutor → `src/lib/shell/executor.ts` (read the actual execute flow)
- Wiggum's existing SHELL_TOOL definition → `src/lib/ralph/loop.ts` (read where tools are defined)
- Wiggum's existing tool dispatch → `src/hooks/useAIChat.ts` or `src/lib/ralph/loop.ts` (read where tool_calls are handled)
- Zod documentation → https://zod.dev (for schema definition patterns)
