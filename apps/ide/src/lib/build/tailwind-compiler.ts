/**
 * Build-time Tailwind CSS compilation via tailwindcss-iso (WASM).
 * Lazily loads WASM on first call. Returns null on failure — never blocks.
 */

/** Canonical @theme mapping — 36 CSS custom property bridges */
export const TAILWIND_THEME_CSS = `@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}`

let generateFn: ((opts: { content: string; css: string }) => Promise<string>) | null = null
let wasmFailed = false

/** Compile Tailwind CSS from content. Returns CSS or null on failure. */
export async function compileTailwind(content: string): Promise<string | null> {
  if (wasmFailed) return null
  try {
    if (!generateFn) {
      const mod = await import('tailwindcss-iso/browser')
      generateFn = mod.generateTailwindCSS
    }
    return await generateFn({ content, css: TAILWIND_THEME_CSS })
  } catch (err) {
    if (!generateFn) wasmFailed = true // Cache WASM load failure — don't retry
    console.warn('[tailwind] Compilation failed, continuing without Tailwind CSS:', err)
    return null
  }
}

/** @internal — Reset module state for testing */
export function _resetForTesting(): void {
  generateFn = null
  wasmFailed = false
}
