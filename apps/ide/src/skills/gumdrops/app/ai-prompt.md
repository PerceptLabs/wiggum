---
name: ai-prompt
domain: app
intent: AI chat input with attachments, settings, and model selection
complexity: advanced
components: Textarea, Button, DropdownMenu, Badge, Switch, Dialog
---

# AI Prompt Interface

## Recipe
**Core:** Textarea (auto-growing) + Button (send, disabled when empty) +
DropdownMenu (attachments/settings)

**Auto-grow textarea:**
onInput: textarea.style.height = 'auto'; textarea.style.height = scrollHeight + 'px'

**Submit logic:** Enter to submit, Shift+Enter for newline

**Hidden file input:** input[type=file] with display:none, triggered via ref on
DropdownMenuItem click

## Variants
- **centered**: Textarea + send Button. Clean, minimal.
- **with-attachments**: + DropdownMenu for file upload, search toggle, agent mode
- **multi-selector**: + row of DropdownMenu pill buttons below for model/agent/performance
- **full-featured**: + Badge file chips (with preview + remove) + drag-drop overlay +
  DropdownMenu with Switch toggles (autocomplete, streaming, show history)

## Interaction Patterns
- File state: useState<File[]>, display as Badge chips with X remove button
- Drag-drop: onDragOver (prevent default + set isDragOver) / onDrop (extract files) /
  onDragLeave (clear isDragOver)
- Image preview in chips: URL.createObjectURL(file)
- Settings panel: DropdownMenu with Switch items (no close on toggle)
- Submit: local state for input value, clear on send, disable Button when empty

## Data Patterns

### Frontend-only
- Messages stored in useState<Message[]>
- Send adds to local array, simulated response after delay
- Conversation not persisted across refreshes

### Full-stack (when Hono backend exists)
- Zod schema: MessageSchema in src/shared/schemas/message.ts
  { role: z.enum(['user','assistant']), content: z.string(), createdAt: z.string() }
- API: POST /api/chat → streams response (ReadableStream)
- API: GET /api/conversations → list saved conversations
- API: GET /api/conversations/:id → load conversation history
- Client hook: useChat() with streaming support
  Appends chunks to assistant message as they arrive
- File uploads: POST /api/upload → returns file URL for message attachment

## Anti-Patterns
- ❌ Fixed-height textarea — MUST auto-grow
- ❌ No keyboard submit — Enter must send
- ❌ File upload without preview feedback
- ❌ Settings as a separate page — keep inline via DropdownMenu

## Composition Notes
- Usually the primary interaction point — give it visual prominence
- Pair with a message display area above (scrollable, newest at bottom)
- Works inside Card or standalone
