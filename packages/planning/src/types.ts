/**
 * @wiggum/planning — Type definitions
 *
 * All union types sourced from codebase reality. Constrained unions are CLOSED
 * (must match codebase exactly). Open unions use `(string & {})` for freeform.
 *
 * Zero runtime code — types only.
 */

// ============================================================================
// MOOD & PRESET
// ============================================================================

/** Personality moods from personalities.ts */
export type MoodName =
  | 'minimal' | 'premium' | 'playful' | 'industrial' | 'organic' | 'editorial'
  | 'fashion-editorial' | 'brutalist' | 'zen' | 'corporate' | 'retro' | 'luxury'

/** Curated preset names from presets.ts */
export type PresetName =
  | 'northern-lights' | 'cyberpunk' | 'doom-64' | 'retro-arcade'
  | 'soft-pop' | 'tangerine' | 'mono' | 'elegant-luxury'
  | 'bubblegum' | 'mocha-mousse' | 'caffeine' | 'catppuccin'

/** Accepts both personality moods AND preset names */
export type ThemeIdentifier = MoodName | PresetName

// ============================================================================
// GEOMETRY PATTERNS (camelCase — matches patterns.ts keys)
// ============================================================================

export type PatternName =
  | 'monochromatic' | 'analogous' | 'complementary' | 'splitComplementary'
  | 'triadic' | 'tetradic' | 'goldenRatio' | 'flowerOfLife'
  | 'fibonacci' | 'vesicaPiscis' | 'seedOfLife'

// ============================================================================
// FONTS (32 from personality.ts FONT_REGISTRY)
// ============================================================================

export type FontName =
  // Geometric Sans
  | 'Inter' | 'Plus Jakarta Sans' | 'Outfit' | 'Poppins'
  | 'Manrope' | 'Sora' | 'Space Grotesk'
  // Humanist Sans
  | 'DM Sans' | 'Nunito' | 'Rubik' | 'Lexend'
  // Neo-Grotesque
  | 'Geist' | 'IBM Plex Sans' | 'Work Sans' | 'Montserrat'
  // Transitional Serif
  | 'Source Serif 4' | 'Merriweather' | 'Lora' | 'Libre Baskerville' | 'Crimson Pro'
  // Slab Serif
  | 'Roboto Slab' | 'Zilla Slab'
  // Display
  | 'Oxanium' | 'Orbitron' | 'Righteous' | 'Comfortaa' | 'Josefin Sans'
  // Monospace
  | 'JetBrains Mono' | 'Geist Mono' | 'Fira Code' | 'IBM Plex Mono' | 'Source Code Pro'

// ============================================================================
// SHADOW & RADIUS (from types.ts)
// ============================================================================

export type ShadowProfile = 'none' | 'subtle' | 'moderate' | 'dramatic' | 'harsh'
export type RadiusStop = 'none' | 'subtle' | 'moderate' | 'rounded' | 'pill'

// ============================================================================
// GUMDROPS (open union — new gumdrops get added)
// ============================================================================

export type GumDropName =
  // Marketing (14)
  | 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'faq'
  | 'footer' | 'newsletter' | 'blog-grid' | 'contact' | 'gallery'
  | 'portfolio' | 'social-proof' | 'team'
  // App (21)
  | 'activity-feed' | 'ai-prompt' | 'auth-login' | 'calendar-view'
  | 'chat-messaging' | 'command-palette' | 'data-table' | 'dialog-modal'
  | 'empty-state' | 'file-browser' | 'file-upload' | 'form-layout'
  | 'grid-list' | 'kanban-board' | 'notification-feed' | 'onboarding'
  | 'profile-page' | 'search-results' | 'settings-panel' | 'sidebar-nav'
  | 'stats-dashboard'
  // Content (4)
  | 'article-layout' | 'changelog' | 'documentation' | 'timeline'
  // Interactive (7)
  | 'color-picker' | 'drag-drop' | 'keyboard-shortcuts' | 'motion-patterns'
  | 'multi-step-wizard' | 'rich-text-editor' | 'scroll-animation'
  // API forward-declarations (Phase D)
  | 'api-crud' | 'api-auth' | 'api-upload' | 'api-webhook'
  | 'api-realtime' | 'api-search'
  // Escape hatch
  | (string & {})

// ============================================================================
// STACK COMPONENTS (open union — 53 from packages/stack)
// ============================================================================

export type StackComponent =
  | 'Accordion' | 'Alert' | 'AlertDialog' | 'AspectRatio' | 'Avatar'
  | 'Badge' | 'Breadcrumb' | 'Button' | 'ButtonGroup' | 'Calendar'
  | 'Card' | 'Carousel' | 'Chart' | 'Checkbox' | 'Collapsible'
  | 'Command' | 'ContextMenu' | 'Dialog' | 'Drawer' | 'DropdownMenu'
  | 'Empty' | 'Field' | 'Form' | 'HoverCard' | 'Input'
  | 'InputGroup' | 'InputOtp' | 'Item' | 'Kbd' | 'Label'
  | 'Menubar' | 'NavigationMenu' | 'Pagination' | 'Popover' | 'Progress'
  | 'RadioGroup' | 'Resizable' | 'ScrollArea' | 'Select' | 'Separator'
  | 'Sheet' | 'Sidebar' | 'Skeleton' | 'Slider' | 'Sonner'
  | 'Spinner' | 'Switch' | 'Table' | 'Tabs' | 'Textarea'
  | 'Toggle' | 'ToggleGroup' | 'Tooltip'
  | (string & {})

// ============================================================================
// LAYOUT (open union — common patterns with freeform fallback)
// ============================================================================

export type Layout =
  | 'single' | 'sidebar' | 'split' | 'grid'
  | 'dashboard' | 'tabs' | 'wizard' | 'modal'
  | (string & {})

// ============================================================================
// FIELD TYPES (HTML input types + custom)
// ============================================================================

export type FieldType =
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  | 'date' | 'time' | 'datetime-local' | 'color' | 'file'
  | 'textarea' | 'select' | 'checkbox' | 'radio'
  | 'toggle' | 'slider' | 'repeater'
