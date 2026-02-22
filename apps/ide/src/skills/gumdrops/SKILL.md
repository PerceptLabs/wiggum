---
name: gumdrops
description: Compositional recipes for building UI sections, app patterns, and full-stack data flows
when_to_use: Building any page sections, dashboards, forms, or multi-section layouts
---

# Gumdrops — Compositional Recipe System

Gumdrops are structured recipes that teach you which @wiggum/stack components compose into which UI patterns. Each recipe is a self-contained section blueprint (~15-40 lines).

**Don't load all recipes.** Search by intent:

```bash
grep skill "pricing section"       # → pricing gumdrop recipe
grep skill "file upload dropzone"  # → upload gumdrop recipe
grep skill "stats dashboard"      # → stats gumdrop recipe
grep skill "hero landing"         # → hero section recipe
```

5 domains, ~50 recipes total:
- **marketing/** — Hero, features, pricing, testimonials, FAQ, CTA, team, social proof, contact, newsletter, blog grid, gallery, portfolio, footer
- **app/** — AI prompt, file upload, command palette, dialog, stats dashboard, data table, grid list, form layout, auth login, sidebar nav, onboarding, settings, chat, notifications, kanban, calendar, search results, empty state, profile, activity feed, file browser
- **content/** — Article layout, documentation, changelog, timeline
- **interactive/** — Drag-drop, multi-step wizard, rich text editor, color picker, keyboard shortcuts

---

## Sequencing Rules

When composing multiple sections into a page, follow these rules:

1. **No adjacent repeats.** Never place two sections with the same dominant component back-to-back. Card grid followed by Card grid = slop.

2. **Density alternation.** Dense section (features grid, data table) → breathing section (CTA, social proof) → dense. Never three dense in a row.

3. **Container variation.** Alternate between contained (`max-w-6xl mx-auto`) and full-bleed sections. Never all one or the other.

4. **Padding rhythm.** Vary section padding: `py-8` → `py-24` → `py-16` → `py-20`. Never uniform padding across all sections.

5. **Background variety.** At least one section per page uses a contrasting background (`bg-muted`, `bg-primary` with inverted text, or subtle gradient).

---

## Component Diversity Rules

1. **Minimum 10 distinct component types per page** from @wiggum/stack.

2. **Maximum 2 sections** can use Card as the primary container.

3. **At least 2 interactive components per page:** Tabs, Accordion, Dialog, Sheet, HoverCard, Collapsible, Command, Popover.

4. **At least 1 navigation component per page:** NavigationMenu, Breadcrumb, Pagination, DropdownMenu.

---

## Page Type Templates

| Page Type | Required Gumdrops | Min Sections | Min Components |
|-----------|-------------------|-------------|----------------|
| Landing/Marketing | hero + features + 1+ social proof + cta + footer | 5-7 | 12+ |
| SaaS Product | hero + features + pricing + faq + cta + footer | 6-8 | 15+ |
| Dashboard | sidebar-nav + stats-dashboard + data-table + 1+ more | 4-6 | 10+ |
| Portfolio | hero + gallery/portfolio + testimonials + contact + footer | 5-6 | 12+ |
| Blog/Content | sidebar-nav + blog-grid + article-layout + footer | 4-5 | 10+ |
| Auth Flow | auth-login + onboarding (optional) | 1-2 | 6+ |
| Settings | sidebar-nav + settings-panel + dialog-modal (confirms) | 3-4 | 10+ |
| Chat App | sidebar-nav + chat-messaging + ai-prompt + command-palette | 3-5 | 12+ |
| Full-Stack CRUD | sidebar-nav + data-table + form-layout + dialog-modal + stats-dashboard | 4-6 | 12+ |

---

## The "Unexpected" Rule

Every page with 5+ sections MUST include at least one section that breaks the expected pattern for that page type:
- Landing page with an interactive demo section (not just static marketing)
- Dashboard with a visual data story (not just tables and charts)
- Settings page with a visual onboarding checklist
- Blog with an embedded interactive component

---

## Component Reach Map

The "you have 60+ components but use 8" problem. Three tiers:

| Intent | Basic (Ralph default) | Better | Best |
|--------|----------------------|--------|------|
| Show features | Card x3 in grid | **Tabs** switching Card panels | **Bento grid** mixed sizes + Badge + HoverCard |
| User quotes | Card + text | Card + **Avatar** + **Badge** role | **ScrollArea** horizontal + **HoverCard** bio |
| Pricing tiers | Card x3 identical | + **Badge** "Popular" + **Separator** | + **Tabs** groups + **Table** comparison + **Switch** toggle |
| Navigation | flex div with links | **NavigationMenu** dropdowns | + **Sheet** mobile + **Command** K + **Breadcrumb** |
| FAQ content | div with text | **Accordion** | **Accordion** grouped by **Tabs** + **Input** search |
| Team display | Card + img | Card + **Avatar** + **Badge** | **HoverCard** on hover + **Dialog** full bio |
| Image display | img grid | **AspectRatio** grid | **Dialog** lightbox + **ScrollArea** + **Tabs** filter |
| Settings | form | **Card** groups | **Tabs** panels + **Switch** + **Select** + **Separator** |
| Data display | div table | **Table** + **Badge** status | + **Pagination** + **DropdownMenu** actions + **Input** filter |
| Progressive content | long scroll | **Accordion** | **Tabs** + **Collapsible** nested + **Sheet** details |
| User input | Input | Input + **Label** + **Select** | + **RadioGroup** cards + **Textarea** + form sections |
| Status/progress | text | **Badge** | **Progress** bar + **Badge** + Card with change indicator |
| File handling | input[type=file] | **Button** + hidden input | Dropzone + **Badge** chips + progress + **Dialog** preview |

**Goal: Always aim for the "Best" column.** The "Basic" column is what you do by default — push past it.

---

## Underused Components (Your Blind Spots)

| Component | What You Don't Know | Where To Use It |
|-----------|-------------------|-----------------|
| HoverCard | Rich hover previews without modal weight | Team members, user avatars, link previews |
| Collapsible | Lighter than Accordion, better for nesting | Sidebar groups, onboarding steps, detail panels |
| Command | Keyboard-first search and navigation | K palette, inline search, action dispatch |
| ScrollArea | Styled scrollable containers | Horizontal testimonials, chat history, file lists |
| AspectRatio | Consistent image/video proportions | Gallery, portfolio, hero images, article covers |
| Popover | Positioned floating content | Color pickers, date pickers, tooltip-like forms |
| Sheet | Slide-in panel (mobile nav, filters, detail) | Mobile menu, filter panels, item detail |
| Breadcrumb | Path navigation | Documentation, file browser, multi-level nav |
| Pagination | Structured page navigation | Tables, search results, blog grids |
| ContextMenu | Right-click menus | File browsers, kanban cards, table rows |
| Kbd | Keyboard shortcut display | Command palette footer, nav hints, tooltips |
| Progress | Visual completion indicator | File upload, onboarding, multi-step wizards |
| Carousel | Embla-powered accessible carousel | Testimonials, image gallery, feature showcase |

---

## Anti-Slop Database

### Layout Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| Card grid x2 adjacent | Two consecutive sections both using grid + Card | Change one to Tabs, Accordion, or different layout |
| Single-component section | Section with only 1 component type | Compose: minimum 3 component types per section |
| Uniform padding | All sections use identical py-* value | Vary: mix py-8, py-12, py-16, py-20, py-24 |
| All centered alignment | Every section uses text-center mx-auto | Mix left-aligned, split, and centered sections |
| Identical layouts | 2+ sections use same grid pattern | Mix: bento, split, single-column, full-bleed |

### Component Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| No interactivity | Zero Tabs/Accordion/Dialog/Sheet/HoverCard | Add at least 2 interactive components |
| Card-heavy page | 50%+ of sections use Card as primary | Swap some for Tabs, Table, Accordion |
| Missing navigation | No NavigationMenu, Breadcrumb, or nav | Add appropriate nav for page type |
| Raw HTML elements | button, input, table instead of stack | Replace with @wiggum/stack components |
| Component poverty | <8 distinct component types on page | Use Component Reach Map to upgrade |

### Theme Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| Purple primary | --primary hue ~260-280 | Choose literally any other hue |
| Hardcoded colors | bg-blue-500, text-gray-700 in code | Use CSS variables: bg-primary, text-muted-foreground |
| No dark mode | Missing .dark selector | Add dark mode variable set |
| Default font | Inter/Roboto as design choice | Choose a distinctive font pairing |
