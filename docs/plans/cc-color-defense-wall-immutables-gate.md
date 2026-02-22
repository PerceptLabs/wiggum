Read docs/plans/cc-color-defense-system.md — that's the full spec. Implement Layers 1, 2, and 4. NOT Layer 3 (theme extend — that's a follow-up).

Summary of what to do:

**Layer 1 — The Wall.** In `apps/ide/src/lib/build/tailwind-compiler.ts`, change `@theme {` to `@theme inline {`. Add `--color-white: #ffffff`, `--color-black: #000000`, `--color-transparent: transparent`, `--color-current: currentColor` inside the block. Add a `parseExtendedColors(css)` function that finds `/* theme-extended: <name> */` markers and returns name strings. Modify `compileTailwind` to accept optional `indexCss` param — when present, dynamically inject `--color-<name>: var(--<name>)` entries into the theme block for each extended color found.

**Wire it.** In `apps/ide/src/lib/build/index.ts`, read `src/index.css` from the virtual fs before calling `compileTailwind`, pass it as the second arg.

**Layer 2 — The Immutables.** In `apps/ide/src/lib/ralph/loop.ts`, insert the "IMMUTABLE LAWS — COLOR & THEME" section from the spec into `BASE_SYSTEM_PROMPT` after CRITICAL RULES, before Your Environment. Also update the SHELL_TOOL description and Theming section per the spec.

**Layer 4 — The Gate.** In `apps/ide/src/lib/ralph/gates.ts`, add `no-hardcoded-colors` gate after `css-theme-complete`, before `build-succeeds`. Scans .tsx/.ts in src/ for Tailwind color-shade patterns, raw color functions (oklch/hsl/rgb/rgba), and hex literals. Fails with actionable feedback pointing to semantic tokens and theme extend.

**Tests.** Add tests in tailwind-compiler.test.ts (inline blocks defined tokens, rejects defaults, extended markers work) and gates.test.ts (catches text-lime-400, passes text-primary, catches oklch() in tsx).

**Do NOT touch:** packages/stack/, apps/ide/src/index.css, css-smart-merge.ts, theme files, or implement theme extend command.
