/**
 * Package Registry — Structured catalog of available npm packages
 *
 * Single source of truth for package metadata, Orama search indexing,
 * and grep package discovery. Populated from the powerup plan's
 * Extended Library tables.
 */

export interface PackageEntry {
  description: string
  category: 'behavior' | 'visual' | 'data' | 'utility'
  version: string
  subpath?: string
  imports: { named: string[] }
  peerDeps?: string[]
  relatedPackages?: string[]
  esm: { verified: boolean }
  useWhen: string[]
  notWhen: string[]
  bundleSize: string
}

export const PACKAGE_REGISTRY: Record<string, PackageEntry> = {
  // =========================================================================
  // BEHAVIOR
  // =========================================================================

  'motion': {
    description: 'Animation orchestration, spring physics, gesture interactions',
    category: 'behavior',
    version: '11.15.0',
    subpath: 'motion/react',
    imports: { named: ['motion', 'AnimatePresence', 'useMotionValue', 'useSpring'] },
    peerDeps: ['react'],
    esm: { verified: true },
    useWhen: ['animation', 'transition', 'gesture', 'spring', 'layout animation', 'exit animation', 'page transition'],
    notWhen: ['simple fade', 'opacity change', 'CSS transition', 'hover effect'],
    bundleSize: '~80KB',
  },

  'react-hook-form': {
    description: 'Form state management with validation',
    category: 'behavior',
    version: '7.54.0',
    imports: { named: ['useForm', 'useFieldArray', 'Controller', 'FormProvider'] },
    relatedPackages: ['zod', '@hookform/resolvers'],
    esm: { verified: true },
    useWhen: ['form', 'validation', 'multi-step', 'field array', 'form wizard', 'multi-field'],
    notWhen: ['single input', 'search bar', 'simple toggle'],
    bundleSize: '~25KB',
  },

  'zod': {
    description: 'TypeScript-first schema validation',
    category: 'behavior',
    version: '3.24.0',
    imports: { named: ['z'] },
    relatedPackages: ['react-hook-form', '@hookform/resolvers'],
    esm: { verified: true },
    useWhen: ['schema', 'validation', 'type-safe parsing', 'form validation', 'API validation'],
    notWhen: ['simple required check', 'single field'],
    bundleSize: '~55KB',
  },

  '@hookform/resolvers': {
    description: 'Validation resolvers for react-hook-form (zod, yup, etc.)',
    category: 'behavior',
    version: '3.9.0',
    imports: { named: ['zodResolver'] },
    peerDeps: ['react-hook-form'],
    relatedPackages: ['react-hook-form', 'zod'],
    esm: { verified: true },
    useWhen: ['form validation', 'zod resolver', 'schema validation with forms'],
    notWhen: ['custom validation logic'],
    bundleSize: '~10KB',
  },

  '@tanstack/react-table': {
    description: 'Headless table with sorting, filtering, pagination, virtual rows',
    category: 'behavior',
    version: '8.20.0',
    imports: { named: ['useReactTable', 'getCoreRowModel', 'getSortedRowModel', 'getFilteredRowModel', 'flexRender'] },
    esm: { verified: true },
    useWhen: ['data table', 'sorting', 'filtering', 'pagination', 'virtual rows', 'column resizing'],
    notWhen: ['under 50 rows', 'simple list', 'static content'],
    bundleSize: '~55KB',
  },

  '@dnd-kit/core': {
    description: 'Drag and drop behaviors',
    category: 'behavior',
    version: '6.1.0',
    imports: { named: ['DndContext', 'useDraggable', 'useDroppable', 'closestCenter'] },
    relatedPackages: ['@dnd-kit/sortable', '@dnd-kit/utilities'],
    esm: { verified: true },
    useWhen: ['kanban', 'sortable list', 'drag and drop', 'reorder', 'drag handle'],
    notWhen: ['dropdown menu', 'select input'],
    bundleSize: '~35KB',
  },

  '@dnd-kit/sortable': {
    description: 'Sortable preset for @dnd-kit/core',
    category: 'behavior',
    version: '8.0.0',
    imports: { named: ['SortableContext', 'useSortable', 'arrayMove', 'verticalListSortingStrategy'] },
    peerDeps: ['@dnd-kit/core'],
    relatedPackages: ['@dnd-kit/core', '@dnd-kit/utilities'],
    esm: { verified: true },
    useWhen: ['sortable list', 'reorderable items', 'kanban columns'],
    notWhen: ['free-form drag', 'non-list dragging'],
    bundleSize: '~15KB',
  },

  '@dnd-kit/utilities': {
    description: 'Utility functions for @dnd-kit',
    category: 'utility',
    version: '3.2.2',
    imports: { named: ['CSS'] },
    relatedPackages: ['@dnd-kit/core', '@dnd-kit/sortable'],
    esm: { verified: true },
    useWhen: ['dnd-kit transform styles', 'drag and drop utilities'],
    notWhen: ['not using dnd-kit'],
    bundleSize: '~5KB',
  },

  'date-fns': {
    description: 'Modern date utility library',
    category: 'behavior',
    version: '4.1.0',
    imports: { named: ['format', 'formatDistanceToNow', 'addDays', 'differenceInDays', 'parseISO'] },
    esm: { verified: true },
    useWhen: ['relative time', 'locale formatting', 'date math', 'date range', 'calendar logic'],
    notWhen: ['simple date formatting', 'Intl.DateTimeFormat is enough', 'single date display'],
    bundleSize: '~70KB',
  },

  '@tanstack/react-virtual': {
    description: 'Virtualized rendering for large lists',
    category: 'behavior',
    version: '3.10.0',
    imports: { named: ['useVirtualizer'] },
    esm: { verified: true },
    useWhen: ['large list', 'virtual scroll', '1000+ items', 'infinite scroll', 'log viewer'],
    notWhen: ['small list', 'under 100 items'],
    bundleSize: '~10KB',
  },

  // =========================================================================
  // VISUAL
  // =========================================================================

  '@phosphor-icons/react': {
    description: '7000+ icons with 6 weights (thin to fill)',
    category: 'visual',
    version: '2.1.0',
    imports: { named: ['House', 'GearSix', 'MagnifyingGlass', 'CaretDown'] },
    esm: { verified: true },
    useWhen: ['need weight variants', 'thin/light/regular/bold/fill/duotone icons', 'brand icons beyond Lucide'],
    notWhen: ['Lucide has the icon', 'using Lucide already'],
    bundleSize: '~30KB',
  },

  'react-type-animation': {
    description: 'Typewriter effect for text',
    category: 'visual',
    version: '3.2.0',
    imports: { named: ['TypeAnimation'] },
    esm: { verified: true },
    useWhen: ['typewriter effect', 'hero headline animation', 'typing animation'],
    notWhen: ['static text', 'non-animated heading'],
    bundleSize: '~5KB',
  },

  'canvas-confetti': {
    description: 'Celebration confetti animation',
    category: 'visual',
    version: '1.9.0',
    imports: { named: ['default as confetti'] },
    esm: { verified: true },
    useWhen: ['celebration', 'confetti', 'signup completion', 'achievement unlocked'],
    notWhen: ['subtle feedback', 'form validation'],
    bundleSize: '~8KB',
  },

  'react-countup': {
    description: 'Animated number counters',
    category: 'visual',
    version: '6.5.0',
    imports: { named: ['default as CountUp'] },
    esm: { verified: true },
    useWhen: ['animated counter', 'stats section', 'number animation', 'dashboard numbers'],
    notWhen: ['static number', 'non-animated stat'],
    bundleSize: '~8KB',
  },

  'cmdk': {
    description: 'Command palette component (cmd+K)',
    category: 'visual',
    version: '1.0.0',
    imports: { named: ['Command'] },
    esm: { verified: true },
    useWhen: ['command palette', 'cmd+k', 'quick search', 'keyboard navigation'],
    notWhen: ['dropdown menu', 'simple search', 'select input'],
    bundleSize: '~12KB',
  },

  'vaul': {
    description: 'Drawer component with snap points',
    category: 'visual',
    version: '1.1.0',
    imports: { named: ['Drawer'] },
    esm: { verified: true },
    useWhen: ['drawer', 'bottom sheet', 'mobile menu', 'snap points'],
    notWhen: ['desktop-only modal', 'dialog'],
    bundleSize: '~10KB',
  },

  'embla-carousel-react': {
    description: 'Smooth accessible carousels',
    category: 'visual',
    version: '8.3.0',
    imports: { named: ['default as useEmblaCarousel'] },
    esm: { verified: true },
    useWhen: ['carousel', 'slider', 'image gallery', 'testimonial slider'],
    notWhen: ['single image', 'static grid'],
    bundleSize: '~20KB',
  },

  'react-masonry-css': {
    description: 'Pinterest-style masonry grid layout',
    category: 'visual',
    version: '1.0.16',
    imports: { named: ['default as Masonry'] },
    esm: { verified: true },
    useWhen: ['masonry layout', 'Pinterest grid', 'variable height cards', 'image gallery grid'],
    notWhen: ['uniform grid', 'CSS grid is enough'],
    bundleSize: '~3KB',
  },

  'react-wrap-balancer': {
    description: 'Apple-style balanced text wrapping',
    category: 'visual',
    version: '1.1.0',
    imports: { named: ['default as Balancer'] },
    esm: { verified: true },
    useWhen: ['balanced heading', 'hero text', 'centered headline'],
    notWhen: ['body text', 'paragraph'],
    bundleSize: '~2KB',
  },

  'react-medium-image-zoom': {
    description: 'Medium-style image zoom on click',
    category: 'visual',
    version: '5.2.0',
    imports: { named: ['default as Zoom'] },
    esm: { verified: true },
    useWhen: ['image zoom', 'lightbox', 'click to enlarge', 'product image'],
    notWhen: ['thumbnail gallery', 'background image'],
    bundleSize: '~10KB',
  },

  'react-player': {
    description: 'YouTube/Vimeo/file video player',
    category: 'visual',
    version: '2.16.0',
    imports: { named: ['default as ReactPlayer'] },
    esm: { verified: true },
    useWhen: ['video embed', 'YouTube', 'Vimeo', 'video player', 'media player'],
    notWhen: ['audio only', 'simple iframe embed'],
    bundleSize: '~25KB',
  },

  'qrcode.react': {
    description: 'QR code generation component',
    category: 'visual',
    version: '4.1.0',
    imports: { named: ['QRCodeSVG', 'QRCodeCanvas'] },
    esm: { verified: true },
    useWhen: ['QR code', 'share link', 'mobile deep link'],
    notWhen: ['barcode', 'non-QR encoding'],
    bundleSize: '~15KB',
  },

  // =========================================================================
  // DATA
  // =========================================================================

  'zustand': {
    description: 'Lightweight state management',
    category: 'data',
    version: '5.0.0',
    imports: { named: ['create'] },
    esm: { verified: true },
    useWhen: ['cross-component state', 'global store', 'persistent state', 'prop drilling is painful'],
    notWhen: ['single component state', 'useState is enough', 'simple parent-child props'],
    bundleSize: '~8KB',
  },

  '@tanstack/react-query': {
    description: 'Async state management with caching, retries, optimistic updates',
    category: 'data',
    version: '5.60.0',
    imports: { named: ['useQuery', 'useMutation', 'QueryClient', 'QueryClientProvider'] },
    esm: { verified: true },
    useWhen: ['API calls', 'data fetching', 'caching', 'optimistic updates', 'polling'],
    notWhen: ['static data', 'no API', 'simple fetch'],
    bundleSize: '~60KB',
  },

  'react-markdown': {
    description: 'Render markdown as React components',
    category: 'data',
    version: '9.0.0',
    imports: { named: ['default as ReactMarkdown'] },
    relatedPackages: ['remark-gfm'],
    esm: { verified: true },
    useWhen: ['markdown rendering', 'blog post', 'documentation', 'user content'],
    notWhen: ['plain text', 'HTML content'],
    bundleSize: '~40KB',
  },

  'prism-react-renderer': {
    description: 'Syntax highlighting for code blocks',
    category: 'data',
    version: '2.4.0',
    imports: { named: ['Highlight', 'themes'] },
    esm: { verified: true },
    useWhen: ['code block', 'syntax highlighting', 'code snippet display'],
    notWhen: ['plain text', 'no code content'],
    bundleSize: '~25KB',
  },

  // =========================================================================
  // UTILITY
  // =========================================================================

  'remark-gfm': {
    description: 'GitHub Flavored Markdown plugin (tables, strikethrough, task lists)',
    category: 'utility',
    version: '4.0.0',
    imports: { named: ['default as remarkGfm'] },
    relatedPackages: ['react-markdown'],
    esm: { verified: true },
    useWhen: ['GFM tables', 'strikethrough', 'task lists in markdown'],
    notWhen: ['basic markdown only', 'not using react-markdown'],
    bundleSize: '~10KB',
  },
}

/**
 * Look up a single package entry
 */
export function getPackageEntry(name: string): PackageEntry | undefined {
  return PACKAGE_REGISTRY[name]
}

/**
 * Get all packages as entries
 */
export function getAllPackages(): [string, PackageEntry][] {
  return Object.entries(PACKAGE_REGISTRY)
}

/**
 * Get packages formatted for Orama search indexing.
 * Content includes description + useWhen keywords.
 * Keywords include import names + notWhen + category.
 */
export function getPackagesForSearch(): Array<{ id: string, content: string, keywords: string }> {
  return Object.entries(PACKAGE_REGISTRY).map(([name, entry]) => ({
    id: name,
    content: `${entry.description} ${entry.useWhen.join(' ')}`,
    keywords: `${entry.imports.named.join(' ')} ${entry.notWhen.join(' ')} ${entry.category}`,
  }))
}
