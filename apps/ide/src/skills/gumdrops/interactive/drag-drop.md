---
name: drag-drop
domain: interactive
intent: Drag-and-drop reordering and transfer patterns for lists and grids
complexity: advanced
components: Card
---

# Drag & Drop

## Layer Pattern
Drag-and-drop is an interaction layer, not a component. It layers onto existing
list, grid, and board patterns using HTML5 Drag and Drop API or pointer events.

## Architecture

### HTML5 Drag and Drop API
**Drag source:** draggable="true" + onDragStart (set dataTransfer data + drag image).
**Drop target:** onDragOver (preventDefault to allow drop) + onDrop (read dataTransfer, update state).
**Visual feedback:** onDragEnter/onDragLeave toggle a "bg-muted border-dashed border-primary" class.

### Pointer Events (alternative)
For more control: onPointerDown captures item, onPointerMove updates position via
transform/translate, onPointerUp determines drop target via elementFromPoint.
Better for touch devices and custom drag previews.

## Patterns

### Sortable List
- Single list reordering — drag items up/down
- State: array of items, splice on drop to reorder
- Visual: gap opens at drop position (insert indicator)
- Accessibility: Button pair (up/down arrows) as keyboard fallback

### Transfer Between Lists
- Two or more lists — drag items between them (kanban-board pattern)
- State: multiple arrays, remove from source + insert into target
- Visual: target list highlights on dragover
- Drop position: before/after nearest item based on cursor Y

### Grid Reorder
- Cards in a grid — drag to reorder
- State: flat array, index swap on drop
- Visual: placeholder Card at drop position (opacity-50 border-dashed)

## State Management
```
// Reorder within same list
const reorder = (list, fromIndex, toIndex) => {
  const result = [...list]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

// Transfer between lists
const transfer = (source, target, fromIndex, toIndex) => {
  const newSource = [...source]
  const newTarget = [...target]
  const [moved] = newSource.splice(fromIndex, 1)
  newTarget.splice(toIndex, 0, moved)
  return { source: newSource, target: newTarget }
}
```

## Anti-Patterns
- ❌ Drag-only with no keyboard alternative — always provide arrow buttons or menu fallback
- ❌ No visual feedback during drag — highlight drop zones and show insertion indicator
- ❌ No drag handle on touch — use a GripVertical icon as explicit drag handle
- ❌ Dropping anywhere — constrain valid drop zones and show invalid cursor

## Composition Notes
- Layers onto kanban-board for card movement between columns
- Layers onto grid-list for item reordering
- Layers onto file-browser for file move operations
- Always pair with non-drag fallback (DropdownMenu "Move to" action)
