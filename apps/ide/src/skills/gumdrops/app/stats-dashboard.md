---
name: stats-dashboard
domain: app
intent: KPI cards, metric displays, progress tracking, and data visualization
complexity: intermediate
components: Card, Badge, Progress, Separator
---

# Stats Dashboard

## Recipe
**KPI row:** Grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) of Cards.
Each Card: title (text-xs uppercase text-muted-foreground tracking-wide) +
value (text-3xl font-bold tabular-nums) + change indicator
(text-xs with text-green-600 or text-red-600 based on positive/negative)

**Progress metric:** Card + value/limit display ("2.3 GB / 5 GB") +
progress bar (div h-1 w-full bg-muted rounded-full + inner div with
width based on percentage, bg-primary, transition-all)

**Divider pattern:** Cards in grid with gap-px + parent bg-border creates
1px dividers between cards (no explicit Separator needed)

## Variants
- **kpi-row**: 4 stat Cards with title + value + change. Clean, executive.
- **with-sparklines**: + tiny inline chart in each Card (recharts AreaChart, ~40px, no axes)
- **progress-cards**: Cards showing resource usage with progress bars + limits
- **comparison**: Two-value cards showing current vs previous period with % change

## Interaction Patterns
- Change indicators: compute sign, apply green/red class conditionally
- Progress bars: width % from data, animate with transition-all duration-500
- Stacked progress: multiple colored segments (flexbox, each segment flex-grow by proportion)
- Dotted leaders: border-b-2 border-dotted between label and value for breakdown rows
- Edit capability: Dialog triggered from Card action for editing budgets/limits

## Data Patterns

### Frontend-only
- Stats defined as a static array or computed from local state
- Hardcoded or derived: { label: 'Revenue', value: '$12.4k', change: +12.5 }
- Change indicators calculated at render time

### Full-stack (when Hono backend exists)
- API: GET /api/stats → returns computed metrics from store
- API: GET /api/stats/:metric → detailed breakdown for one metric
- Client hook: useStats() → { stats, isLoading, error, refetch }
- Polling: optional setInterval refetch for live dashboards (every 30s)
- Loading: Skeleton components matching card layout while fetching

## Anti-Patterns
- ❌ Stats without context (raw numbers — add labels, change indicators)
- ❌ All identical Card layouts — vary what's inside each card
- ❌ Too many stats at once — 4-6 max per row, group related metrics
- ❌ Fake precision — round to meaningful digits

## Composition Notes
- Usually at top of dashboard, below navigation
- Follow with detailed Data Table or Activity Feed for drill-down
- Stats + Data Table is the canonical dashboard pattern
