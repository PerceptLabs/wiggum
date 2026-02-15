---
name: keyboard-shortcuts
domain: interactive
intent: Keyboard shortcut system with discovery, binding, and help overlay
complexity: intermediate
components: Kbd, Dialog, Command
---

# Keyboard Shortcuts

## Layer Pattern
Keyboard shortcuts are an interaction layer that accelerates power-user workflows.
This recipe covers the system for registering, discovering, and displaying shortcuts.

## Architecture

### Shortcut Registration
```
// Central registry pattern
const shortcuts = [
  { keys: ['Ctrl', 'K'], action: 'openCommandPalette', description: 'Open command palette' },
  { keys: ['Ctrl', 'S'], action: 'save', description: 'Save current file' },
  { keys: ['Ctrl', 'Shift', 'P'], action: 'openSettings', description: 'Open settings' },
]
```

### Event Handler
- useEffect with global keydown listener
- Match event.key + event.ctrlKey/metaKey/shiftKey/altKey
- Prevent default for captured shortcuts
- Ignore when focus is in Input/Textarea (unless explicitly scoped)

### Shortcut Display
- Kbd component for individual keys: `<Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>`
- Styled: border rounded px-1.5 py-0.5 text-xs bg-muted font-mono
- Platform-aware: show ⌘ on Mac, Ctrl on Windows

## Patterns

### Help Overlay
- Dialog triggered by ? key (when not in text input)
- Two-column layout: shortcut group heading + list of action + Kbd pairs
- Groups: Navigation, Editing, View, etc.
- Search Input at top to filter shortcuts

### Inline Hints
- Show Kbd next to menu items: "Save" + Kbd("Ctrl+S")
- Show in DropdownMenu items alongside labels
- Show in command-palette results as right-aligned Kbd
- Tooltip on Button hover showing keyboard shortcut

### Command Palette Integration
- Command component (⌘K) shows all available actions
- Each Command item shows Kbd for its shortcut
- Typing in Command filters by action name
- Selecting item executes the action

## Scope Management
- Global shortcuts: active everywhere (navigation, palette)
- Context shortcuts: active only in specific views (editor, table)
- Input-aware: don't capture when user is typing in Input/Textarea
- Priority: context shortcuts override global when in scope

## Anti-Patterns
- ❌ No discoverability — shortcuts MUST be visible somewhere (help dialog, menu hints)
- ❌ Conflicting with browser shortcuts — avoid Ctrl+T, Ctrl+W, Ctrl+N, etc.
- ❌ No modifier keys — single letter shortcuts conflict with text input
- ❌ Firing in text inputs — always check if focus is in editable element

## Composition Notes
- Command palette (command-palette recipe) is the primary shortcut discovery surface
- DropdownMenu items show Kbd hints for associated shortcuts
- Settings panel can include shortcut customization section
- Help overlay (? key) provides comprehensive shortcut reference
