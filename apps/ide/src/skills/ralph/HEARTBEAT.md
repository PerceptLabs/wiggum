# Ralph Heartbeat

*Periodic quality and creativity check - injected every 5 iterations*

---

## 0. Discover Available Skills

If this is your first iteration, see what guidance is available:

```bash
ls .skills/
cat .skills/stack.md | head -50
```

Search for specific guidance before implementing unfamiliar patterns:

```bash
grep skill "layout patterns"
grep skill "dark mode contrast"
```

**Always grep or cat skills when unsure.** They contain critical rules that prevent bugs.

---

## 1. Uniqueness Check

Ask yourself: "If I removed the text, could someone guess what this project is about?"

If NO → The design isn't speaking. The theme should EVOKE the content.

Examples:
- Coffee shop → warm browns, creams, coffee cup imagery in spacing/layout
- Tech startup → crisp blues, whites, geometric precision
- Creative agency → bold, unexpected color combinations

---

## 2. Inspiration Scan

If you haven't explored creativity patterns this session:

```bash
grep skill "layout patterns"
grep skill "bento grid OR split screen"
```

Pick ONE idea from the skill and apply it. Don't overload.

---

## 3. Polish Inventory

Quick check for micro-interactions:

```bash
grep -r "hover:\|transition\|animate-" src/ | wc -l
```

- 0-2 files → Add subtle hover states, transitions
- 3-5 files → Good balance
- 6+ files → Check it's not overdone

---

## 4. Structure Review

Check what's actually rendering:

```bash
cat -q .ralph/rendered-structure.md || echo "No structure captured yet"
```

Does the structure match user intent?
- Sections should be logical groupings
- Navigation should be present if multi-section
- CTAs should stand out

---

## 5. Quick Gut Check

Do the colors FEEL like the project?

- Generic palette? Iterate.
- Colors fighting each other? Simplify.
- Too safe/boring? Add one bold accent.

---

## 6. Design Follow-Through (iteration 5+)

If you wrote a Direction section in `.ralph/plan.md`, verify you followed through:

```bash
cat .ralph/plan.md | grep -A5 "Direction"
```

Check each commitment:
1. **Palette match:** Does `src/index.css` use the colors you committed to?
2. **Font match:** Are the fonts you specified loaded in `index.html` `<link>` tags?
3. **Layout match:** Did you use the layout pattern you chose (split/bento/overlapping)?
4. **Differentiator present:** Is the "one thing someone will remember" actually visible?

If any answer is NO — fix it before marking complete. The Direction section is a commitment, not a suggestion.

---

## 7. Log This Heartbeat

After reflection, note what you improved (or that all's clear):

```bash
echo "HEARTBEAT: [describe improvement or 'all clear']" >> .ralph/plan.md
```

---

## When This Runs

The harness injects this heartbeat at iterations 1, 6, 11, 16... (every 5 iterations).

Use it as a moment to step back and ensure quality, not just completion.
