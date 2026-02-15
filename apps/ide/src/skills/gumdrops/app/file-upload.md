---
name: file-upload
domain: app
intent: File upload with drag-drop zone, progress tracking, and preview
complexity: intermediate
components: Card, Button, Input, Badge, Tooltip, Dialog, Progress
---

# File Upload / Dropzone

## Recipe
**Core:** Dashed border div (border-2 border-dashed border-border rounded-md) +
hidden input[type=file] triggered via ref + icon (Upload from lucide-react) +
label text + "click to browse" link

**Drop zone behavior:**
- onClick → triggers hidden input via ref (fileInputRef.current.click())
- onDragOver → e.preventDefault() + set isDragOver state
- onDrop → e.preventDefault() + extract e.dataTransfer.files + clear isDragOver
- onDragLeave → clear isDragOver
- Visual feedback: isDragOver ? 'border-primary bg-primary/5' : 'border-border'

**File list:** Map of uploaded files showing:
- Thumbnail: img with src=URL.createObjectURL(file) for images
- Name: file.name
- Size: (file.size / 1024).toFixed(1) + ' KB'
- Progress bar: div with h-1 w-full bg-muted + inner div with scaleX(progress/100)
- Remove button: X icon button

## Variants
- **simple**: Drop zone + file list. No frills.
- **with-preview**: + image thumbnails via URL.createObjectURL
- **with-progress**: + progress bars (simulated or real upload tracking)
- **multi-section**: Drop zone inside a larger Card form with other Input fields

## Interaction Patterns
- File state: useState<{file: File, progress: number}[]>
- Progress simulation: setInterval updating progress 0→100 over ~2 seconds
- File validation: check file.type against accept attribute, show error for invalid
- Multiple files: input has `multiple` attribute, spread new files into existing array
- Remove: filter file out of state array, revoke object URL

## Data Patterns

### Frontend-only
- Files tracked in useState, previewed via URL.createObjectURL
- No actual upload — files exist only in browser memory
- Progress bar is visual-only simulation

### Full-stack (when Hono backend exists)
- API: POST /api/upload (multipart/form-data)
  Returns { url: string, filename: string, size: number }
- Real progress: XMLHttpRequest with upload.onprogress for actual upload %
  (fetch doesn't support upload progress — XHR needed here)
- File list: GET /api/files → returns uploaded file metadata
- Delete: DELETE /api/files/:id → removes from store
- Client hook: useFileUpload() returning { upload, progress, files, remove }

## Anti-Patterns
- ❌ No visual feedback on drag — MUST change border/bg color
- ❌ No file type validation — always validate against accept list
- ❌ Progress bar without animation — use transition-transform
- ❌ No way to remove uploaded files

## Composition Notes
- Often embedded inside a Dialog or Card form, not standalone
- Pair with form fields (Input for name, Select for category, etc.)
- Footer pattern: Cancel (Button outline) + Continue/Upload (Button default)
