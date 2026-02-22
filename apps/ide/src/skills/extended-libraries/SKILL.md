---
name: Extended Libraries
description: Available npm packages beyond @wiggum/stack core, with when-to-use guidance
when_to_use: When Ralph needs functionality beyond the built-in stack components
---

# Extended Libraries

Available npm packages beyond `@wiggum/stack`. All are ESM-verified and cached via the Workbox service worker.

**Discovery:** Use `grep package "<query>"` to find the right package for a use case.

**Cache management:** Use `modules list` to see cached packages, `modules status` for cache stats, `modules warm <pkg>` to pre-cache, `modules clear` to reset.

## Behavior

### motion (Framer Motion)
Animation orchestration, spring physics, gesture interactions.
```tsx
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react'
```
- **Use when:** animation, transition, gesture, spring, layout animation, exit animation, page transition
- **Not when:** simple fade, opacity change, CSS transition, hover effect
- Import from `motion/react` (NOT `framer-motion`)

### react-hook-form
Form state management with validation.
```tsx
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form'
```
- **Use when:** form, validation, multi-step, field array, form wizard, multi-field
- **Not when:** single input, search bar, simple toggle
- Pair with `zod` + `@hookform/resolvers` for schema validation

### zod
TypeScript-first schema validation.
```tsx
import { z } from 'zod'
```
- **Use when:** schema, validation, type-safe parsing, form validation, API validation
- **Not when:** simple required check, single field

### @hookform/resolvers
Validation resolvers for react-hook-form.
```tsx
import { zodResolver } from '@hookform/resolvers'
```
- **Use when:** form validation with zod schemas
- Requires: `react-hook-form`, `zod`

### @tanstack/react-table
Headless table with sorting, filtering, pagination, virtual rows.
```tsx
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
```
- **Use when:** data table, sorting, filtering, pagination, virtual rows, column resizing
- **Not when:** under 50 rows, simple list, static content

### @dnd-kit/core + @dnd-kit/sortable
Drag and drop behaviors.
```tsx
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```
- **Use when:** kanban, sortable list, drag and drop, reorder, drag handle
- **Not when:** dropdown menu, select input
- Always include `@dnd-kit/utilities` for transform styles

### date-fns
Modern date utility library.
```tsx
import { format, formatDistanceToNow, addDays, differenceInDays, parseISO } from 'date-fns'
```
- **Use when:** relative time, locale formatting, date math, date range, calendar logic
- **Not when:** simple date formatting, Intl.DateTimeFormat is enough

### @tanstack/react-virtual
Virtualized rendering for large lists.
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
```
- **Use when:** large list, virtual scroll, 1000+ items, infinite scroll, log viewer
- **Not when:** small list, under 100 items

## Visual

### @phosphor-icons/react
7000+ icons with 6 weights (thin to fill).
```tsx
import { House, GearSix, MagnifyingGlass, CaretDown } from '@phosphor-icons/react'
```
- **Use when:** need weight variants, thin/light/regular/bold/fill/duotone icons
- **Not when:** Lucide has the icon, using Lucide already

### react-type-animation
Typewriter effect for text.
```tsx
import { TypeAnimation } from 'react-type-animation'
```
- **Use when:** typewriter effect, hero headline animation, typing animation

### canvas-confetti
Celebration confetti animation.
```tsx
import confetti from 'canvas-confetti'
```
- **Use when:** celebration, confetti, signup completion, achievement unlocked

### react-countup
Animated number counters.
```tsx
import CountUp from 'react-countup'
```
- **Use when:** animated counter, stats section, number animation, dashboard numbers

### cmdk
Command palette component (cmd+K).
```tsx
import { Command } from 'cmdk'
```
- **Use when:** command palette, cmd+k, quick search, keyboard navigation
- **Not when:** dropdown menu, simple search, select input

### vaul
Drawer component with snap points.
```tsx
import { Drawer } from 'vaul'
```
- **Use when:** drawer, bottom sheet, mobile menu, snap points
- **Not when:** desktop-only modal, dialog

### embla-carousel-react
Smooth accessible carousels.
```tsx
import useEmblaCarousel from 'embla-carousel-react'
```
- **Use when:** carousel, slider, image gallery, testimonial slider

### react-masonry-css
Pinterest-style masonry grid layout.
```tsx
import Masonry from 'react-masonry-css'
```
- **Use when:** masonry layout, Pinterest grid, variable height cards, image gallery grid
- **Not when:** uniform grid, CSS grid is enough

### react-wrap-balancer
Apple-style balanced text wrapping.
```tsx
import Balancer from 'react-wrap-balancer'
```
- **Use when:** balanced heading, hero text, centered headline

### react-medium-image-zoom
Medium-style image zoom on click.
```tsx
import Zoom from 'react-medium-image-zoom'
```
- **Use when:** image zoom, lightbox, click to enlarge, product image

### react-player
YouTube/Vimeo/file video player.
```tsx
import ReactPlayer from 'react-player'
```
- **Use when:** video embed, YouTube, Vimeo, video player, media player

### qrcode.react
QR code generation component.
```tsx
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
```
- **Use when:** QR code, share link, mobile deep link

## Data

### zustand
Lightweight state management.
```tsx
import { create } from 'zustand'
```
- **Use when:** cross-component state, global store, persistent state, prop drilling is painful
- **Not when:** single component state, useState is enough

### @tanstack/react-query
Async state management with caching, retries, optimistic updates.
```tsx
import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query'
```
- **Use when:** API calls, data fetching, caching, optimistic updates, polling
- **Not when:** static data, no API

### react-markdown + remark-gfm
Render markdown as React components.
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```
- **Use when:** markdown rendering, blog post, documentation, user content
- `remark-gfm` adds tables, strikethrough, task lists

### prism-react-renderer
Syntax highlighting for code blocks.
```tsx
import { Highlight, themes } from 'prism-react-renderer'
```
- **Use when:** code block, syntax highlighting, code snippet display

## Anti-Patterns

- **NEVER** install packages not in this registry without user confirmation
- **NEVER** use `framer-motion` — use `motion/react` instead
- **NEVER** use heavyweight charting libs — recharts is already in core
- **NEVER** add a state management lib when `useState` or `useReducer` suffices
- **NEVER** use `moment.js` — use `date-fns` instead
- **NEVER** mix icon libraries — prefer Lucide (in stack), fall back to Phosphor
