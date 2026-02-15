---
name: rich-text-editor
domain: interactive
intent: Rich text editing with toolbar, formatting controls, and content output
complexity: advanced
components: Textarea, Button, Dialog
---

# Rich Text Editor

## Layer Pattern
Rich text editing layers formatting controls over a content-editable area.
This recipe covers toolbar patterns and content structure — the actual
editing uses contentEditable or a library (Tiptap, Slate, etc.).

## Architecture

### Toolbar
Horizontal Button bar above editor area. Button groups separated by Separator:
- **Text formatting:** Bold (B), Italic (I), Underline (U), Strikethrough (S)
- **Block type:** Select for Paragraph/H1/H2/H3/Quote/Code
- **Lists:** Ordered list, Unordered list
- **Insert:** Link (Dialog for URL), Image (Dialog for upload/URL)
- **Actions:** Undo, Redo

Each toolbar Button: variant="ghost" size="sm", active state: bg-muted
when formatting is applied at cursor position.

### Editor Area
- contentEditable div with min-height, focus ring, padding
- OR Textarea for markdown-only editing (simpler)
- Prose styling applied to rendered content
- Placeholder text when empty

### Output Modes
- HTML string: innerHTML of contentEditable area
- Markdown: convert from rich text or use Textarea directly
- JSON: structured document tree (Tiptap/Slate format)

## Patterns

### WYSIWYG Editor
- contentEditable area + toolbar above
- document.execCommand for basic formatting (deprecated but functional)
- Selection API for cursor position and formatting detection
- Toolbar buttons reflect current selection formatting

### Markdown Editor
- Split view: Textarea (left) + rendered preview (right)
- Toolbar inserts markdown syntax into Textarea
- Preview renders markdown to HTML with prose styling
- Toggle between edit and preview modes on mobile

### Inline Editing
- Click text to make it editable (contentEditable toggled)
- Floating toolbar appears on text selection
- Save on blur or explicit save Button
- Minimal chrome — editing in context

## Anti-Patterns
- ❌ No toolbar — formatting must be discoverable, not just keyboard shortcuts
- ❌ No visual feedback on active formats — toggle state on toolbar Buttons
- ❌ No link dialog — inserting links needs URL input, not just paste
- ❌ No preview for markdown mode — users need to see rendered output

## Composition Notes
- Embeds inside form-layout as a rich content field
- Link insertion Dialog reuses form-layout Input pattern
- Image insertion can trigger file-upload flow
- Output pairs with article-layout for rendered display
