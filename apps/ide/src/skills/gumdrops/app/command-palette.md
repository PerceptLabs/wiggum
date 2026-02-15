---
name: command-palette
domain: app
intent: Keyboard-triggered command search and navigation (Cmd+K)
complexity: intermediate
components: Command, Dialog, Kbd, Badge
---

# Command Palette

## Recipe
**Core:** CommandDialog (Dialog + Command combined) + CommandInput + CommandList
(max-h-[320px]) + CommandGroups with headings + CommandItems with icons

**Keyboard trigger:**
useEffect: listen for keydown, if (e.metaKey || e.ctrlKey) && e.key === 'k' →
  e.preventDefault() + setOpen(true)

**Footer:** Close hint with Kbd component showing "Esc"

## Variants
- **simple**: CommandDialog + grouped items. Navigate to pages/sections.
- **with-recent**: + "Recent" CommandGroup showing last-used commands
- **with-actions**: Items have Badge indicators (type: "page", "action", "setting")
- **with-preview**: Split layout — command list left, preview pane right

## Interaction Patterns
- Open/close: useState boolean, Cmd+K/Ctrl+K to toggle, Esc to close
- Search: CommandInput filters CommandItems automatically (Command handles this)
- Selection: Enter executes, arrow keys navigate
- Actions: each CommandItem has onSelect callback

## Anti-Patterns
- ❌ No keyboard shortcut — MUST have Cmd+K/Ctrl+K
- ❌ No escape to close
- ❌ Too many items without grouping — always use CommandGroup
- ❌ No empty state message

## Composition Notes
- Global to the app — rendered at root level, not inside specific sections
- Usually paired with NavigationMenu for visual nav + Command for keyboard nav
- Trigger Button in the nav bar with Kbd hint: "Cmd+K"
