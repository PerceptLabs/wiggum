---
name: portfolio
domain: marketing
intent: Project showcase with case studies, filters, and detail views
complexity: intermediate
components: Card, Badge, Dialog, Tabs, AspectRatio
---

# Portfolio

## Recipe
**Core:** Grid of project Cards, each with AspectRatio cover image +
title + Badge tags (tech/category) + short description.
Click opens Dialog with full case study or navigates to detail page.

**Layout options:**
- Card grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Bento: asymmetric grid with featured project col-span-2
- List: horizontal Cards in single column with more detail visible

**Enhancements:**
- Tabs or Badge filter for categories (Web, Mobile, Branding)
- Dialog for quick preview without page navigation
- Hover overlay on Card with project title + "View Case Study" link
- AspectRatio for consistent image sizing across Cards

## Variants
- **card-grid**: Uniform Cards with image + title + tags. Standard.
- **bento-featured**: Featured project large, others in grid. Editorial.
- **filterable**: Tabs for category + grid below. Organized.
- **detail-dialog**: Click Card opens Dialog with full case study. In-page browsing.

## Anti-Patterns
- ❌ No project images — visual showcase needs visuals
- ❌ All Cards identical size — vary for visual hierarchy
- ❌ No category filtering for 8+ projects — Tabs or Badge filters required
- ❌ Missing tech/role badges — context helps users evaluate relevance

## Composition Notes
- Central section for portfolio/agency sites
- Pairs with testimonials for credibility reinforcement
- Follow with contact section for conversion
- Works as standalone route (/work, /projects)
