---
name: react-best-practices
description: React/Next.js performance patterns - 57 rules from Vercel Engineering
when_to_use: Writing React components, optimizing performance, avoiding waterfalls, code review
---

# React Best Practices

57 rules organized by impact level. Apply when writing React/Next.js code.

## 1. Eliminating Waterfalls (CRITICAL)

### 1.1 Move await into branches
```tsx
// BAD: blocks even when not needed
const data = await fetchData()
if (condition) return data

// GOOD: await only when needed
if (condition) {
  const data = await fetchData()
  return data
}
```

### 1.2 Parallelize with Promise.all
```tsx
// BAD: sequential (slow)
const users = await getUsers()
const posts = await getPosts()

// GOOD: parallel (fast)
const [users, posts] = await Promise.all([getUsers(), getPosts()])
```

### 1.3 Use Suspense boundaries
```tsx
// GOOD: render layout while data loads
<Suspense fallback={<Loading />}>
  <DataComponent />
</Suspense>
```

### 1.4 Defer secondary data
```tsx
// GOOD: show primary content first
<Suspense fallback={<PrimarySkeleton />}>
  <PrimaryContent />
  <Suspense fallback={<SecondarySkeleton />}>
    <SecondaryContent />
  </Suspense>
</Suspense>
```

## 2. Bundle Size Optimization (CRITICAL)

### 2.1 Direct imports (avoid barrel files)
```tsx
// BAD: imports entire package tree
import { Button } from '@/components'

// GOOD: imports only Button
import { Button } from '@/components/ui/button'
```

### 2.2 Dynamic imports for heavy components
```tsx
const HeavyChart = dynamic(() => import('./Chart'), { ssr: false })
const PDFViewer = dynamic(() => import('./PDFViewer'), { loading: () => <Spinner /> })
```

### 2.3 Defer non-critical libraries
```tsx
// Load analytics after hydration
useEffect(() => {
  import('analytics').then(({ init }) => init())
}, [])
```

### 2.4 Script loading
```tsx
// GOOD: defer non-critical scripts
<Script src="analytics.js" strategy="lazyOnload" />
```

## 3. Server-Side Performance (HIGH)

### 3.1 Use React.cache() for deduplication
```tsx
const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

### 3.2 Pass minimal data across RSC boundaries
```tsx
// BAD: passing entire object
<ClientComponent user={user} />

// GOOD: pass only needed fields
<ClientComponent userName={user.name} userId={user.id} />
```

### 3.3 Use after() for non-blocking operations
```tsx
export async function POST() {
  const result = await saveData()
  after(() => { sendAnalytics() }) // Non-blocking
  return result
}
```

### 3.4 Authenticate in Server Actions
```tsx
// ALWAYS check auth in Server Actions - they're public endpoints
export async function updateUser(data) {
  const user = await getSession()
  if (!user) throw new Error('Unauthorized')
  // proceed...
}
```

## 4. Re-render Optimization (MEDIUM)

### 4.1 Compute derived values during render
```tsx
// BAD: state for derived value
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(`${first} ${last}`), [first, last])

// GOOD: compute during render
const fullName = `${first} ${last}`
```

### 4.2 Use functional setState
```tsx
// BAD: stale closure risk
setCount(count + 1)

// GOOD: always fresh value
setCount(prev => prev + 1)
```

### 4.3 useRef for transient values
```tsx
// Values that change frequently but don't need re-render
const mousePos = useRef({ x: 0, y: 0 })
const timeoutId = useRef<number>()
```

### 4.4 Extract memoized components
```tsx
// GOOD: expensive work isolated
const MemoizedList = memo(({ items }) => (
  items.map(item => <ExpensiveItem key={item.id} {...item} />)
))
```

### 4.5 Optimize dependency arrays
```tsx
// BAD: object recreated every render
useEffect(() => {}, [{ id: 1 }])

// GOOD: stable reference
const config = useMemo(() => ({ id: 1 }), [])
useEffect(() => {}, [config])
```

## 5. Rendering Performance (MEDIUM)

### 5.1 Hoist static JSX
```tsx
// BAD: recreated every render
function Component() {
  const icon = <Icon />
  return <div>{icon}</div>
}

// GOOD: created once
const icon = <Icon />
function Component() {
  return <div>{icon}</div>
}
```

### 5.2 Use ternary over &&
```tsx
// BAD: renders "0" when empty
{items.length && <List />}

// GOOD: explicit false
{items.length > 0 ? <List /> : null}
```

### 5.3 Key stability
```tsx
// BAD: unstable key
{items.map((item, i) => <Item key={i} />)}

// GOOD: stable ID
{items.map(item => <Item key={item.id} />)}
```

### 5.4 Prevent hydration flicker
```tsx
// Inject theme script before React
<script dangerouslySetInnerHTML={{ __html: themeScript }} />
```

## 6. JavaScript Performance (LOW-MEDIUM)

### 6.1 Use Maps for lookups
```tsx
// BAD: O(n) every lookup
const user = users.find(u => u.id === id)

// GOOD: O(1) lookup
const userMap = new Map(users.map(u => [u.id, u]))
const user = userMap.get(id)
```

### 6.2 Combine array operations
```tsx
// BAD: multiple iterations
items.filter(x => x.active).map(x => x.name)

// GOOD: single pass
items.reduce((acc, x) => x.active ? [...acc, x.name] : acc, [])
```

### 6.3 Early returns
```tsx
function process(data) {
  if (!data) return null
  if (data.cached) return data.cached
  // expensive computation only when needed
}
```

### 6.4 Cache expensive computations
```tsx
const expensiveResult = useMemo(() => {
  return items.reduce((sum, item) => sum + complexCalc(item), 0)
}, [items])
```

## Summary: Priority Order

1. **CRITICAL**: Fix waterfalls, optimize bundle size
2. **HIGH**: Server-side caching, minimal RSC data
3. **MEDIUM**: Re-render optimization, rendering perf
4. **LOW**: JS micro-optimizations (only in hot paths)
