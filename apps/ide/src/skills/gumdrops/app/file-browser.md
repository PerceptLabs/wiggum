---
name: file-browser
domain: app
intent: File and directory navigation with breadcrumbs, table view, and actions
complexity: intermediate
components: Table, Breadcrumb, DropdownMenu, Dialog
---

# File Browser

## Recipe
**Core:** Breadcrumb (path navigation) + Table (file listing).
Table columns: icon (Folder/File) + name + size + modified date +
DropdownMenu (MoreHorizontal) for actions.

**Breadcrumb:** BreadcrumbList with BreadcrumbItem per path segment.
Click segment to navigate up. Current segment is BreadcrumbPage (non-clickable).

**File actions:** DropdownMenu per row with:
Open, Rename (Dialog with Input), Move, Download, Delete (AlertDialog confirm)

**Enhancements:**
- Sort by column header click (name, size, date)
- Double-click row to open file/navigate into folder
- Checkbox column for multi-select + bulk actions bar
- Create new: Button + Dialog for new file/folder

## Variants
- **table-view**: Table with columns for name, size, date. Standard.
- **grid-view**: Card grid with file/folder icons. Visual, good for images.
- **toggle-view**: Button to switch between table and grid views.
- **with-preview**: Split layout — file list left, preview pane right.

## Interaction Patterns
- Navigation: useState for currentPath, click folder to descend, breadcrumb to ascend
- Sort: useState for { column, direction }, sort file list accordingly
- Rename: Dialog with Input, pre-filled with current name
- Delete: AlertDialog confirmation before removing
- Multi-select: Checkbox per row, bulk action bar appears when selected

## Anti-Patterns
- ❌ No breadcrumb navigation — MUST show current path
- ❌ No way to go back/up — breadcrumb + parent folder link required
- ❌ Delete without confirmation — always AlertDialog
- ❌ No file type icons — Folder and FileText icons help scanning

## Composition Notes
- Standalone component, often fills the main content area
- Pairs with sidebar-nav for app-level navigation
- Preview pane variant works well for document-heavy apps
- Works inside Dialog for "Select file" flows in other forms
