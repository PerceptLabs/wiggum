---
name: faq
domain: marketing
intent: Frequently asked questions with searchable, categorized answers
complexity: intermediate
components: Accordion, Card, Input, Tabs
---

# FAQ

## Recipe
**Core:** Accordion with AccordionItem per question. AccordionTrigger = question text,
AccordionContent = answer (text-muted-foreground).

**Layout:** max-w-3xl mx-auto for readable line width

**Enhancements:**
- Input search above to filter questions (onChange filters visible AccordionItems)
- Tabs for category grouping (General, Billing, Technical, etc.)
- Card wrapper around each category group
- Contact CTA below: "Still have questions?" + Button link to contact

## Variants
- **simple**: Single Accordion list. Clean, minimal.
- **categorized**: Tabs switching between category-specific Accordion groups.
- **searchable**: Input filter above + Accordion. Best for 15+ questions.
- **two-column**: Grid grid-cols-1 md:grid-cols-2 with Accordion items distributed.

## Interaction Patterns
- Search: useState for query, filter AccordionItems by title/content match
- Tabs: useState for active category, render matching questions
- Accordion: type="single" for one-at-a-time, type="multiple" for multi-open

## Anti-Patterns
- ❌ Long unstructured list without categories — group when 10+ questions
- ❌ Answers longer than a paragraph — keep concise, link to docs for detail
- ❌ No search on large FAQ sets — always add Input filter for 15+ items
- ❌ Using plain divs instead of Accordion — loses accessibility benefits

## Composition Notes
- Natural placement after pricing (what → how much → questions)
- Works as a standalone page section or within a tabbed help center
- Follow with CTA section for users whose question isn't answered
