/**
 * Personality Brief System — 12 mood presets for design-brief.md
 * Each mood defines typography, animation, spacing, interaction patterns,
 * and strict aesthetic rules. generateDesignBrief() renders markdown.
 *
 * NOTE: This is NOT personality.ts (singular) which handles font/shadow/radius.
 * Different file, different concern.
 */

export type MoodName = 'minimal' | 'premium' | 'playful' | 'industrial' | 'organic' | 'editorial'
  | 'fashion-editorial' | 'brutalist' | 'zen' | 'corporate' | 'retro' | 'luxury'

export interface PersonalityBrief {
  philosophy: string
  typography: Array<{ element: string, size: string, weight: string, color: string, tracking: string }>
  animation: Array<{ type: string, duration: string, easing: string }>
  spacing: { base: string, section: string, cardPadding: string, rhythm: string }
  interactions: string[]
  allowed: string[]
  notAllowed: string[]
  checklist: string[]
}

export const MOOD_NAMES: MoodName[] = [
  'minimal', 'premium', 'playful', 'industrial', 'organic', 'editorial',
  'fashion-editorial', 'brutalist', 'zen', 'corporate', 'retro', 'luxury',
]

export const PERSONALITIES: Record<MoodName, PersonalityBrief> = {
  minimal: {
    philosophy: 'Let content breathe. Every element earns its place.',
    typography: [
      { element: 'Hero numbers', size: '4xl-6xl', weight: 'normal (400)', color: 'foreground', tracking: 'tight' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'medium (500)', color: 'foreground', tracking: 'tight' },
      { element: 'Section labels', size: 'xs-sm', weight: 'medium (500)', color: 'muted-foreground', tracking: 'wide, uppercase' },
      { element: 'Body text', size: 'sm-base', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Captions', size: 'xs', weight: 'normal (400)', color: 'muted-foreground', tracking: 'normal' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '100-150ms', easing: 'ease' },
      { type: 'Hover states', duration: '150-200ms', easing: 'ease' },
      { type: 'Card transitions', duration: '200ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '300ms', easing: 'ease-in-out' },
      { type: 'Scroll reveals', duration: '400ms', easing: 'ease-out' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '64-96px (4-6rem)',
      cardPadding: '24px (1.5rem)',
      rhythm: 'Multiples of 4px. Generous gaps between sections. Dense within components.',
    },
    interactions: [
      'Hover: subtle opacity change (0.8), no transform',
      'Press: scale(0.98), 100ms',
      'Focus: ring-2 ring-ring, no glow',
      'Cards: no lift on hover, border-muted highlight only',
    ],
    allowed: [
      'Monochromatic or analogous palettes',
      'Ample whitespace between sections',
      'Single font family throughout',
      'Subtle fade-in animations only',
      'Flat design — no shadows heavier than subtle',
      'Icons: outline style, consistent stroke width',
    ],
    notAllowed: [
      'Bounce, spring, or elastic easing',
      'Gradients on backgrounds',
      'More than 2 accent colors',
      'Decorative illustrations or ornamental elements',
      'Shadow profiles heavier than subtle',
      'Border-radius larger than moderate (0.5rem)',
    ],
    checklist: [
      'Every visible element serves a purpose — no decoration',
      'Text hierarchy uses max 3 sizes on any given page',
      'Whitespace between sections is at least 4rem',
      'No animation exceeds 400ms duration',
      'Color palette uses at most 2 hues plus neutrals',
      'All interactive elements have visible focus states',
      'Icons are consistent style (all outline or all filled, never mixed)',
      'No element competes with content for attention',
    ],
  },

  premium: {
    philosophy: 'Numbers are heroes, labels are whispers.',
    typography: [
      { element: 'Hero numbers', size: '3xl-6xl', weight: 'light (300)', color: 'foreground', tracking: 'tight' },
      { element: 'Page titles', size: 'lg-xl', weight: 'light (300)', color: 'foreground', tracking: 'normal' },
      { element: 'Section labels', size: 'xs', weight: 'medium (500)', color: 'muted-foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'sm', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Accents', size: 'sm', weight: 'semibold (600)', color: 'primary', tracking: 'wide' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '100-150ms', easing: 'ease' },
      { type: 'Hover states', duration: '200-300ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1) (spring)' },
      { type: 'Card transitions', duration: '300ms', easing: 'cubic-bezier(0.33, 1, 0.68, 1) (easeOutCubic)' },
      { type: 'Page transitions', duration: '400-500ms', easing: 'cubic-bezier(0.76, 0, 0.24, 1) (easeInOutQuart)' },
      { type: 'Scroll reveals', duration: '500-800ms', easing: 'cubic-bezier(0.25, 1, 0.5, 1) (easeOutQuart)' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '80-120px (5-7.5rem)',
      cardPadding: '32-40px (2-2.5rem)',
      rhythm: 'Generous padding. Sections breathe. Cards have internal luxury spacing.',
    },
    interactions: [
      'Hover: translateY(-2px) + shadow elevation increase, spring easing',
      'Press: scale(0.97), 100ms ease',
      'Focus: ring-2 ring-primary with glow (box-shadow)',
      'Cards: lift + shadow-dramatic on hover, 300ms transition',
    ],
    allowed: [
      'Light font weights (300) at large sizes for elegance',
      'Spring easing on hover interactions',
      'Dramatic shadow profiles for card elevation',
      'Gradient accents on CTAs and hero sections',
      'Background blur / glassmorphism effects',
      'Staggered entrance animations',
      'Rich layering with card-on-card compositions',
    ],
    notAllowed: [
      'Bold weights (700+) at hero sizes — looks heavy, not premium',
      'Flat design with zero shadows — premium needs depth',
      'Neon or saturated accent colors — keep chroma controlled',
      'Harsh shadows — use dramatic (diffused), never harsh (hard-edge)',
      'Tight spacing between cards — premium needs room',
      'More than 3 font weights total',
    ],
    checklist: [
      'Hero text uses light weight (300) and looks effortless at 3xl+',
      'Section labels are uppercase, xs, wide tracking — whisper level',
      'Cards elevate on hover with smooth spring animation',
      'Shadow profile is dramatic (diffused) or moderate, never harsh',
      'At least one section uses gradient or glassmorphism accent',
      'Spacing between major sections is 5rem+',
      'Color palette feels rich but restrained — no neon',
      'Interactive elements have satisfying spring-back feedback',
      'Overall impression: expensive, considered, unhurried',
    ],
  },

  playful: {
    philosophy: 'Surprise at every scroll. Joy is not optional.',
    typography: [
      { element: 'Hero text', size: '3xl-5xl', weight: 'bold (700)', color: 'foreground', tracking: 'tight' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'semibold (600)', color: 'foreground', tracking: 'normal' },
      { element: 'Section labels', size: 'sm', weight: 'semibold (600)', color: 'primary', tracking: 'normal' },
      { element: 'Body text', size: 'base', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Callouts', size: 'lg', weight: 'bold (700)', color: 'accent-foreground', tracking: 'normal' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '150-200ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1) (spring)' },
      { type: 'Hover states', duration: '200-300ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1) (bounce)' },
      { type: 'Card transitions', duration: '300-400ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1) (spring)' },
      { type: 'Page transitions', duration: '400-600ms', easing: 'cubic-bezier(0.22, 1, 0.36, 1) (easeOutQuint)' },
      { type: 'Scroll reveals', duration: '500-700ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1) (spring)' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '48-80px (3-5rem)',
      cardPadding: '20-28px (1.25-1.75rem)',
      rhythm: 'Tighter than premium. Energy comes from density and motion, not space.',
    },
    interactions: [
      'Hover: scale(1.03) + rotate(1deg), spring easing',
      'Press: scale(0.95), bouncy return',
      'Focus: ring-2 ring-primary + slight scale(1.02)',
      'Cards: bounce-lift on hover, shadow increase + slight rotation',
    ],
    allowed: [
      'Bounce and spring easing everywhere',
      'Bold/black font weights for impact',
      'Bright accent colors and high chroma',
      'Rounded corners (0.75rem+) on everything',
      'Decorative elements (dots, blobs, emoji)',
      'Staggered animations with visible delays',
      'Rotation on hover (subtle, 1-3deg)',
      'Gradient backgrounds and colorful sections',
    ],
    notAllowed: [
      'Flat, static layouts — must have motion',
      'Muted or desaturated colors as primaries',
      'Sharp corners (radius < 0.5rem)',
      'Linear or ease-in easing — always spring or bounce',
      'Formal serif fonts',
      'Gray-heavy palettes — playful needs color',
    ],
    checklist: [
      'At least 3 elements have hover animations',
      'Border-radius is rounded (0.75rem) or pill (1rem) throughout',
      'Primary and accent colors are vibrant (high chroma)',
      'Entrance animations use spring/bounce easing',
      'Font weights include at least one bold (700) usage',
      'Layout has at least one unexpected/delightful element',
      'Color is used on backgrounds, not just text and buttons',
      'Overall impression: fun, energetic, wants to be clicked',
    ],
  },

  industrial: {
    philosophy: 'Raw structure. Exposed grid. No decoration.',
    typography: [
      { element: 'Hero text', size: '3xl-5xl', weight: 'bold (700)', color: 'foreground', tracking: 'tighter' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'semibold (600)', color: 'foreground', tracking: 'tight' },
      { element: 'Section labels', size: 'xs', weight: 'bold (700)', color: 'muted-foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'sm', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Code/data', size: 'sm', weight: 'normal (400)', color: 'foreground', tracking: 'normal, monospace' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '50-100ms', easing: 'linear' },
      { type: 'Hover states', duration: '100-150ms', easing: 'linear' },
      { type: 'Card transitions', duration: '150ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '200ms', easing: 'ease-out' },
      { type: 'Scroll reveals', duration: '300ms', easing: 'ease-out' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '48-64px (3-4rem)',
      cardPadding: '16-24px (1-1.5rem)',
      rhythm: 'Dense, utilitarian. Grid-aligned. No wasted space.',
    },
    interactions: [
      'Hover: background-color snap change, no transform',
      'Press: invert colors (bg-foreground text-background), instant',
      'Focus: ring-1 ring-foreground, sharp outline',
      'Cards: border highlight only, no elevation, no shadow',
    ],
    allowed: [
      'Monospace or grotesque sans-serif fonts',
      'High contrast: near-black on near-white or vice versa',
      'Visible grid lines and structural borders',
      'All-caps labels with widest tracking',
      'Flat design — zero shadows',
      'Sharp corners only (radius 0-4px / 0-0.25rem)',
      'Linear easing or instant transitions',
    ],
    notAllowed: [
      'Border-radius greater than 4px (0.25rem)',
      'Spring, bounce, or elastic animations',
      'Gradient backgrounds',
      'Decorative elements or illustrations',
      'Shadow profiles heavier than none',
      'Rounded or pill-shaped buttons',
      'Serif or display fonts',
      'Pastel or soft colors',
    ],
    checklist: [
      'No border-radius exceeds 4px (0.25rem) anywhere',
      'No shadow is applied to any element',
      'All animations complete in under 200ms',
      'At least one monospace font is used (headings or data)',
      'Color palette is high-contrast with minimal hues',
      'Labels use uppercase + wide tracking',
      'Layout feels grid-exposed and structural',
      'No decorative element exists that doesn\'t convey information',
      'Overall impression: raw, honest, engineered',
    ],
  },

  organic: {
    philosophy: 'Flowing shapes. Nothing has hard edges.',
    typography: [
      { element: 'Hero text', size: '3xl-5xl', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'medium (500)', color: 'foreground', tracking: 'normal' },
      { element: 'Section labels', size: 'sm', weight: 'medium (500)', color: 'muted-foreground', tracking: 'wide' },
      { element: 'Body text', size: 'base', weight: 'normal (400)', color: 'foreground', tracking: 'relaxed (leading-7)' },
      { element: 'Quotes', size: 'lg', weight: 'normal (400)', color: 'muted-foreground', tracking: 'normal, italic' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '150-200ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1) (ease-in-out)' },
      { type: 'Hover states', duration: '300-400ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1) (ease-in-out)' },
      { type: 'Card transitions', duration: '400ms', easing: 'cubic-bezier(0.25, 1, 0.5, 1) (easeOutQuart)' },
      { type: 'Page transitions', duration: '500-600ms', easing: 'cubic-bezier(0.25, 1, 0.5, 1) (easeOutQuart)' },
      { type: 'Scroll reveals', duration: '600-1000ms', easing: 'cubic-bezier(0.25, 1, 0.5, 1) (easeOutQuart)' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '80-120px (5-7.5rem)',
      cardPadding: '28-36px (1.75-2.25rem)',
      rhythm: 'Generous, unhurried. Content flows like water between wide margins.',
    },
    interactions: [
      'Hover: slight scale(1.01) + opacity shift, slow ease-in-out',
      'Press: scale(0.98), slow return (300ms)',
      'Focus: ring-2 ring-ring, soft glow (box-shadow blur 8px)',
      'Cards: subtle lift (translateY -2px) + shadow-moderate, 400ms',
    ],
    allowed: [
      'Rounded corners (0.75rem+) on all elements',
      'Slow, gentle easing (ease-in-out, easeOutQuart)',
      'Warm, earthy color tones',
      'Generous line-height (leading-7 or leading-8)',
      'Subtle shadow profiles (subtle or moderate)',
      'Soft gradient backgrounds',
      'Humanist or rounded sans-serif fonts',
    ],
    notAllowed: [
      'Sharp corners (radius < 0.5rem)',
      'Linear easing or instant transitions',
      'Harsh shadows or high-contrast hard edges',
      'Monospace fonts for body text',
      'Neon or electric accent colors',
      'Dense, tight spacing between elements',
      'Animations faster than 150ms',
    ],
    checklist: [
      'All corners are rounded (0.5rem minimum)',
      'No animation uses linear easing',
      'Line-height for body text is at least 1.75 (leading-7)',
      'Color palette feels warm and natural',
      'Section spacing is 5rem or more',
      'Hover transitions are 300ms or longer',
      'Typography uses a humanist or rounded font',
      'Overall impression: calm, natural, flowing',
    ],
  },

  editorial: {
    philosophy: 'Typography leads. Color supports.',
    typography: [
      { element: 'Hero text', size: '4xl-6xl', weight: 'bold (700)', color: 'foreground', tracking: 'tighter' },
      { element: 'Page titles', size: 'xl-3xl', weight: 'semibold (600)', color: 'foreground', tracking: 'tight' },
      { element: 'Section labels', size: 'xs-sm', weight: 'medium (500)', color: 'muted-foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'base-lg', weight: 'normal (400)', color: 'foreground', tracking: 'normal, serif preferred' },
      { element: 'Pull quotes', size: 'xl-2xl', weight: 'normal (400)', color: 'muted-foreground', tracking: 'tight, italic serif' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '100-150ms', easing: 'ease' },
      { type: 'Hover states', duration: '200ms', easing: 'ease' },
      { type: 'Card transitions', duration: '250ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '300-400ms', easing: 'ease-in-out' },
      { type: 'Scroll reveals', duration: '500-600ms', easing: 'ease-out' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '64-96px (4-6rem)',
      cardPadding: '24-32px (1.5-2rem)',
      rhythm: 'Print-inspired. Wide margins. Narrow content column (max-w-prose). Vertical rhythm via consistent leading.',
    },
    interactions: [
      'Hover: underline or color shift only, no transform',
      'Press: opacity 0.8, quick return',
      'Focus: ring-1 ring-ring, minimal',
      'Cards: border-bottom highlight or subtle background shift',
    ],
    allowed: [
      'Serif fonts for body text and headings',
      'Mixed font families (serif body + sans headings or vice versa)',
      'Pull quotes with italic serif at large sizes',
      'Narrow content columns (max-w-prose)',
      'High-contrast black-on-white or reverse',
      'Subtle separator lines between sections',
      'Uppercase small labels with wide tracking',
    ],
    notAllowed: [
      'Bounce or spring animations',
      'Colorful gradient backgrounds',
      'Rounded corners beyond moderate (0.5rem)',
      'Shadow profiles heavier than subtle',
      'Wide content layouts (full-width text columns)',
      'Decorative elements that don\'t serve content hierarchy',
      'More than 3 colors beyond neutrals',
    ],
    checklist: [
      'Body text uses a serif font (or heading/body are mixed serif+sans)',
      'Content column is constrained to max-w-prose or similar',
      'At least one pull-quote or large typographic moment exists',
      'Color usage is restrained — mainly foreground/muted-foreground',
      'Section labels use uppercase + wide tracking',
      'Vertical rhythm is consistent (same leading/spacing throughout)',
      'No animation uses bounce or spring easing',
      'Overall impression: magazine-quality, typography-driven, restrained',
    ],
  },

  'fashion-editorial': {
    philosophy: 'The runway on screen. Drama through restraint and scale.',
    typography: [
      { element: 'Hero text', size: '6xl-9xl', weight: 'extralight (200-300)', color: 'foreground', tracking: 'wide' },
      { element: 'Page titles', size: '2xl-4xl', weight: 'light (300)', color: 'foreground', tracking: 'wide' },
      { element: 'Section labels', size: 'xs', weight: 'medium (500)', color: 'muted-foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'base-lg', weight: 'normal (400)', color: 'foreground', tracking: 'normal, sans-serif' },
      { element: 'Captions', size: 'xs-sm', weight: 'normal (400)', color: 'muted-foreground', tracking: 'wide' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '150-200ms', easing: 'ease' },
      { type: 'Hover states', duration: '200-300ms', easing: 'ease, subtle opacity shifts' },
      { type: 'Card transitions', duration: '400-500ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '500-700ms', easing: 'ease-in-out' },
      { type: 'Scroll reveals', duration: '600-900ms', easing: 'ease-out, theatrical' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '96-160px (6-10rem)',
      cardPadding: '32-48px (2-3rem)',
      rhythm: 'DRAMATIC section gaps. Content breathes like a Vogue spread. Scale IS the statement.',
    },
    interactions: [
      'Hover: subtle opacity shift (0.7-0.9), no transforms',
      'Press: opacity 0.6, quick return',
      'Focus: ring-1 ring-foreground, minimal',
      'Cards: no lift, border or opacity change only',
    ],
    allowed: [
      'Full-bleed imagery placeholders',
      'Asymmetric layouts',
      'Overlapping type on background elements',
      'Extreme scale contrast between hero and body text',
      'Deconstructed typography (split words across lines)',
      'Max 2 colors beyond black/white/neutral',
    ],
    notAllowed: [
      'Rounded corners of any kind (radius: 0 always)',
      'Bounce or spring animations',
      'More than 2 accent colors beyond neutrals',
      'Busy or cluttered layouts',
      'Small hero text (must be 6xl+)',
      'Heavy font weights at display sizes',
    ],
    checklist: [
      'Hero text is 6xl+ at light weight (200-300)',
      'Zero border-radius throughout the entire design',
      'Section spacing is 6rem+ between major blocks',
      'No more than 2 accent colors beyond black/white',
      'Typography does the heavy lifting — minimal iconography',
      'Body text is sans-serif, clean and modern',
      'Scroll reveals are slow and theatrical (600ms+)',
      'Overall impression: high-fashion editorial spread, dramatic restraint',
    ],
  },

  brutalist: {
    philosophy: 'Raw structure. No pretense. The code is the design.',
    typography: [
      { element: 'Hero text', size: '3xl-6xl', weight: 'bold (800-900)', color: 'foreground', tracking: 'tight' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'bold (700-800)', color: 'foreground', tracking: 'tight' },
      { element: 'Section labels', size: 'xs-sm', weight: 'bold (700)', color: 'foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'sm-base', weight: 'normal (400)', color: 'foreground', tracking: 'normal, monospace' },
      { element: 'Code/data', size: 'sm', weight: 'normal (400)', color: 'foreground', tracking: 'normal, monospace' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '50ms', easing: 'linear' },
      { type: 'Hover states', duration: '50-100ms', easing: 'linear' },
      { type: 'Card transitions', duration: '100ms', easing: 'linear' },
      { type: 'Page transitions', duration: '100ms', easing: 'linear' },
      { type: 'Scroll reveals', duration: '50-100ms', easing: 'linear (instant appearance preferred)' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '32-48px (2-3rem)',
      cardPadding: '12-20px (0.75-1.25rem)',
      rhythm: 'Dense. Tight grid. No luxury whitespace — information density is the point.',
    },
    interactions: [
      'Hover: background-color snap change, instant',
      'Press: invert colors (bg-foreground text-background), instant',
      'Focus: ring-1 ring-foreground, hard outline',
      'Cards: border highlight only, no elevation, no shadow',
    ],
    allowed: [
      'Monospace fonts everywhere',
      'Visible grid lines and borders',
      'High-contrast black/white',
      'Raw unprocessed aesthetic',
      'System fonts as fallback',
      'Exposed structure (visible padding, explicit borders)',
      'All-caps section labels',
    ],
    notAllowed: [
      'Gradients of any kind',
      'Shadows of any kind',
      'Smooth easing curves (ease, ease-in-out)',
      'Serif fonts',
      'Rounded corners of any kind',
      'Decorative elements or images as decoration',
      'Colors beyond black/white + one accent max',
    ],
    checklist: [
      'Uses monospace or heavy grotesque sans throughout',
      'Shadow profile: none — zero shadows anywhere',
      'Radius: none — zero rounded corners anywhere',
      'At least one section has visible border-grid structure',
      'Colors: max 2 (typically black + one accent)',
      'No easing curves other than linear',
      'Animation durations under 100ms or instant',
      'Overall impression: raw, honest, structural, exposed',
    ],
  },

  zen: {
    philosophy: 'Emptiness is form. Let space speak.',
    typography: [
      { element: 'Hero text', size: '3xl-4xl', weight: 'light (300)', color: 'foreground', tracking: 'normal' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'light (300-400)', color: 'foreground', tracking: 'normal' },
      { element: 'Section labels', size: 'sm', weight: 'normal (400)', color: 'muted-foreground', tracking: 'wide' },
      { element: 'Body text', size: 'base', weight: 'normal (400)', color: 'foreground', tracking: 'relaxed, serif' },
      { element: 'Captions', size: 'xs-sm', weight: 'light (300)', color: 'muted-foreground', tracking: 'normal' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '200-300ms', easing: 'ease-out' },
      { type: 'Hover states', duration: '400-500ms', easing: 'ease-out' },
      { type: 'Card transitions', duration: '500-600ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '600-800ms', easing: 'ease-out' },
      { type: 'Scroll reveals', duration: '800-1200ms', easing: 'ease-out, gentle fade' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '120-200px (7.5-12.5rem)',
      cardPadding: '40-56px (2.5-3.5rem)',
      rhythm: 'MAXIMUM whitespace. Expansive rhythm. Let emptiness define the form.',
    },
    interactions: [
      'Hover: opacity shift (0.7), very slow transition (400ms+)',
      'Press: opacity 0.5, slow return',
      'Focus: ring-1 ring-ring, subtle',
      'Cards: subtle border-bottom separator, no elevation',
    ],
    allowed: [
      'Single accent color (earth tones preferred)',
      'Extreme whitespace between all elements',
      'Contemplative pacing in all transitions',
      'Subtle border-bottom separators',
      'Natural imagery placeholders',
      'Organic shapes (if any decoration exists)',
      'Serif body text for unhurried reading',
    ],
    notAllowed: [
      'Bold weights above 500',
      'More than 1 accent color',
      'Shadows heavier than subtle',
      'Fast animations under 400ms',
      'Dense layouts of any kind',
      'Uppercase text (too aggressive)',
      'Decorative flourishes or ornament',
    ],
    checklist: [
      'Section spacing is 8rem+ between major blocks',
      'Max font weight used anywhere is 500',
      'No animation duration is under 400ms',
      'Color palette uses earth tones or cool neutrals',
      'Body text uses serif font for contemplative reading',
      'Whitespace is the dominant visual element',
      'No element feels urgent or demanding',
      'Overall impression: calm, spacious, contemplative, still',
    ],
  },

  corporate: {
    philosophy: 'Clarity serves confidence. Systems enable trust.',
    typography: [
      { element: 'Hero text', size: '3xl-4xl', weight: 'semibold (600)', color: 'foreground', tracking: 'tight' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'semibold (600)', color: 'foreground', tracking: 'tight' },
      { element: 'Section labels', size: 'xs-sm', weight: 'medium (500)', color: 'muted-foreground', tracking: 'wide, uppercase' },
      { element: 'Body text', size: 'base-lg', weight: 'normal (400)', color: 'foreground', tracking: 'normal, neo-grotesque sans' },
      { element: 'Data/metrics', size: 'sm', weight: 'medium (500)', color: 'foreground', tracking: 'normal' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '100-150ms', easing: 'ease-out' },
      { type: 'Hover states', duration: '150-200ms', easing: 'ease-out' },
      { type: 'Card transitions', duration: '200-250ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '200-300ms', easing: 'ease-out' },
      { type: 'Scroll reveals', duration: '250-300ms', easing: 'ease-out' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '64-96px (4-6rem)',
      cardPadding: '24-32px (1.5-2rem)',
      rhythm: 'Moderate, systematic. Grid-based. Consistent 4px rhythm. Nothing extreme.',
    },
    interactions: [
      'Hover: background-color shift, subtle border highlight',
      'Press: scale(0.98), 100ms ease-out',
      'Focus: ring-2 ring-primary, standard outline',
      'Cards: subtle shadow increase on hover, 200ms',
    ],
    allowed: [
      'Blue-gray color palettes',
      'Structured grid layouts',
      'Data-visualization-friendly design',
      'Clear information hierarchy',
      'Professional iconography (outline style)',
      'Card-based layouts with consistent spacing',
      'Single font family (neo-grotesque sans)',
    ],
    notAllowed: [
      'Decorative or display fonts',
      'Spring or bounce easing',
      'Shadow profiles heavier than moderate',
      'Gradients on backgrounds',
      'Playful elements or animations',
      'Asymmetric layouts',
      'Animation durations exceeding 300ms',
    ],
    checklist: [
      'Single font family throughout (sans-serif, no serif)',
      'Shadow profile: subtle or moderate only',
      'Information hierarchy is clear within 2 seconds',
      'Layout is grid-aligned with consistent spacing',
      'Color palette is cool and professional (blue-gray)',
      'No animation exceeds 300ms duration',
      'Typography uses neo-grotesque sans (Inter, Helvetica Neue, etc.)',
      'Overall impression: trustworthy, systematic, confident, clear',
    ],
  },

  retro: {
    philosophy: 'Warmth with intention. Nostalgia refined, not replicated.',
    typography: [
      { element: 'Hero text', size: '3xl-5xl', weight: 'bold (700)', color: 'foreground', tracking: 'normal' },
      { element: 'Page titles', size: 'xl-2xl', weight: 'semibold (600)', color: 'foreground', tracking: 'normal' },
      { element: 'Section labels', size: 'sm', weight: 'semibold (600)', color: 'muted-foreground', tracking: 'wide' },
      { element: 'Body text', size: 'base', weight: 'normal (400)', color: 'foreground', tracking: 'normal, warm and readable' },
      { element: 'Display accents', size: 'lg-xl', weight: 'bold (700)', color: 'primary', tracking: 'normal, rounded sans or slab' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '100-150ms', easing: 'ease-out' },
      { type: 'Hover states', duration: '200-300ms', easing: 'ease-out, scale + shadow lift' },
      { type: 'Card transitions', duration: '250-350ms', easing: 'ease-out' },
      { type: 'Page transitions', duration: '300-400ms', easing: 'ease-out' },
      { type: 'Scroll reveals', duration: '400-500ms', easing: 'ease-out' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '64-96px (4-6rem)',
      cardPadding: '24-32px (1.5-2rem)',
      rhythm: 'Comfortable, slightly generous. Not tight, not airy. Cozy.',
    },
    interactions: [
      'Hover: scale(1.02) + shadow lift, ease-out 250ms',
      'Press: scale(0.97), quick return',
      'Focus: ring-2 ring-primary, warm glow',
      'Cards: shadow increase + slight lift on hover',
    ],
    allowed: [
      'Warm color palettes (amber, ochre, cream, brown)',
      'Rounded corners (moderate to rounded)',
      'Visible shadows for depth and tactile feel',
      'Texture hints in backgrounds',
      'Mixed font families (slab/serif + rounded sans)',
      'Vintage-inspired but not dated aesthetic',
      'Warm hue range (20-80)',
    ],
    notAllowed: [
      'Neon or electric colors',
      'Harsh or hard-edge shadows',
      'Minimal/flat design (needs some depth)',
      'Cold blue palettes',
      'Extremely light font weights (below 400)',
      'Brutalist aesthetics',
      'Spring or bounce easing (use ease-out)',
    ],
    checklist: [
      'Color palette feels warm (hue range 20-80)',
      'Border-radius is moderate to rounded throughout',
      'At least one shadow layer provides tactile depth',
      'Fonts have personality but remain readable',
      'Hover states use scale + shadow lift (ease-out, not spring)',
      'Transitions are 200-400ms with ease-out easing',
      'Mixed typography adds character without chaos',
      'Overall impression: inviting, warm, tactile, nostalgic-but-modern',
    ],
  },

  luxury: {
    philosophy: "Whisper, don't shout. Exclusivity through absence.",
    typography: [
      { element: 'Hero text', size: '4xl-7xl', weight: 'thin (200-300)', color: 'foreground', tracking: 'widest' },
      { element: 'Page titles', size: 'xl-3xl', weight: 'light (300)', color: 'foreground', tracking: 'wide' },
      { element: 'Section labels', size: 'xs', weight: 'medium (500)', color: 'muted-foreground', tracking: 'widest, uppercase' },
      { element: 'Body text', size: 'sm-base', weight: 'normal (400)', color: 'foreground', tracking: 'normal' },
      { element: 'Display serif', size: '2xl-4xl', weight: 'light (300)', color: 'foreground', tracking: 'wide, serif' },
    ],
    animation: [
      { type: 'Micro-interactions', duration: '150ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1) (silk-smooth)' },
      { type: 'Hover states', duration: '300-400ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
      { type: 'Card transitions', duration: '400-500ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
      { type: 'Page transitions', duration: '500-700ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
      { type: 'Scroll reveals', duration: '700-1000ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1) (glacial)' },
    ],
    spacing: {
      base: '4px (0.25rem)',
      section: '100-160px (6.25-10rem)',
      cardPadding: '40-56px (2.5-3.5rem)',
      rhythm: 'Opulent spacing. Everything has room to breathe. More extreme than premium.',
    },
    interactions: [
      'Hover: opacity shift (0.8) + subtle shadow elevation, slow',
      'Press: opacity 0.7, glacial return (400ms)',
      'Focus: ring-1 ring-ring, refined',
      'Cards: shadow-dramatic elevation on hover, 400ms silk transition',
    ],
    allowed: [
      'Dark backgrounds with light text (inverted sections)',
      'Gold/champagne accent tones',
      'Dramatic shadow profiles (diffused, for elevation)',
      'Thin horizontal rules as dividers',
      'Serif + thin sans pairing',
      'Letter-spacing as a design tool',
      'Wide tracking on labels and hero text',
    ],
    notAllowed: [
      'Bold weights above 500 at display sizes',
      'More than 2 colors excluding neutrals',
      'Playful or rounded elements',
      'Dense layouts',
      'Casual typography',
      'Visible borders (shadows for separation instead)',
      'Fast or bouncy animations',
    ],
    checklist: [
      'Display text weight is 300 or thinner',
      'Letter-spacing is wide on hero text and labels',
      'At least one dark-background inverted section exists',
      'Shadow profile is dramatic (diffused, for elevation)',
      'Section spacing is 6rem+ between major blocks',
      'Max 2 colors beyond neutrals in the entire design',
      'Serif font used for at least one display element',
      'Overall impression: exclusive, refined, unhurried, effortless',
    ],
  },
}

export function generateDesignBrief(mood: MoodName, themeName: string): string {
  const p = PERSONALITIES[mood]
  const lines: string[] = []

  lines.push(`# Design Brief — ${themeName}`)
  lines.push(``)
  lines.push(`> ${p.philosophy}`)
  lines.push(``)
  lines.push(`**Mood:** ${mood}`)
  lines.push(``)

  // Typography
  lines.push(`## Typography Hierarchy`)
  lines.push(``)
  lines.push(`| Element | Size | Weight | Color | Tracking |`)
  lines.push(`|---------|------|--------|-------|----------|`)
  for (const t of p.typography) {
    lines.push(`| ${t.element} | ${t.size} | ${t.weight} | ${t.color} | ${t.tracking} |`)
  }
  lines.push(``)

  // Animation
  lines.push(`## Animation Timing`)
  lines.push(``)
  lines.push(`| Type | Duration | Easing |`)
  lines.push(`|------|----------|--------|`)
  for (const a of p.animation) {
    lines.push(`| ${a.type} | ${a.duration} | ${a.easing} |`)
  }
  lines.push(``)

  // Spacing
  lines.push(`## Spacing Rhythm`)
  lines.push(``)
  lines.push(`- **Base unit:** ${p.spacing.base}`)
  lines.push(`- **Section gap:** ${p.spacing.section}`)
  lines.push(`- **Card padding:** ${p.spacing.cardPadding}`)
  lines.push(`- **Rhythm:** ${p.spacing.rhythm}`)
  lines.push(``)

  // Interactions
  lines.push(`## Interaction Patterns`)
  lines.push(``)
  for (const i of p.interactions) {
    lines.push(`- ${i}`)
  }
  lines.push(``)

  // Strict Rules
  lines.push(`## Strict Rules`)
  lines.push(``)
  lines.push(`### Allowed`)
  for (const a of p.allowed) {
    lines.push(`- ${a}`)
  }
  lines.push(``)
  lines.push(`### Not Allowed`)
  for (const n of p.notAllowed) {
    lines.push(`- ${n}`)
  }
  lines.push(``)

  // Quality Checklist
  lines.push(`## Quality Checklist`)
  lines.push(``)
  for (const c of p.checklist) {
    lines.push(`- [ ] ${c}`)
  }
  lines.push(``)

  return lines.join('\n')
}
