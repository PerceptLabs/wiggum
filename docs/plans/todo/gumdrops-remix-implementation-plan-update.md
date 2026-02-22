# Gumdrops Remix — Composable Block Atoms for Wiggum

## The Problem

Wiggum has 54 atoms in @wiggum/stack. Wiggum has 47 markdown essays describing how to arrange those atoms. Between these two layers is a void — no actual composed code for Ralph to reference.

The shadcn ecosystem has the same gap. Everyone ships either raw atoms or frozen monolithic blocks. Nobody carries the compound component pattern — the thing that makes Card → CardHeader → CardContent so powerful — up to the block level.

Gumdrops Remix fixes this. Every gumdrop becomes a set of thin, composable block atoms that Ralph reads, understands, and writes fresh every time. Not imported. Not frozen. Composable in any arrangement.

```
Before:
  Card, Button, Badge (atoms) → ??? → Finished app

After:
  Card, Button, Badge (atoms)
       ↓
  PricingGrid, PricingTier, PricingPrice (block atoms)  ← THIS IS NEW
       ↓
  Finished app (Ralph composes fresh every time)
```

---

## Philosophy

### Three Properties

**Composable** — Block atoms nest and combine freely. PricingTier wraps PricingPrice + PricingFeatures + PricingCTA. But it also wraps anything else. A Chart. An Avatar stack. A custom element the gumdrop never imagined. Containers don't restrict children.

**Remixable** — The same pieces make different things. PricingTier + PricingGrid = traditional tiered layout. PricingTier alone = single-plan hero pricing. PricingTier + PricingComparison = feature comparison table. Ralph rearranges, skips, reorders, nests differently. Output varies because pieces don't prescribe layout.

**Modular** — Each piece is independent. PricingPrice doesn't need PricingFeatures. PricingBadge doesn't need PricingHeader. Use what you need, skip what you don't. Same as how CardFooter is optional on Card.

### What Block Atoms Are NOT

- **Not importable library components.** Ralph doesn't `import { PricingGrid } from '@wiggum/blocks'`. Ralph reads the reference, then writes its own version.
- **Not frozen templates.** No `hero-06.tsx` that renders one layout forever.
- **Not prose recipes.** No more "use Badge above CardTitle with Button variant outline."
- **Not design-opinionated.** Block atoms are structural. Theme flows through CSS variables automatically. The same PricingTier renders neobrutalist or glassmorphic depending on the active theme.

### How Ralph Uses Them

Ralph's workflow per section:

1. `grep skill "pricing section"` → loads the gumdrop recipe (L0 markdown, ~30 lines)
2. Recipe names the block atoms and shows 3-4 remix arrangements
3. If Ralph needs more detail: `cat skills/gumdrops/marketing/pricing.ref.tsx` → reads the L1 reference (real code, ~80-120 lines)
4. Ralph writes its own composition, informed but never copying
5. Anti-slop gate: if output is >80% structurally identical to reference, flag it

---

## Architecture

### The Compound Pattern, One Level Up

shadcn already proved this works at the atom level:

```tsx
// Atom: Card (shadcn pattern)
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Desc</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

Gumdrops Remix applies the same pattern at the block level:

```tsx
// Block: Pricing (gumdrops remix pattern)
<Pricing>
  <PricingHeader>
    <PricingBadge>Launch offer</PricingBadge>
    <PricingHeading>Simple pricing</PricingHeading>
    <PricingToggle />
  </PricingHeader>
  <PricingGrid>
    <PricingTier>
      <PricingPrice amount={9} interval="mo" />
      <PricingFeatures>
        <PricingFeature included>5 projects</PricingFeature>
      </PricingFeatures>
      <PricingCTA>Start free</PricingCTA>
    </PricingTier>
  </PricingGrid>
</Pricing>
```

Each sub-component is a thin wrapper around existing atoms:
- `PricingTier` → Card with merged defaults (border-0, shadow-none, or elevated — variant prop)
- `PricingPrice` → formatted span with tabular-nums
- `PricingCTA` → Button with full-width default
- `PricingFeature` → list item with Check/X icon
- `PricingGrid` → grid div with responsive columns + divide-x (or gap, or custom)

### Block Atom Anatomy

Every block atom follows this contract:

```tsx
interface BlockAtomProps {
  children?: ReactNode    // composable — accepts anything
  className?: string      // remixable — override any styling
  // + domain-specific props (amount, featured, included, etc.)
}
```

Every block atom:
1. Wraps one or more @wiggum/stack atoms internally
2. Accepts `children` for free composition
3. Accepts `className` for CSS override
4. Consumes CSS variables (themed for free)
5. Has a `variant` prop when multiple visual treatments exist
6. Is 5-20 lines of code (thin wrappers, not logic)

### File Structure

```
skills/gumdrops/
├── SKILL.md                           # Updated index + remix composition rules
├── marketing/
│   ├── hero.md                        # L0: Recipe + remix arrangements (updated)
│   ├── hero.ref.tsx                   # L1: Reference implementation (NEW)
│   ├── pricing.md
│   ├── pricing.ref.tsx
│   ├── features.md
│   ├── features.ref.tsx
│   ├── testimonials.md
│   ├── testimonials.ref.tsx
│   ├── ... (14 total)
├── app/
│   ├── stats-dashboard.md
│   ├── stats-dashboard.ref.tsx
│   ├── data-table.md
│   ├── data-table.ref.tsx
│   ├── ... (21 total)
├── content/                           # 4 total
├── interactive/                       # 7 total (was 5, adding 2)
├── api/                               # 6 total (unchanged — server patterns, no block atoms)
└── shells/                            # 10 total (NEW — full-stack multi-pane applications)
    ├── data-observatory.md
    ├── data-observatory.ref.tsx
    ├── pricing-lab.md
    ├── pricing-lab.ref.tsx
    ├── ... (10 total)
```

Each gumdrop gets a `.md` (recipe) and `.ref.tsx` (reference). API gumdrops keep markdown-only since they're server patterns, not visual compositions. Shell gumdrops are larger refs (~150-250 lines) that wire multiple gumdrops + Hono API layers together.

**Total new files: ~51 reference .tsx files** (47 section gumdrops minus 6 API-only = 41, plus 10 shells)

---

## The Remix Catalog

### Design Principle: Unexpected Combinations

AI slop comes from predictable composition. Card grid. Card grid. Card grid. The antidote is compositions that cross domain boundaries — putting things together that AI agents wouldn't default to.

### Cross-Component Compositions

These are the non-boring combos that make Wiggum's output distinctive. Each one shows how block atoms from different gumdrops can nest inside each other.

#### 1. Card × Table (Data Surface)

Table lives inside a Card. The Card provides surface, header, and actions. The Table provides structured data. Not a dashboard widget — a self-contained data surface.

```tsx
<Card>
  <CardHeader className="flex-row items-center justify-between">
    <div>
      <CardTitle>Recent Orders</CardTitle>
      <CardDescription>Last 30 days</CardDescription>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">Export</Button>
      </DropdownMenuTrigger>
      {/* ... */}
    </DropdownMenu>
  </CardHeader>
  <CardContent className="p-0"> {/* flush table edges */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.id}</TableCell>
            <TableCell><Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>{order.status}</Badge></TableCell>
            <TableCell className="text-right">{order.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
  <CardFooter className="text-xs text-muted-foreground justify-between">
    <span>Showing 1-10 of 47</span>
    <Pagination>{/* ... */}</Pagination>
  </CardFooter>
</Card>
```

**Why it's interesting:** The Card isn't decorative. It provides the action header (Export dropdown) and the pagination footer. The Table is flush-mounted (p-0 on CardContent) so it bleeds to the Card edges. One unified surface.

#### 2. Form × Drawer (Edit-in-Context)

Form slides in from the side without leaving the current view. Click a table row → Drawer opens with edit form. Save → Drawer closes, table updates.

```tsx
<Drawer>
  <DrawerTrigger asChild>
    <TableRow className="cursor-pointer hover:bg-muted/50">
      {/* row content */}
    </TableRow>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Edit Customer</DrawerTitle>
      <DrawerDescription>Update customer details</DrawerDescription>
    </DrawerHeader>
    <div className="px-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={...} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={...}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <DrawerFooter>
      <Button onClick={handleSave}>Save changes</Button>
      <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

**Why it's interesting:** No modal obscuring context. No page navigation. The user sees the data they're editing while the form is open.

#### 3. Stats Cards × Collapsible (Progressive Disclosure)

Stats that expand to show detail. Click a KPI card → it expands inline to reveal breakdown, sparkline, or drill-down data.

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(stat => (
    <Collapsible key={stat.label}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardDescription>{stat.label}</CardDescription>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </div>
            <CardTitle className="text-3xl tabular-nums">{stat.value}</CardTitle>
            <span className={cn("text-xs", stat.change > 0 ? "text-green-600" : "text-red-600")}>
              {stat.change > 0 ? "+" : ""}{stat.change}%
            </span>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-3" />
            <div className="space-y-2 text-sm">
              {stat.breakdown.map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  ))}
</div>
```

**Why it's interesting:** Progressive disclosure. You see headline numbers, then expand what's interesting. Stats grid stays compact until you need depth.

#### 4. Kanban × Sheet (Detail Panel)

Kanban cards are compact summaries. Click one → Sheet slides in from the right with full detail, comments, activity log. Board stays visible.

```tsx
<Sheet>
  <div className="flex gap-4 overflow-x-auto p-4">
    {columns.map(col => (
      <div key={col.id} className="w-72 shrink-0 space-y-2">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-semibold text-sm">{col.title}</h3>
          <Badge variant="secondary">{col.cards.length}</Badge>
        </div>
        {col.cards.map(card => (
          <SheetTrigger key={card.id} asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="p-3">
                <CardTitle className="text-sm">{card.title}</CardTitle>
              </CardHeader>
              <CardFooter className="p-3 pt-0 gap-2">
                <Badge variant="outline" className="text-xs">{card.priority}</Badge>
                <Avatar className="h-5 w-5"><AvatarImage src={card.assignee.avatar} /></Avatar>
              </CardFooter>
            </Card>
          </SheetTrigger>
        ))}
      </div>
    ))}
  </div>
  <SheetContent className="w-[500px]">
    <SheetHeader>
      <SheetTitle>{selected?.title}</SheetTitle>
    </SheetHeader>
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
      </TabsList>
      <TabsContent value="details">{/* full form */}</TabsContent>
      <TabsContent value="activity">{/* timeline */}</TabsContent>
      <TabsContent value="comments">{/* threaded comments */}</TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

**Why it's interesting:** Sheet provides an entire app panel (with Tabs for sub-navigation) without navigating away. Feels like a native app.

#### 5. Table × HoverCard (Inline Preview)

Table rows that reveal rich previews on hover. No click required.

```tsx
<TableCell>
  <HoverCard>
    <HoverCardTrigger asChild>
      <button className="flex items-center gap-2 hover:underline">
        <Avatar className="h-6 w-6"><AvatarImage src={user.avatar} /></Avatar>
        {user.name}
      </button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80">
      <div className="flex gap-4">
        <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /></Avatar>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{user.name}</h4>
          <p className="text-xs text-muted-foreground">{user.bio}</p>
          <Badge variant="secondary">{user.plan}</Badge>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
</TableCell>
```

**Why it's interesting:** Information density without overload. Table stays clean. HoverCard adds a rich layer on demand.

#### 6. Accordion × Form (Sectioned Input)

Long forms broken into Accordion sections. All visible as collapsed headers. Expand one to fill it. Completed sections show checkmarks.

```tsx
<Accordion type="single" collapsible defaultValue="personal">
  <AccordionItem value="personal">
    <AccordionTrigger className="flex items-center gap-2">
      {completed.personal && <Check className="h-4 w-4 text-green-500" />}
      Personal Information
    </AccordionTrigger>
    <AccordionContent className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First name</Label>
          <Input value={form.firstName} onChange={...} />
        </div>
        <div className="space-y-2">
          <Label>Last name</Label>
          <Input value={form.lastName} onChange={...} />
        </div>
      </div>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="address">{/* ... */}</AccordionItem>
  <AccordionItem value="payment">{/* ... */}</AccordionItem>
</Accordion>
```

**Why it's interesting:** Beats long-scroll forms AND wizard steps. Users navigate non-linearly. Completed sections collapse to one line with a checkmark.

#### 7. Command × Data Grid (Search-Driven Interface)

Command palette IS the primary interface. Type to filter a live grid. Every keystroke updates visible data.

```tsx
<Command className="border rounded-lg">
  <CommandInput placeholder="Search customers..." />
  <CommandList>
    <CommandEmpty>No customers found.</CommandEmpty>
    <CommandGroup>
      {filtered.map(customer => (
        <CommandItem key={customer.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8"><AvatarImage src={customer.avatar} /></Avatar>
            <div>
              <span className="font-medium">{customer.name}</span>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <Badge variant={customer.active ? "default" : "secondary"}>{customer.plan}</Badge>
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

**Why it's interesting:** Keyboard-first, fuzzy-matched, instant. No submit button. Fundamentally different interaction model than Input + Table.

#### 8. Timeline × Card × Collapsible (Rich History)

Activity timeline where each entry is a Card that can expand. Not just text timestamps — rich, interactive history.

```tsx
<div className="relative pl-8 space-y-6">
  <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
  {events.map(event => (
    <div key={event.id} className="relative">
      <div className={cn(
        "absolute -left-8 top-3 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center",
        event.type === 'milestone' ? "bg-primary" : "bg-muted"
      )}>{event.icon}</div>
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5"><AvatarImage src={event.user.avatar} /></Avatar>
                  <CardTitle className="text-sm">{event.title}</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">{event.timestamp}</span>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {event.detail}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  ))}
</div>
```

#### 9. Tabs × Mixed Gumdrops (Dashboard Zones)

Each tab is a completely different gumdrop. Tab 1: stats cards. Tab 2: data table. Tab 3: chart. Tab 4: activity feed.

```tsx
<Tabs defaultValue="overview">
  <TabsList className="w-full justify-start">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="customers">Customers</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">{/* Stats gumdrop */}</TabsContent>
  <TabsContent value="customers">{/* Data table gumdrop */}</TabsContent>
  <TabsContent value="analytics">{/* Chart compositions */}</TabsContent>
  <TabsContent value="activity">{/* Timeline gumdrop */}</TabsContent>
</Tabs>
```

**Why it's interesting:** Focused "zones" instead of showing everything. Each zone is a complete gumdrop pattern. Page feels like a native app with views.

#### 10. Settings × Switch × Drawer (Progressive Settings)

Simple settings are Switch toggles. Complex settings open a Drawer with advanced options.

```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <Label>Email Notifications</Label>
      <p className="text-xs text-muted-foreground">Receive email updates</p>
    </div>
    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
  </div>
  <Separator />
  <div className="flex items-center justify-between">
    <div>
      <Label>Two-Factor Authentication</Label>
      <p className="text-xs text-muted-foreground">Extra layer of security</p>
    </div>
    <Drawer>
      <DrawerTrigger asChild><Switch checked={twoFactorEnabled} /></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>Set Up 2FA</DrawerTitle></DrawerHeader>
        <div className="px-4 space-y-4">
          <RadioGroup value={method} onValueChange={setMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="app" id="app" />
              <Label htmlFor="app">Authenticator App</Label>
            </div>
          </RadioGroup>
          <InputOTP maxLength={6}>{/* ... */}</InputOTP>
        </div>
        <DrawerFooter><Button>Enable 2FA</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </div>
</div>
```

#### 11. File Browser × AspectRatio × ContextMenu (Rich File Grid)

Finder-style file browser with thumbnails, right-click menus, and consistent aspect ratios.

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
  {files.map(file => (
    <ContextMenu key={file.id}>
      <ContextMenuTrigger>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <AspectRatio ratio={4/3} className="rounded-sm overflow-hidden bg-muted mb-2">
              {file.type === 'image' ? (
                <img src={file.thumbnail} alt="" className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </AspectRatio>
            <p className="text-xs font-medium truncate">{file.name}</p>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Download</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ))}
</div>
```

#### 12. Pricing Merged Surface (Cards as Invisible Structure)

Three Cards that look like one unit. No individual borders. Cards provide padding/spacing only.

```tsx
<div className="border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-x">
  <Card className="border-0 rounded-none shadow-none bg-transparent">
    <CardHeader><CardDescription>Starter</CardDescription><CardTitle className="text-4xl font-light">$9</CardTitle></CardHeader>
    <CardContent><Separator className="mb-4" /><ul>{/* features */}</ul></CardContent>
    <CardFooter><Button variant="ghost" className="w-full">Choose plan</Button></CardFooter>
  </Card>
  <Card className="border-0 rounded-none shadow-none bg-primary/5">
    {/* featured — tinted background */}
  </Card>
  <Card className="border-0 rounded-none shadow-none bg-transparent">
    {/* third tier */}
  </Card>
</div>
```

#### 13. Chat × Card (Rich Messages)

Chat where messages contain structured Card content — product recs, booking confirmations, interactive actions.

```tsx
<ScrollArea className="h-[500px] p-4">
  <div className="space-y-4">
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">...</Avatar>
      <Card className="max-w-[80%]">
        <CardHeader className="p-3">
          <Badge variant="secondary">Recommended</Badge>
          <CardTitle className="text-sm">Nike Air Max 90</CardTitle>
          <CardDescription>$129.99 · Free shipping</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <AspectRatio ratio={16/9} className="rounded-sm overflow-hidden bg-muted">
            <img src="..." className="object-cover w-full h-full" />
          </AspectRatio>
        </CardContent>
        <CardFooter className="p-3 pt-0 gap-2">
          <Button size="sm" className="flex-1">Add to cart</Button>
          <Button size="sm" variant="outline">Save</Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</ScrollArea>
```

#### 14. Onboarding × Progress × Tabs (Non-Linear Setup)

Steps as visible Tabs. Users jump between steps. Completed steps show indicators. Not a locked wizard.

```tsx
<div className="max-w-2xl mx-auto space-y-6">
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Setup progress</span>
      <span className="text-muted-foreground">{completed}/{total} complete</span>
    </div>
    <Progress value={(completed / total) * 100} />
  </div>
  <Tabs value={activeStep} onValueChange={setActiveStep}>
    <TabsList className="w-full">
      {steps.map(step => (
        <TabsTrigger key={step.id} value={step.id} className="flex items-center gap-1.5">
          {step.completed ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5" />}
          {step.title}
        </TabsTrigger>
      ))}
    </TabsList>
    <TabsContent value="profile"><Card>{/* form */}</Card></TabsContent>
    <TabsContent value="workspace">{/* ... */}</TabsContent>
    <TabsContent value="integrations">{/* ... */}</TabsContent>
  </Tabs>
</div>
```

#### 15. Navigation × HoverCard (Mega-Menu)

Nav items show rich previews — product images, descriptions. Not just dropdown links.

```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Products</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid grid-cols-2 gap-4 p-6 w-[600px]">
          {products.map(product => (
            <NavigationMenuLink key={product.slug} asChild>
              <a className="flex gap-4 p-3 rounded-md hover:bg-muted transition-colors">
                <AspectRatio ratio={1} className="w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                  <img src={product.image} alt="" className="object-cover w-full h-full" />
                </AspectRatio>
                <div>
                  <div className="font-medium text-sm">{product.name}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                </div>
              </a>
            </NavigationMenuLink>
          ))}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

### Paradigm Remixes (Cross-Domain Mashups)

The 15 compositions above are structural — nesting components from the same or adjacent domains (Table inside Card, Form inside Drawer). Paradigm remixes are different. They cross domain boundaries entirely, combining block atoms from unrelated gumdrops to redefine what an interface *is*.

#### 16. Spatial Context Builder (AI Prompt × Drag-Drop × File Browser)

AI context assembly as a visual staging area instead of a text box. Users drag files into a drop zone; dropped items collapse into Badge atoms inside the prompt input.

```tsx
<div className="grid grid-cols-[300px_1fr] gap-4 h-[600px]">
  {/* File source panel */}
  <Card className="overflow-hidden">
    <CardHeader className="py-3">
      <CardTitle className="text-sm">Context Files</CardTitle>
      <CommandInput placeholder="Filter files..." />
    </CardHeader>
    <CardContent className="p-0">
      <ScrollArea className="h-[500px]">
        {files.map(file => (
          <div
            key={file.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("file", JSON.stringify(file))}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-grab active:cursor-grabbing"
          >
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
            <Badge variant="outline" className="ml-auto text-xs shrink-0">{file.size}</Badge>
          </div>
        ))}
      </ScrollArea>
    </CardContent>
  </Card>

  {/* Context staging area */}
  <div className="flex flex-col gap-4">
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const file = JSON.parse(e.dataTransfer.getData("file"))
        setContextFiles(prev => [...prev, file])
        setDragOver(false)
      }}
      className={cn(
        "flex-1 border-2 border-dashed rounded-lg p-4 transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {contextFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Upload className="h-8 w-8 mb-2" />
          <p className="text-sm">Drag files here to build context</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {contextFiles.map(file => (
            <Badge key={file.id} variant="secondary" className="gap-1 pr-1">
              <FileIcon className="h-3 w-3" />
              {file.name}
              <button
                onClick={() => setContextFiles(prev => prev.filter(f => f.id !== file.id))}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>

    {/* Prompt input with context badges inline */}
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {contextFiles.map(file => (
          <Badge key={file.id} variant="outline" className="text-xs gap-1">
            <FileIcon className="h-3 w-3" />{file.name}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea placeholder="Ask about these files..." className="min-h-[80px]" />
        <Button className="self-end shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</div>
```

**Why it's a paradigm remix:** AI prompting becomes spatial manipulation. File browser atoms, drag-drop atoms, and AI prompt atoms converge into an interface that doesn't exist in any domain individually. Context building becomes tactile — you see what the AI will read, rearrange it, remove files by clicking Badge × buttons. This is what AI interfaces should feel like.

**Gumdrops crossed:** ai-prompt × drag-drop × file-browser × command-palette

#### 17. Inbox-Style Kanban (Data Table × Sheet × Chat Messages)

Project management that feels like an email client. Left side is a dense DataTable. Clicking a row slides out a Sheet where task history is rendered as a threaded conversation.

```tsx
<div className="grid grid-cols-[1fr_0] data-[open=true]:grid-cols-[1fr_500px] transition-all" data-open={!!selectedTask}>
  {/* Dense task table — left panel */}
  <div className="border-r">
    <DataTableToolbar>
      <Input placeholder="Filter tasks..." className="max-w-sm" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Status</Button></DropdownMenuTrigger>
        <DropdownMenuContent>{/* filter options */}</DropdownMenuContent>
      </DropdownMenu>
    </DataTableToolbar>
    <Table>
      <TableBody>
        {tasks.map(task => (
          <TableRow
            key={task.id}
            onClick={() => setSelectedTask(task)}
            className={cn("cursor-pointer", selectedTask?.id === task.id && "bg-muted")}
          >
            <TableCell className="w-8">
              <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} />
            </TableCell>
            <TableCell>
              <div>
                <span className="font-medium text-sm">{task.title}</span>
                <p className="text-xs text-muted-foreground line-clamp-1">{task.lastMessage}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                {task.priority}
              </Badge>
            </TableCell>
            <TableCell>
              <Avatar className="h-5 w-5"><AvatarImage src={task.assignee.avatar} /></Avatar>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{task.updatedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* Task conversation — right panel */}
  {selectedTask && (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{selectedTask.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{selectedTask.status}</Badge>
            <Avatar className="h-4 w-4"><AvatarImage src={selectedTask.assignee.avatar} /></Avatar>
            <span className="text-xs text-muted-foreground">{selectedTask.assignee.name}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {selectedTask.history.map(event => (
            <div key={event.id} className="flex gap-3">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={event.user.avatar} />
              </Avatar>
              {event.type === 'comment' ? (
                <div className="rounded-lg bg-muted p-3 max-w-[90%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{event.user.name}</span>
                    <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                  </div>
                  <p className="text-sm">{event.content}</p>
                </div>
              ) : event.type === 'status_change' ? (
                <Card className="max-w-[90%] bg-muted/50">
                  <CardContent className="p-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{event.user.name} changed status</span>
                    <Badge variant="outline">{event.from}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge>{event.to}</Badge>
                  </CardContent>
                </Card>
              ) : event.type === 'file' ? (
                <Card className="max-w-[90%]">
                  <CardContent className="p-2 flex items-center gap-3">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{event.fileName}</p>
                      <p className="text-xs text-muted-foreground">{event.fileSize}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex gap-2">
        <Input placeholder="Add a comment..." className="flex-1" />
        <Button size="sm">Send</Button>
      </div>
    </div>
  )}
</div>
```

**Why it's a paradigm remix:** Project management reframed as conversation. Status changes, file uploads, and comments appear in a single threaded feed using ChatRichMessage patterns. The dense table on the left gives email-inbox scannability. The right panel gives Slack-thread depth. Neither the data-table gumdrop nor the chat gumdrop produces this alone.

**Gumdrops crossed:** data-table × chat-messaging × kanban-board × notification-feed

#### 18. Live Article (Article Layout × Form × Progress)

Content that reacts to reader input. Functional form components embedded directly in article prose, with a floating progress indicator that updates as the reader interacts.

```tsx
<div className="max-w-3xl mx-auto relative">
  {/* Floating progress */}
  <div className="fixed top-4 right-4 z-10">
    <Card className="w-48 shadow-lg">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Your progress</span>
          <span className="text-muted-foreground">{completedFields}/{totalFields}</span>
        </div>
        <Progress value={(completedFields / totalFields) * 100} />
        <div className="space-y-1">
          {sections.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs">
              {s.completed ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(s.completed && "text-muted-foreground line-through")}>{s.title}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Article with embedded interactive sections */}
  <article className="prose prose-neutral dark:prose-invert">
    <h1>Build Your First API</h1>
    <p>Before we start, let's configure your environment. Choose your preferences below — the rest of this tutorial will adapt to your choices.</p>

    {/* Embedded form section */}
    <Card className="not-prose my-8">
      <CardHeader>
        <CardTitle className="text-base">Environment Setup</CardTitle>
        <CardDescription>This determines the code examples you'll see</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Language</Label>
          <RadioGroup value={language} onValueChange={setLanguage} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="typescript" id="ts" />
              <Label htmlFor="ts">TypeScript</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="python" id="py" />
              <Label htmlFor="py">Python</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>Database</Label>
          <Select value={database} onValueChange={setDatabase}>
            <SelectTrigger><SelectValue placeholder="Choose database" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="postgres">PostgreSQL</SelectItem>
              <SelectItem value="sqlite">SQLite</SelectItem>
              <SelectItem value="mongo">MongoDB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    {/* Prose adapts to selections */}
    <h2>Setting Up {database === 'postgres' ? 'PostgreSQL' : database === 'sqlite' ? 'SQLite' : 'MongoDB'}</h2>
    <p>{getDatabaseIntro(database)}</p>

    <pre><code>{getInstallCommand(language, database)}</code></pre>

    <p>Now let's define your first model. {language === 'typescript' ? 'We'll use Zod for schema validation.' : 'We'll use Pydantic for data modeling.'}</p>

    {/* Another embedded interaction */}
    <Card className="not-prose my-8">
      <CardHeader>
        <CardTitle className="text-base">Define Your Model</CardTitle>
        <CardDescription>Name the resource your API will manage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Resource name (singular)</Label>
          <Input
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            placeholder="e.g. post, product, user"
          />
        </div>
        <div className="space-y-2">
          <Label>Fields</Label>
          {fields.map((field, i) => (
            <div key={i} className="flex gap-2">
              <Input value={field.name} onChange={...} placeholder="Field name" />
              <Select value={field.type} onValueChange={...}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => removeField(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Add field
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Generated code reflects user input */}
    <h2>Your {capitalize(resourceName)} Schema</h2>
    <pre><code>{generateSchema(language, resourceName, fields)}</code></pre>

    <p>That's it — your <code>{resourceName}</code> API is ready. The schema above validates all incoming requests automatically.</p>
  </article>
</div>
```

**Why it's a paradigm remix:** The article IS the app. Content and interaction are interleaved — not a tutorial with a separate code playground, but prose that contains live form components whose outputs change subsequent paragraphs and code blocks. The floating Progress card tracks completion across embedded interactions, turning reading into a guided experience. Nothing in the article, form, or onboarding gumdrops produces this alone.

**Gumdrops crossed:** article-layout × form-layout × onboarding × documentation

#### 19. Calendar-Driven Commerce (Calendar × HoverCard × Drawer × Stats)

Inventory and sales management through a time-based interface. The primary view is a calendar, not a product grid.

```tsx
<div className="space-y-4">
  {/* Stats row — time-period KPIs */}
  <StatsGrid>
    <StatCard>
      <CardDescription>This Week's Revenue</CardDescription>
      <StatValue>$24,380</StatValue>
      <StatChange value={12.5} />
    </StatCard>
    <StatCard>
      <CardDescription>Launches This Month</CardDescription>
      <StatValue>7</StatValue>
    </StatCard>
    <StatCard>
      <CardDescription>Expiring Stock</CardDescription>
      <StatValue className="text-destructive">23 items</StatValue>
    </StatCard>
  </StatsGrid>

  {/* Calendar as primary commerce interface */}
  <Card>
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>Product Calendar</CardTitle>
      <div className="flex gap-2">
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> Launch</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full bg-blue-500" /> Shipment</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full bg-red-500" /> Expiry</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-7 gap-px bg-border">
        {calendarDays.map(day => (
          <div key={day.date} className={cn(
            "bg-background p-2 min-h-[120px]",
            day.isToday && "bg-primary/5"
          )}>
            <span className={cn(
              "text-sm",
              day.isToday && "font-bold text-primary"
            )}>{day.number}</span>

            <div className="mt-1 space-y-1">
              {day.events.map(event => (
                <HoverCard key={event.id}>
                  <HoverCardTrigger asChild>
                    <Drawer>
                      <DrawerTrigger asChild>
                        <button className={cn(
                          "w-full text-left text-xs px-1.5 py-0.5 rounded truncate",
                          event.type === 'launch' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                          event.type === 'shipment' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                          event.type === 'expiry' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        )}>
                          {event.product.name}
                        </button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>{event.product.name}</DrawerTitle>
                          <DrawerDescription>{event.type} · {day.date}</DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4 space-y-4">
                          {/* Product detail + sales velocity */}
                          <div className="flex gap-4">
                            <AspectRatio ratio={1} className="w-24 rounded-md overflow-hidden bg-muted">
                              <img src={event.product.image} className="object-cover w-full h-full" />
                            </AspectRatio>
                            <div className="space-y-1">
                              <p className="text-sm">{event.product.description}</p>
                              <Badge>{event.product.category}</Badge>
                              <p className="text-2xl font-bold tabular-nums">${event.product.price}</p>
                            </div>
                          </div>
                          <Separator />
                          {/* Day-specific stats */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Units Sold</p>
                              <p className="text-lg font-bold tabular-nums">{event.stats.unitsSold}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <p className="text-lg font-bold tabular-nums">${event.stats.revenue}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Stock Left</p>
                              <p className={cn(
                                "text-lg font-bold tabular-nums",
                                event.stats.stock < 10 && "text-destructive"
                              )}>{event.stats.stock}</p>
                            </div>
                          </div>
                          <Progress value={(event.stats.unitsSold / event.stats.target) * 100} />
                          <p className="text-xs text-muted-foreground">
                            {event.stats.unitsSold} of {event.stats.target} target ({Math.round((event.stats.unitsSold / event.stats.target) * 100)}%)
                          </p>
                        </div>
                        <DrawerFooter>
                          <Button>View Full Product</Button>
                          <DrawerClose asChild><Button variant="outline">Close</Button></DrawerClose>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64" side="right">
                    <div className="flex gap-3">
                      <AspectRatio ratio={1} className="w-12 rounded overflow-hidden bg-muted shrink-0">
                        <img src={event.product.image} className="object-cover w-full h-full" />
                      </AspectRatio>
                      <div>
                        <p className="text-sm font-medium">{event.product.name}</p>
                        <p className="text-xs text-muted-foreground">${event.product.price} · {event.stats.stock} in stock</p>
                        <Badge variant={event.type === 'expiry' ? 'destructive' : 'secondary'} className="mt-1 text-xs">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
</div>
```

**Why it's a paradigm remix:** E-commerce viewed through time instead of categories. A calendar cell becomes a commerce surface — hover for product preview (HoverCard), click for full sales data (Drawer with StatsGrid + Progress). Launches, shipments, and expiry dates share the same timeline. Nobody thinks "calendar" for e-commerce, but time-based inventory visualization solves real operational problems usually handled by spreadsheets.

**Gumdrops crossed:** calendar-view × stats-dashboard × gallery × file-browser

---

### Advanced Compositions

These extend the cross-component and paradigm remix patterns with higher-complexity combinations. All buildable from existing atoms.

#### 20. Live Comparison Pricing Lab (Pricing × Slider × Chart × Toggle)

Static pricing tiers replaced with an interactive playground. Left side: pricing tiers. Right side: live usage simulator (Slider for seats, API calls, storage). Bottom: auto-updating cost breakdown Chart. Toggle: monthly/annual.

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
  {/* Left: pricing tiers */}
  <PricingSection>
    <PricingGrid>
      {tiers.map(tier => (
        <PricingTier key={tier.name} featured={tier.featured}>
          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PricingPrice amount={computePrice(tier, usage, annual)} interval={annual ? "yr" : "mo"} />
            <PricingFeatures>
              {tier.features.map(f => <PricingFeature key={f.name} included={f.included}>{f.name}</PricingFeature>)}
            </PricingFeatures>
          </CardContent>
          <CardFooter><PricingCTA>{tier.cta}</PricingCTA></CardFooter>
        </PricingTier>
      ))}
    </PricingGrid>
  </PricingSection>

  {/* Right: usage simulator */}
  <Card className="h-fit sticky top-8">
    <CardHeader>
      <CardTitle className="text-sm">Estimate your usage</CardTitle>
      <div className="flex items-center gap-2 pt-2">
        <Label className="text-xs">Monthly</Label>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <Label className="text-xs">Annual</Label>
        <Badge variant="secondary" className="text-xs">Save 20%</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>Team seats</Label>
          <span className="tabular-nums font-medium">{seats}</span>
        </div>
        <Slider value={[seats]} onValueChange={([v]) => setSeats(v)} min={1} max={100} step={1} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>API calls / mo</Label>
          <span className="tabular-nums font-medium">{apiCalls.toLocaleString()}</span>
        </div>
        <Slider value={[apiCalls]} onValueChange={([v]) => setApiCalls(v)} min={1000} max={1000000} step={1000} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>Storage (GB)</Label>
          <span className="tabular-nums font-medium">{storage}</span>
        </div>
        <Slider value={[storage]} onValueChange={([v]) => setStorage(v)} min={1} max={500} step={1} />
      </div>
      <Separator />
      {/* Cost breakdown chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costBreakdown}>
            <Bar dataKey="seats" stackId="cost" fill="hsl(var(--primary))" />
            <Bar dataKey="api" stackId="cost" fill="hsl(var(--primary) / 0.7)" />
            <Bar dataKey="storage" stackId="cost" fill="hsl(var(--primary) / 0.4)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
</div>
```

**Why it's powerful:** Turns pricing from a static comparison into a tool. Users convince themselves by exploring their own numbers. This is Stripe/Vercel-level UX, not template-level UX.

#### 21. Expandable Data Surface (Table → Inline Micro-App)

Click a table row → it expands inline to reveal a mini dashboard. Sparkline chart, recent activity, inline edit controls. No navigation. No modal. Every row is a micro-application.

```tsx
<Table>
  <TableBody>
    {items.map(item => (
      <Collapsible key={item.id} asChild>
        <>
          <CollapsibleTrigger asChild>
            <TableRow className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell><Badge>{item.status}</Badge></TableCell>
              <TableCell className="text-right tabular-nums">{item.revenue}</TableCell>
              <TableCell>
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </TableCell>
            </TableRow>
          </CollapsibleTrigger>
          <CollapsibleContent asChild>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="p-0">
                <div className="p-4 grid grid-cols-3 gap-4">
                  {/* Mini stats */}
                  <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Revenue (30d)</p>
                      <p className="text-xl font-bold tabular-nums">{item.revenue}</p>
                      <div className="h-12 mt-2">
                        {/* Sparkline */}
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={item.sparkline}>
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Recent activity */}
                  <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
                      <div className="space-y-1.5">
                        {item.activity.slice(0, 3).map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <Avatar className="h-4 w-4"><AvatarImage src={a.user.avatar} /></Avatar>
                            <span className="text-muted-foreground truncate">{a.description}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Inline actions */}
                  <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" variant="outline" className="w-full">View full details</Button>
                    </CardContent>
                  </Card>
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        </>
      </Collapsible>
    ))}
  </TableBody>
</Table>
```

**Why it's powerful:** The table isn't just a data display — every row is an expandable workspace. Edit status, see trends, check activity, all without leaving the table surface. Information stays in context.

#### 22. Adaptive Command Workspace (Command × Tabs × Dynamic Layout)

The page is a Command input at top with live results below. Results switch layout automatically based on query content — table for data queries, kanban for task queries, chart for metric queries.

```tsx
<div className="space-y-4">
  <Command className="border rounded-lg">
    <CommandInput placeholder="What are you looking for?" value={query} onValueChange={setQuery} />
  </Command>

  {/* Dynamic result zone */}
  <Tabs value={inferredView(query)} className="w-full">
    <TabsList>
      <TabsTrigger value="table">Table</TabsTrigger>
      <TabsTrigger value="board">Board</TabsTrigger>
      <TabsTrigger value="chart">Chart</TabsTrigger>
      <TabsTrigger value="timeline">Timeline</TabsTrigger>
    </TabsList>
    <TabsContent value="table">
      {/* Data table gumdrop */}
      <Card>
        <CardContent className="p-0">
          <Table>{/* filtered results as rows */}</Table>
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="board">
      {/* Kanban gumdrop */}
      <div className="flex gap-4 overflow-x-auto">
        {/* columns from query-filtered data */}
      </div>
    </TabsContent>
    <TabsContent value="chart">
      {/* Chart composition */}
      <Card><CardContent>{/* recharts from query-filtered data */}</CardContent></Card>
    </TabsContent>
    <TabsContent value="timeline">
      {/* Timeline gumdrop */}
      <div className="relative pl-8 space-y-4">{/* filtered events */}</div>
    </TabsContent>
  </Tabs>
</div>
```

**Why it's powerful:** Feels like Raycast + Linear + Notion merged. One input, multiple views. The intent-routing can start simple (keyword matching: "overdue" → board, "revenue" → chart) and upgrade to LLM classification later. The composition is the same either way.

#### 23. Metrics-as-Navigation Dashboard (Stats → Tab Router)

Stats cards aren't just displays — they're clickable navigation targets. Click "Revenue" → analytics tab opens with revenue chart. Click "Customers" → data table appears. The stats row is the app's primary navigation.

```tsx
<div className="space-y-6">
  {/* Stats as navigation */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {metrics.map(metric => (
      <Card
        key={metric.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          activeMetric === metric.id && "ring-2 ring-primary"
        )}
        onClick={() => setActiveMetric(metric.id)}
      >
        <CardHeader className="pb-2">
          <CardDescription>{metric.label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{metric.value}</CardTitle>
          <span className={cn("text-xs", metric.change > 0 ? "text-green-600" : "text-red-600")}>
            {metric.change > 0 ? "+" : ""}{metric.change}%
          </span>
        </CardHeader>
      </Card>
    ))}
  </div>

  {/* Dynamic zone — renders based on which stat is selected */}
  <Card>
    <CardContent className="pt-6">
      {activeMetric === 'revenue' && <RevenueChart data={revenueData} />}
      {activeMetric === 'customers' && <CustomerTable data={customerData} />}
      {activeMetric === 'orders' && <OrdersTimeline events={orderEvents} />}
      {activeMetric === 'conversion' && <ConversionFunnel data={funnelData} />}
    </CardContent>
  </Card>
</div>
```

**Why it's powerful:** Five lines of state wiring. Extremely clean. Stats become interactive routers — the dashboard feels deliberate instead of showing everything at once. Click-to-drill-down is better than scroll-to-find.

#### 24. Contextual Action Overlay (Multi-Select × Floating Action Bar)

Select multiple items (table rows, kanban cards, grid items) → floating action bar appears at bottom with bulk operations. Deselect → bar disappears.

```tsx
<div className="relative">
  <Table>
    <TableBody>
      {items.map(item => (
        <TableRow
          key={item.id}
          className={cn(selected.has(item.id) && "bg-primary/5")}
        >
          <TableCell>
            <Checkbox
              checked={selected.has(item.id)}
              onCheckedChange={checked => toggleSelect(item.id, checked)}
            />
          </TableCell>
          <TableCell>{item.name}</TableCell>
          <TableCell><Badge>{item.status}</Badge></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>

  {/* Floating action bar — appears when items selected */}
  {selected.size > 0 && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="flex items-center gap-3 py-2 px-4">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="outline" onClick={() => bulkAction('archive')}>Archive</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction('assign')}>Assign</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction('tag')}>Tag</Button>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="destructive" onClick={() => bulkAction('delete')}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )}
</div>
```

**Why it's powerful:** App-native pattern. Almost no AI generators default to this. Gmail, Notion, Linear all use it. The floating bar gives bulk operations without cluttering the toolbar permanently.

#### 25. File Browser with Preview Dock (Grid × Resizable × HoverCard)

Split pane file browser. Left: file grid with thumbnails and ContextMenu. Right: persistent preview panel that updates on selection. Hover shows quick info, click locks preview.

```tsx
<ResizablePanelGroup direction="horizontal" className="h-[600px] border rounded-lg">
  <ResizablePanel defaultSize={60}>
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink>Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{currentFolder}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
          <ToggleGroupItem value="grid"><Grid className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="list"><List className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className={cn(viewMode === 'grid' ? "grid grid-cols-4 gap-3" : "space-y-1")}>
          {files.map(file => (
            <ContextMenu key={file.id}>
              <ContextMenuTrigger>
                <Card
                  className={cn("cursor-pointer transition-all", selectedFile?.id === file.id && "ring-2 ring-primary")}
                  onClick={() => setSelectedFile(file)}
                >
                  <CardContent className="p-2">
                    <AspectRatio ratio={4/3} className="rounded-sm overflow-hidden bg-muted mb-2">
                      {file.thumbnail ? (
                        <img src={file.thumbnail} className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex items-center justify-center h-full"><FileIcon className="h-8 w-8 text-muted-foreground" /></div>
                      )}
                    </AspectRatio>
                    <p className="text-xs font-medium truncate">{file.name}</p>
                  </CardContent>
                </Card>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Open</ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </ScrollArea>
    </div>
  </ResizablePanel>

  <ResizableHandle withHandle />

  <ResizablePanel defaultSize={40}>
    {/* Preview dock */}
    {selectedFile ? (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">{selectedFile.name}</h3>
          <p className="text-xs text-muted-foreground">{selectedFile.size} · Modified {selectedFile.modified}</p>
        </div>
        <div className="flex-1 p-4">
          <AspectRatio ratio={16/9} className="rounded-md overflow-hidden bg-muted">
            {selectedFile.type === 'image' && <img src={selectedFile.url} className="object-contain w-full h-full" />}
          </AspectRatio>
        </div>
        <div className="p-4 border-t space-y-2">
          <Button className="w-full">Open</Button>
          <Button variant="outline" className="w-full">Download</Button>
        </div>
      </div>
    ) : (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a file to preview
      </div>
    )}
  </ResizablePanel>
</ResizablePanelGroup>
```

**Why it's powerful:** Figma + Finder hybrid. The Resizable split pane means users control how much space the preview gets. Grid/list toggle via ToggleGroup. Breadcrumb for path navigation. ContextMenu for actions. This feels like a native file manager, not a web page.

#### 26. Dual-Surface Comparison (PricingTier × Feature Matrix × Sync)

Apple product comparison page pattern. Left: vertical tier cards. Right: feature comparison matrix. Scrolling one highlights the corresponding row/column in the other.

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
  {/* Left: tier summary cards */}
  <div className="space-y-4 sticky top-8 h-fit">
    {tiers.map(tier => (
      <Card
        key={tier.name}
        className={cn("cursor-pointer transition-all", activeTier === tier.name && "ring-2 ring-primary")}
        onClick={() => setActiveTier(tier.name)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{tier.name}</CardTitle>
          <PricingPrice amount={tier.price} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tier.tagline}</p>
        </CardContent>
        <CardFooter>
          <PricingCTA variant={tier.featured ? "default" : "outline"}>{tier.cta}</PricingCTA>
        </CardFooter>
      </Card>
    ))}
  </div>

  {/* Right: feature matrix */}
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Feature</TableHead>
            {tiers.map(tier => (
              <TableHead
                key={tier.name}
                className={cn("text-center", activeTier === tier.name && "bg-primary/5")}
              >
                {tier.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {featureGroups.map(group => (
            <React.Fragment key={group.name}>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={tiers.length + 1} className="font-semibold text-sm">
                  {group.name}
                </TableCell>
              </TableRow>
              {group.features.map(feature => (
                <TableRow key={feature.name}>
                  <TableCell className="text-sm">{feature.name}</TableCell>
                  {tiers.map(tier => (
                    <TableCell key={tier.name} className={cn("text-center", activeTier === tier.name && "bg-primary/5")}>
                      {feature.values[tier.name] === true ? (
                        <Check className="h-4 w-4 text-primary mx-auto" />
                      ) : feature.values[tier.name] === false ? (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      ) : (
                        <span className="text-sm">{feature.values[tier.name]}</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>
```

**Why it's powerful:** Tier cards and feature matrix are synced — clicking a tier highlights its column. Feature groups with section headers make large matrices scannable. Sticky tier cards stay visible while scrolling the matrix. This is how Apple and enterprise SaaS products present comparisons.

#### 27. Hover-Dense Dashboard (Table × HoverCard × Inline Actions)

Nothing opens modals. Every entity reference in the table reveals a rich HoverCard on hover. Actions are inline. Maximum information density, minimum interaction cost.

```tsx
<Table>
  <TableBody>
    {rows.map(row => (
      <TableRow key={row.id}>
        <TableCell>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="flex items-center gap-2 hover:underline">
                <Avatar className="h-6 w-6"><AvatarImage src={row.customer.avatar} /></Avatar>
                <span className="font-medium">{row.customer.name}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">{/* rich customer preview */}</HoverCardContent>
          </HoverCard>
        </TableCell>
        <TableCell>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Badge variant="outline" className="cursor-pointer">{row.product}</Badge>
            </HoverCardTrigger>
            <HoverCardContent>{/* product preview with image, price, stock */}</HoverCardContent>
          </HoverCard>
        </TableCell>
        <TableCell className="text-right tabular-nums">{row.amount}</TableCell>
        <TableCell>
          {/* Inline actions — no dropdown needed */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7"><Archive className="h-3.5 w-3.5" /></Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Why it's powerful:** Enterprise density. Information surfaces on hover without any navigation. Row actions appear on hover, disappear when not needed. The table itself becomes the complete interface — no detail pages, no modals.

#### 28. Blog + Interactive Filter Surface (Command × Badge Filters × Infinite Scroll)

Content browsing that feels like a product catalog. Command search at top, Badge filter chips for categories, InfiniteScroll for the card grid.

```tsx
<div className="space-y-6">
  <Command className="border rounded-lg">
    <CommandInput placeholder="Search articles..." value={search} onValueChange={setSearch} />
  </Command>

  <div className="flex flex-wrap gap-2">
    {categories.map(cat => (
      <Badge
        key={cat}
        variant={activeCategories.has(cat) ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => toggleCategory(cat)}
      >
        {cat}
      </Badge>
    ))}
    {activeCategories.size > 0 && (
      <Button variant="ghost" size="sm" onClick={clearCategories}>
        Clear all <X className="h-3 w-3 ml-1" />
      </Button>
    )}
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {filteredPosts.map(post => (
      <Card key={post.id} className="group cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <AspectRatio ratio={16/9} className="overflow-hidden">
            <img src={post.cover} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
          </AspectRatio>
        </CardContent>
        <CardHeader>
          <div className="flex gap-2 mb-2">
            {post.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>
          <CardTitle className="text-lg">{post.title}</CardTitle>
          <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
        </CardHeader>
        <CardFooter className="text-xs text-muted-foreground gap-2">
          <Avatar className="h-5 w-5"><AvatarImage src={post.author.avatar} /></Avatar>
          {post.author.name} · {post.date}
        </CardFooter>
      </Card>
    ))}
  </div>

  {hasMore && (
    <div ref={loadMoreRef} className="flex justify-center py-8">
      <Spinner />
    </div>
  )}
</div>
```

**Why it's powerful:** Command search is keyboard-first and instant. Badge chips are toggleable filters. Infinite scroll replaces pagination. The blog grid feels like a curated product catalog, not a WordPress archive.

#### 29. Progressive Settings Engine (Switch × Drawer × Tabs × Validation State)

Settings where each row is state-aware. Green check = configured. Yellow = incomplete. Red = error. Simple settings are inline Switches. Complex settings open Drawers with tabbed sub-settings.

```tsx
<div className="space-y-1">
  {settings.map(setting => (
    <div key={setting.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={cn(
          "h-2 w-2 rounded-full",
          setting.status === 'configured' && "bg-green-500",
          setting.status === 'incomplete' && "bg-yellow-500",
          setting.status === 'error' && "bg-red-500",
          setting.status === 'default' && "bg-muted-foreground/30"
        )} />
        <div>
          <Label className="text-sm font-medium">{setting.label}</Label>
          <p className="text-xs text-muted-foreground">{setting.description}</p>
          {setting.status === 'error' && (
            <p className="text-xs text-red-500 mt-0.5">{setting.errorMessage}</p>
          )}
        </div>
      </div>

      {setting.type === 'toggle' ? (
        <Switch checked={setting.value} onCheckedChange={v => updateSetting(setting.id, v)} />
      ) : (
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">Configure</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{setting.label}</DrawerTitle>
              <DrawerDescription>{setting.description}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <Tabs defaultValue={setting.tabs[0].id}>
                <TabsList className="w-full">
                  {setting.tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
                  ))}
                </TabsList>
                {setting.tabs.map(tab => (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-4 pt-4">
                    {tab.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.label}</Label>
                        {field.type === 'select' ? (
                          <Select value={field.value} onValueChange={v => updateField(setting.id, field.id, v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={field.value} onChange={e => updateField(setting.id, field.id, e.target.value)} />
                        )}
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
            <DrawerFooter>
              <Button onClick={() => saveSetting(setting.id)}>Save</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  ))}
</div>
```

**Why it's powerful:** Validation state bubbles from Drawer sub-settings back to the parent row indicator. Users see at a glance which settings need attention. Simple toggles stay inline. Complex configuration gets Drawer depth with Tabs for sub-categories. This is Stripe/Vercel/Supabase-level settings polish.

#### 30. Timeline-as-Navigation Surface (Timeline × Sheet × Tabs)

The activity timeline IS the primary navigation. Each entry is expandable. Clicking opens a Sheet with full editable context. Inside: Tabs for Activity, Files, Comments. The timeline replaces traditional list/table navigation.

```tsx
<div className="max-w-3xl mx-auto">
  <Sheet>
    <div className="relative pl-10 space-y-6">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      {events.map(event => (
        <div key={event.id} className="relative group">
          <div className={cn(
            "absolute -left-10 top-2 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center",
            event.type === 'milestone' ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {event.icon}
          </div>
          <SheetTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(event)}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5"><AvatarImage src={event.actor.avatar} /></Avatar>
                    <CardTitle className="text-sm">{event.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{event.type}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                </div>
                <CardDescription className="text-xs line-clamp-1">{event.summary}</CardDescription>
              </CardHeader>
            </Card>
          </SheetTrigger>
        </div>
      ))}
    </div>
    <SheetContent className="w-[500px]">
      <SheetHeader>
        <SheetTitle>{selected?.title}</SheetTitle>
        <SheetDescription>{selected?.summary}</SheetDescription>
      </SheetHeader>
      <Tabs defaultValue="details" className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          {/* Editable form fields for the event */}
        </TabsContent>
        <TabsContent value="files">
          {/* Attached files with preview */}
        </TabsContent>
        <TabsContent value="comments">
          {/* Threaded discussion */}
        </TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>
</div>
```

**Why it's powerful:** Timeline becomes the app's spine instead of a passive log. Milestones get visual prominence. Sheet provides full editing context without navigation. The combination feels like product ops software — Linear's activity view crossed with a full inspector.

---

## Full-Stack Shells: The Hono Multiplier

### Why Shells Exist

The compositions above are section-level — they work within a single view. But with Hono running in a Service Worker (see `hono-fullstack-plan.md`), Ralph can wire full-stack applications where multiple gumdrops share a backend data layer.

The things that previously made multi-pane applications feel like "app architecture, not gumdrops" are solved by Hono:

- **Data synchronization** — Hono routes + shared `useQuery` hooks. Multiple UI panes consume the same `GET /api/metrics` endpoint.
- **Persistence** — IndexedDB in the Service Worker. Data survives page refresh. Same store swaps to D1/Postgres in production.
- **Real-time updates** — `realtime-messaging` API gumdrop provides SSE/polling patterns. Event streams are just another Hono route.
- **Shared schemas** — Zod schemas in `src/shared/` are the single source of truth. Frontend forms and backend validation use the same schema.

This means most "full application" patterns are actually just larger compositions of existing gumdrops + existing API gumdrops + a Resizable multi-pane layout. That's a recipe Ralph can follow.

### What a Shell Is

A shell is a gumdrop that describes a multi-pane application layout, which gumdrops fill each pane, and how they share state through Hono API routes.

```
Shell = Layout (Resizable panes / Tabs zones)
      + Pane gumdrops (stats-dashboard, data-table, kanban, etc.)
      + API gumdrops (crud-resource, auth-session, etc.)
      + Shared state (Zod schemas, hooks, route wiring)
```

Shell refs are larger (~150-250 lines) because they show the layout skeleton, the API scaffold, and the hook wiring — not just UI atoms.

### Shell File Format

```
skills/gumdrops/shells/
├── data-observatory.md          # L0: recipe
├── data-observatory.ref.tsx     # L1: frontend layout + pane wiring
├── data-observatory.api.ts      # L2: Hono route scaffold (NEW for shells)
└── data-observatory.schema.ts   # L3: Shared Zod schemas (NEW for shells)
```

Shells get up to 4 files:
- `.md` — recipe (which panes, which gumdrops, which API routes)
- `.ref.tsx` — frontend layout with Resizable panes and component placement
- `.api.ts` — Hono route definitions that the panes consume
- `.schema.ts` — shared Zod schemas imported by both frontend and backend

### Shells Domain (10 gumdrops)

| Shell | Pane Gumdrops | API Gumdrops | Description |
|-------|--------------|-------------|-------------|
| **data-observatory** | stats-dashboard, data-table, timeline, chart | crud-resource, search-query, pagination-api | Synced dashboard: filters + chart + table + timeline slider. Change timeline → everything updates. Financial dashboard, analytics app, security log viewer. |
| **pricing-lab** | pricing, chart, form-layout | crud-resource | Interactive pricing with Slider-driven usage simulator, live cost breakdown Chart, annual toggle. Stripe/Vercel-level pricing UX. |
| **project-board** | kanban-board, stats-dashboard, chat-messaging, data-table | crud-resource, realtime-messaging | Hybrid kanban + analytics. KPI row at top. Kanban below. Click column header → analytics for that status. Click card → Sheet with chat-style task history. |
| **crm-workspace** | data-table, stats-dashboard, activity-feed, form-layout | crud-resource, search-query, pagination-api | Multi-pane CRM. Table left, detail inspector right (Sheet with Tabs). Stats row at top. Activity timeline in detail panel. Universal object inspector pattern. |
| **file-manager** | file-browser, grid-list, file-upload | crud-resource, file-upload-api | Split-pane file manager. Grid/list view left, persistent preview dock right. Breadcrumb path navigation. ContextMenu for actions. Upload via drag-drop. |
| **content-studio** | article-layout, rich-text-editor, documentation, blog-grid | crud-resource, search-query | Writing environment. Sidebar with article list. Main area: rich text editor. Preview pane. Blog grid for published content. Documentation mode for structured writing. |
| **ai-workspace** | ai-prompt, chat-messaging, file-browser, data-table | crud-resource, realtime-messaging | AI assistant interface. Left: file context (drag-to-attach). Center: chat with rich Card messages. Right: tool results / file preview. Bottom: session timeline. |
| **admin-console** | stats-dashboard, data-table, settings-panel, activity-feed | crud-resource, auth-session, search-query | Settings + monitoring. Stats overview, user/resource management table, settings with progressive disclosure, activity audit log. |
| **marketplace** | grid-list, search-results, profile-page, form-layout | crud-resource, search-query, pagination-api | Plugin/extension marketplace. Search-driven grid. HoverCard previews. Install Drawer with changelog timeline, rating chart, permissions summary. |
| **event-stream** | notification-feed, stats-dashboard, data-table, timeline | realtime-messaging, search-query, pagination-api | Real-time event board. Live-streaming event cards. Filter chips dynamically update. Counts animate. Hover reveals detail. For trading dashboards, moderation tools, audit logs, social analytics. |

### Shell Reference Pattern

A shell `.ref.tsx` shows the layout skeleton and pane wiring, but doesn't reimplement the gumdrop internals — it imports or references them:

```tsx
// project-board.ref.tsx — Reference implementation
// Ralph: This shows pane layout and state wiring. Each pane's internals come from
// their own gumdrop refs (kanban-board.ref.tsx, stats-dashboard.ref.tsx, etc.)

// ─── LAYOUT ─────────────────────────────────────────
function ProjectBoardShell() {
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeColumn, setActiveColumn] = useState(null)
  const { data: stats } = useStats()
  const { data: columns } = useBoard()

  return (
    <div className="h-screen flex flex-col">
      {/* Top: KPI stats (stats-dashboard gumdrop) */}
      <div className="border-b p-4">
        <StatsGrid stats={stats} onStatClick={setActiveColumn} />
      </div>

      {/* Main: Kanban + detail panel */}
      <Sheet>
        <div className="flex-1 overflow-hidden">
          {/* Column analytics (collapsible per column) */}
          {activeColumn && (
            <div className="border-b p-4">
              <ColumnAnalytics column={activeColumn} />
            </div>
          )}

          {/* Kanban board (kanban-board gumdrop) */}
          <div className="flex-1 overflow-x-auto p-4">
            <KanbanBoard columns={columns} onCardClick={setSelectedCard} />
          </div>
        </div>

        {/* Detail panel (Sheet with chat-style history) */}
        <SheetContent className="w-[500px]">
          <CardDetail card={selectedCard} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── API HOOKS ──────────────────────────────────────
// These wrap Hono RPC client calls
function useStats() { /* GET /api/stats → computed metrics */ }
function useBoard() { /* GET /api/boards/:id → columns + cards */ }
function useMoveCard() { /* PATCH /api/cards/:id → update columnId + position */ }
```

The `.api.ts` shows the Hono routes:

```ts
// project-board.api.ts — Hono route scaffold
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CardSchema, MoveCardSchema, StatsQuerySchema } from '../shared/schemas/board'

const app = new Hono()
  .get('/api/stats', zValidator('query', StatsQuerySchema), async (c) => {
    const { from, to } = c.req.valid('query')
    // compute metrics from store
    return c.json({ stats: computeStats(from, to) })
  })
  .get('/api/boards/:id', async (c) => {
    const board = await store.get('boards', c.req.param('id'))
    return c.json(board)
  })
  .patch('/api/cards/:id', zValidator('json', MoveCardSchema), async (c) => {
    const update = c.req.valid('json')
    await store.update('cards', c.req.param('id'), update)
    return c.json({ ok: true })
  })

export type AppType = typeof app
```

And the `.schema.ts` is the shared truth:

```ts
// project-board.schema.ts — Shared Zod schemas
import { z } from 'zod'

export const CardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  columnId: z.string(),
  position: z.number(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: z.string().optional(),
})

export const MoveCardSchema = z.object({
  columnId: z.string(),
  position: z.number(),
})

export const StatsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export type Card = z.infer<typeof CardSchema>
```

---

## Block Atom Conventions

### Naming Rules

Every block atom follows a strict naming pattern to prevent inconsistency across refs. Ralph encounters these names in recipes, refs, and plan.tsx — they must be predictable.

**Prefix = gumdrop name.** Every block atom starts with the gumdrop it belongs to:
- Pricing → `PricingSection`, `PricingGrid`, `PricingTier`, `PricingPrice`
- Stats → `StatsGrid`, `StatCard`, `StatValue`, `StatChange`
- Kanban → `KanbanBoard`, `KanbanColumn`, `KanbanCard`

**Suffix taxonomy:**

| Suffix | Meaning | Examples |
|--------|---------|---------|
| `Section` | Outermost wrapper. One per gumdrop instance. Provides py/px padding. | `PricingSection`, `HeroSection`, `FAQSection` |
| `Header` | Section intro area. Title + subtitle + optional badge/toggle. | `PricingHeader`, `TeamHeader`, `BlogHeader` |
| `Footer` | Section outro. CTAs, links, metadata. | `FooterSection` (special: IS the footer), `PricingFooter` |
| `Grid` | Layout container. CSS grid or flex with responsive breakpoints. | `PricingGrid`, `FeatureGrid`, `StatsGrid`, `TeamGrid` |
| `List` | Vertical stack of repeated items. | `FeatureList`, `NotificationList` |
| `Card` / `Tier` / `Item` | Repeated unit within a grid/list. Domain-specific name preferred. | `PricingTier`, `FeatureCard`, `BlogCard`, `FileItem` |
| `Content` | Main body area within a compound block atom. | `ArticleContent`, `DocContent` |
| `Actions` | Group of interactive elements (buttons, links). | `FormActions`, `FileActions` |
| `Group` | Logical cluster of related sub-atoms. | `FAQGroup`, `SettingsGroup`, `SidebarGroup` |

**Props taxonomy:**

| Prop | Type | Meaning | Usage |
|------|------|---------|-------|
| `featured` | `boolean` | Visual emphasis variant. Larger, more prominent, different border/shadow. | `<PricingTier featured>`, `<TestimonialCard featured>` |
| `variant` | `string union` | Named visual treatment. Multiple distinct looks for the same block atom. | `<HeroCTA variant="primary">`, `<StatCard variant="compact">` |
| `active` | `boolean` | Interactive state. Currently selected/focused/highlighted. | `<KanbanColumn active>`, `<SidebarItem active>` |
| `included` | `boolean` | Boolean indicator (check/x). Domain-specific to feature lists. | `<PricingFeature included>` |
| `className` | `string` | CSS override escape hatch. Always accepted. Merged via `cn()`. | Every block atom. |
| `children` | `ReactNode` | Composition slot. Always accepted. Never restricted. | Every block atom. |

**Anti-patterns:**
- ❌ `isFeatured` — no `is` prefix on booleans
- ❌ `highlighted` when `featured` means the same thing — use `featured` consistently
- ❌ `type` as a prop name — conflicts with TypeScript's `type` keyword in JSX. Use `variant`.
- ❌ `data` as a prop name — too generic. Use domain-specific: `tiers`, `features`, `columns`.

---

## Similarity Detection

### The Problem

The entire remix philosophy depends on Ralph writing *fresh* compositions informed by refs, not copying refs verbatim. Without enforcement, the "read reference, write your own" workflow degrades to "read reference, paste reference." Every ref becomes a template. The system produces 51 templates instead of infinite compositions.

### How Similarity Is Measured

AST-based structural comparison. Parse the JSX tree, extract the nesting skeleton, compare skeletons.

**Step 1: Extract skeleton from source**

Parse TSX and extract the component nesting structure, ignoring:
- Text content (`"Hello"`, `{variable}`)
- Prop values (`className="..."`, `onClick={...}`)
- Variable names (`items`, `tiers`, `data`)
- Comments
- Import statements

Keep:
- Component names in nesting order (`Card > CardHeader > CardTitle > Badge`)
- Structural elements (`div`, `section`, `ul`, `li` — but mapped to generic container/item)
- Nesting depth
- Sibling count at each level
- Conditional rendering structure (`&&`, ternary)
- Map/iteration patterns (`.map()` → "repeated children")

Example:

```tsx
// Source
<Card className="hover:shadow-md">
  <CardHeader className="pb-2">
    <CardTitle className="text-lg">{tier.name}</CardTitle>
    <Badge variant="secondary">Popular</Badge>
  </CardHeader>
  <CardContent>
    {features.map(f => (
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4" />
        <span>{f.name}</span>
      </div>
    ))}
  </CardContent>
  <CardFooter>
    <Button className="w-full">Get started</Button>
  </CardFooter>
</Card>
```

```
// Skeleton
Card
├── CardHeader
│   ├── CardTitle
│   └── Badge
├── CardContent
│   └── [repeat]
│       └── container
│           ├── icon
│           └── text
└── CardFooter
    └── Button
```

**Step 2: Compare skeletons**

Two skeletons are compared using tree edit distance (simplified):
- Count nodes in each skeleton
- Count matching nodes (same component at same depth with same parent)
- Similarity = matching nodes / max(nodes_a, nodes_b)

**Step 3: Apply thresholds**

| Similarity | Verdict | Action |
|-----------|---------|--------|
| 0-60% | **Distinct** | Pass. Ralph remixed effectively. |
| 60-80% | **Similar** | Warn. Log for diversity tracking. Allow. |
| 80-95% | **Too similar** | Flag. Ralph should remix more. Add to quality gate feedback: "Your [section] is >80% structurally identical to the reference. Try a different arrangement." |
| 95-100% | **Copied** | Reject. Ralph must rewrite. "This section is a near-copy of the reference implementation. Use a different composition from the recipe's remix arrangements." |

**What this catches:**
- Ralph copies an entire Composition A from a ref, changing only variable names and text
- Ralph copies the nesting structure but swaps prop values
- Ralph copies the skeleton of one ref and just changes which @wiggum/stack atoms are used

**What this doesn't catch (by design):**
- Ralph uses the same 3-atom sequence (Card > CardContent > Button) that appears in multiple refs — this is normal reuse, not copying
- Ralph uses the same gumdrop block atoms but in a genuinely different arrangement — that's the point
- Two independently-written sections that happen to be similar because the UI pattern naturally produces that structure

### Implementation

The similarity checker is a quality gate function that receives:
1. The section file Ralph wrote
2. The ref file for the gumdrop the plan specifies for that section

It parses both into skeletons, computes similarity, and returns a `GateResult` with the score and verdict. The gate runs alongside build-success, runtime-errors, and plan-diff gates.

Skeleton extraction is a lightweight TSX parse — not a full TypeScript compiler. We need component names and nesting, not type resolution. A regex-based or simple parser that tracks `<Component>` open/close tags and depth is sufficient. This runs in <50ms.

**Priority:** This gate should be implemented in Phase 5 (Anti-Slop Gates) alongside the structural checks. It is the single most important enforcement mechanism for the remix philosophy. Without it, block atoms are just better-organized templates.

---

## The Escape Hatch

### When No Gumdrop Fits

Ralph will encounter requests that no gumdrop covers. A custom data visualization. An unusual interaction pattern. A one-off layout that doesn't map to any of the 62 gumdrops. This is expected and fine.

**The protocol:**

1. **Ralph composes directly from @wiggum/stack atoms.** No gumdrop recipe needed. Card, Button, Table, Dialog — all available without a gumdrop wrapper.

2. **Anti-slop gates still apply.** No hardcoded colors (ESLint catches). No raw HTML elements (ESLint catches). Theme variables consumed (ESLint catches). Spacing consistency (Visual Review catches). The quality floor doesn't lower just because there's no gumdrop.

3. **Plan.tsx uses `<Section custom>` instead of `<Section gumdrop="...">`:**
   ```tsx
   <Section custom description="Interactive 3D model viewer with orbit controls">
     <Slot name="canvas" />
     <Slot name="controls" />
   </Section>
   ```
   This tells the plan-diff gate to skip gumdrop-specific checks for this section but still verify that the section exists and contains the declared slots.

4. **No similarity gate for custom sections.** There's no ref to compare against. The visual review and ESLint gates handle quality.

5. **Pattern tracking:** If the same custom pattern appears across 3+ projects (detected by the diversity tracker), it's a signal to create a new gumdrop. The pattern has proven its worth — formalize it.

### When Ralph Should NOT Use the Escape Hatch

- When a gumdrop exists but Ralph doesn't know about it → the mandatory skill lookup gate prevents this
- When Ralph is too lazy to load a ref → the write gate prevents this
- When Ralph wants to avoid remix constraints → the plan-diff gate catches deviation from plan

The escape hatch is for genuine gaps, not for bypassing the system.

---

## Composition Complexity Labels

### Why Labels Exist

Not every project needs advanced compositions. A simple landing page should use straightforward patterns. A differentiated SaaS app benefits from paradigm remixes. Without complexity labels, Chief has no vocabulary for matching composition sophistication to project requirements, and Ralph might attempt advanced compositions on simple projects (wasting iterations) or simple compositions on ambitious projects (producing slop).

### The Three Levels

**Simple** — One interaction pattern, minimal state. One or two gumdrops combined. Default choice for any section.

| # | Composition | Level |
|---|------------|-------|
| 1 | Card × Table (Data Surface) | Simple |
| 2 | Form × Drawer (Edit-in-Context) | Simple |
| 3 | Stats Cards × Collapsible (Progressive Disclosure) | Simple |
| 5 | Table × HoverCard (Inline Preview) | Simple |
| 23 | Metrics-as-Navigation Dashboard | Simple |
| 24 | Contextual Action Overlay | Simple |
| 27 | Hover-Dense Dashboard | Simple |
| 28 | Blog + Interactive Filter Surface | Simple |

**Intermediate** — Multi-state, progressive disclosure, 2-3 gumdrops combined. For apps with 3+ sections or meaningful interactivity.

| # | Composition | Level |
|---|------------|-------|
| 4 | Kanban × Sheet (Detail Panel) | Intermediate |
| 6 | Accordion × Form (Sectioned Input) | Intermediate |
| 7 | Command × Data Grid (Search-Driven) | Intermediate |
| 8 | Timeline × Card × Collapsible (Rich History) | Intermediate |
| 9 | Tabs × Mixed Gumdrops (Dashboard Zones) | Intermediate |
| 10 | Settings × Switch × Drawer (Progressive Settings) | Intermediate |
| 11 | File Browser × AspectRatio × ContextMenu | Intermediate |
| 12 | Pricing Merged Surface | Intermediate |
| 13 | Chat × Card (Rich Messages) | Intermediate |
| 14 | Onboarding × Progress × Tabs | Intermediate |
| 15 | Navigation × HoverCard (Mega-Menu) | Intermediate |
| 20 | Live Comparison Pricing Lab | Intermediate |
| 21 | Expandable Data Surface | Intermediate |
| 25 | File Browser with Preview Dock | Intermediate |
| 26 | Dual-Surface Comparison | Intermediate |
| 29 | Progressive Settings Engine | Intermediate |
| 30 | Timeline-as-Navigation Surface | Intermediate |

**Advanced** — Cross-domain paradigm remixes, intent routing, multi-system wiring. For differentiated products where composition IS the feature.

| # | Composition | Level |
|---|------------|-------|
| 16 | Spatial Context Builder (AI × Drag-Drop × Files) | Advanced |
| 17 | Inbox-Style Kanban (Table × Sheet × Chat) | Advanced |
| 18 | Live Article (Content × Form × Progress) | Advanced |
| 19 | Calendar-Driven Commerce | Advanced |
| 22 | Adaptive Command Workspace | Advanced |

### How Chief Uses Labels

Chief matches project complexity to composition level:

| Project Type | Default Level | Stretch Level |
|-------------|--------------|---------------|
| Landing page (marketing) | Simple | One Intermediate section |
| Blog / docs site | Simple | Intermediate for navigation |
| Todo / CRUD app | Simple + Intermediate | — |
| SaaS dashboard | Intermediate | One Advanced |
| Differentiated product | Intermediate + Advanced | — |
| Full-stack shell app | Intermediate + Advanced | — |

Chief encodes this in plan.tsx via the `compose` prop:

```tsx
{/* Landing page — mostly simple */}
<Section gumdrop="hero" />
<Section gumdrop="features" compose={["tabbed-features"]} />  {/* intermediate stretch */}
<Section gumdrop="pricing" />
<Section gumdrop="faq" />

{/* SaaS dashboard — intermediate baseline with one advanced */}
<Section gumdrop="stats-dashboard" compose={["metrics-as-nav"]} />
<Section gumdrop="data-table" compose={["expandable-rows", "hover-preview"]} />
<Section gumdrop="kanban-board" compose={["inbox-style"]} />  {/* advanced stretch */}
```

### Marketing Domain (14 gumdrops)

| Gumdrop | Block Atoms | Key Cross-Compositions |
|---------|-------------|----------------------|
| **hero** | HeroSection, HeroHeading, HeroSubheading, HeroCTA, HeroVisual, HeroBadge | + Input (search hero), + Avatar stack (social proof), + AspectRatio (media) |
| **features** | FeaturesSection, FeatureGrid, FeatureCard, FeatureIcon, FeatureTitle | + Tabs (tabbed features), + Bento grid (mixed sizes), + HoverCard (detail on hover) |
| **pricing** | PricingSection, PricingHeader, PricingGrid, PricingTier, PricingPrice, PricingToggle, PricingFeatures, PricingFeature, PricingCTA, PricingComparison | + Switch (annual toggle), + Table (comparison), + Badge (popular/savings) |
| **testimonials** | TestimonialSection, TestimonialCard, TestimonialQuote, TestimonialAuthor | + ScrollArea (horizontal), + Avatar, + HoverCard (author bio), + Carousel |
| **faq** | FAQSection, FAQGroup | + Accordion, + Tabs (categorized), + Input (search filter) |
| **cta** | CTASection, CTAHeading, CTAAction | + Input (email capture), + Badge (urgency), + Dialog (signup modal) |
| **team** | TeamSection, TeamGrid, TeamMember, TeamRole | + Avatar, + HoverCard (full bio), + Dialog (detail), + Badge (role) |
| **social-proof** | SocialProofSection, LogoStrip, MetricRow, TestimonialStrip | + Avatar (faces), + Badge (metrics), + Carousel (logo scroll) |
| **contact** | ContactSection, ContactForm, ContactInfo | + Form fields, + Textarea, + Select, + Card (info card) |
| **newsletter** | NewsletterSection, NewsletterForm | + Input + Button inline, + Badge (subscriber count) |
| **blog-grid** | BlogSection, BlogGrid, BlogCard, BlogMeta | + Card, + AspectRatio (cover), + Badge (category), + Pagination |
| **gallery** | GallerySection, GalleryGrid, GalleryItem | + AspectRatio, + Dialog (lightbox), + Tabs (filter) |
| **portfolio** | PortfolioSection, PortfolioGrid, PortfolioItem | + AspectRatio, + HoverCard (detail), + Badge (tech), + Dialog |
| **footer** | FooterSection, FooterColumn, FooterLink, FooterBottom | + Separator, + NavigationMenu, + Input (newsletter), + Badge |

### App Domain (21 gumdrops)

| Gumdrop | Block Atoms | Key Cross-Compositions |
|---------|-------------|----------------------|
| **stats-dashboard** | StatsGrid, StatCard, StatValue, StatChange, StatBreakdown | + Collapsible, + Progress, + Separator, + Card |
| **data-table** | DataTableSection, DataTableToolbar, DataTableFilters | + Table, + HoverCard (preview), + DropdownMenu (actions), + Pagination, + Input |
| **kanban-board** | KanbanBoard, KanbanColumn, KanbanCard | + Sheet (detail), + Card, + Badge, + Avatar, + DropdownMenu, + ContextMenu |
| **form-layout** | FormSection, FormGroup, FormRow, FormActions | + Accordion (sections), + Card, + Separator, + all input atoms |
| **auth-login** | AuthCard, AuthForm, AuthSocial, AuthDivider, AuthFooter | + Card, + Input, + Button, + Separator, + InputOTP |
| **sidebar-nav** | SidebarSection, SidebarGroup, SidebarItem, SidebarCollapse | + Sidebar, + Collapsible, + Badge (counts), + ScrollArea |
| **dialog-modal** | ModalSection, ConfirmDialog, FormDialog, DetailDialog | + Dialog, + AlertDialog, + Form inside Dialog, + Tabs inside Dialog |
| **command-palette** | CommandSection, CommandGroup, CommandAction | + Command, + Kbd, + Badge, + Avatar |
| **settings-panel** | SettingsSection, SettingsGroup, SettingRow | + Switch, + Drawer, + Tabs, + Separator, + RadioGroup |
| **onboarding** | OnboardingSection, OnboardingStep, OnboardingProgress | + Tabs (non-linear), + Progress, + Card, + Collapsible |
| **chat-messaging** | ChatSection, ChatBubble, ChatInput, ChatRichMessage | + ScrollArea, + Avatar, + Card (rich messages), + AspectRatio, + Popover |
| **notification-feed** | NotificationSection, NotificationItem, NotificationGroup | + Card, + Avatar, + Badge, + Separator, + DropdownMenu |
| **calendar-view** | CalendarSection, CalendarHeader, CalendarGrid, CalendarEvent | + Calendar, + Popover (event detail), + Badge, + Sheet (day view) |
| **search-results** | SearchSection, SearchBar, SearchResults, SearchResultItem | + Command, + Card, + Badge, + Pagination, + Skeleton |
| **empty-state** | EmptySection, EmptyIcon, EmptyMessage, EmptyAction | + Card, + Button |
| **profile-page** | ProfileSection, ProfileHeader, ProfileStats, ProfileContent | + Avatar, + Badge, + Tabs, + Card, + Separator |
| **activity-feed** | ActivitySection, ActivityItem, ActivityTimeline | + Card, + Collapsible, + Avatar, + Badge, + Separator |
| **grid-list** | GridSection, GridItem, GridToggle | + Card, + AspectRatio, + ContextMenu, + ToggleGroup (grid/list) |
| **file-browser** | FileBrowserSection, FileGrid, FileItem, FileActions | + Card, + AspectRatio, + ContextMenu, + Breadcrumb, + Badge |
| **file-upload** | UploadSection, DropZone, FilePreview, UploadProgress | + Card, + Progress, + Badge, + Button, + AspectRatio |
| **ai-prompt** | AIPromptSection, PromptInput, PromptSuggestions, ResponseArea | + Textarea, + Button, + Card, + Badge, + ScrollArea |

### Content Domain (4 gumdrops)

| Gumdrop | Block Atoms | Key Cross-Compositions |
|---------|-------------|----------------------|
| **article-layout** | ArticleSection, ArticleHeader, ArticleMeta, ArticleBody, ArticleSidebar | + Avatar, + Badge, + Separator, + ScrollArea (TOC) |
| **documentation** | DocSection, DocNav, DocContent, DocCodeBlock | + Sidebar, + Breadcrumb, + Tabs, + Collapsible |
| **changelog** | ChangelogSection, ChangelogEntry, ChangelogVersion | + Timeline, + Badge, + Collapsible, + Card |
| **timeline** | TimelineSection, TimelineItem, TimelineDot, TimelineConnector | + Card, + Collapsible, + Avatar, + Badge |

### Interactive Domain (7 gumdrops)

| Gumdrop | Block Atoms | Key Cross-Compositions |
|---------|-------------|----------------------|
| **drag-drop** | DragSection, DragItem, DragHandle, DropZone | + Card, + Badge, + Separator |
| **multi-step-wizard** | WizardSection, WizardStep, WizardNav, WizardProgress | + Progress, + Card, + Tabs, + form atoms |
| **rich-text-editor** | EditorSection, EditorToolbar, EditorCanvas, EditorSidebar | + ToggleGroup, + Popover, + Separator, + DropdownMenu |
| **color-picker** | ColorSection, ColorSwatch, ColorInput, ColorPreview | + Popover, + Input, + Slider, + Badge |
| **keyboard-shortcuts** | ShortcutSection, ShortcutGroup, ShortcutItem | + Kbd, + Table, + Dialog, + Command |
| **infinite-scroll** | InfiniteSection, InfiniteList, InfiniteLoader, InfiniteEnd | + Skeleton, + Card, + Spinner, + Button |
| **sortable-list** | SortableSection, SortableItem, SortableHandle | + Card, + Badge, + DropdownMenu, + Separator |

### API Domain (6 gumdrops — markdown only, no block atoms)

Unchanged: crud-resource, auth-session, file-upload-api, realtime-messaging, search-query, pagination-api. Server patterns, not visual compositions. But these are the glue that makes shells work — every shell references 1-3 API gumdrops for its data layer.

### Shells Domain (10 gumdrops — NEW)

Full-stack multi-pane applications. Each shell wires multiple section gumdrops + API gumdrops + shared Zod schemas into a cohesive application. Requires Hono full-stack integration (see `hono-fullstack-plan.md`).

| Shell | Pane Gumdrops Used | API Gumdrops Used | Description |
|-------|-------------------|-------------------|-------------|
| **data-observatory** | stats-dashboard, data-table, timeline, chart | crud-resource, search-query, pagination-api | Synced dashboard: filters + chart + table + timeline slider. Financial/analytics/security. |
| **pricing-lab** | pricing, chart, form-layout | crud-resource | Interactive pricing: Slider-driven usage sim, live cost breakdown, annual toggle. |
| **project-board** | kanban-board, stats-dashboard, chat-messaging | crud-resource, realtime-messaging | Hybrid kanban + analytics. Click column → stats. Click card → chat-style history. |
| **crm-workspace** | data-table, stats-dashboard, activity-feed, form-layout | crud-resource, search-query, pagination-api | Multi-pane CRM. Table + detail inspector + stats + activity timeline. |
| **file-manager** | file-browser, grid-list, file-upload | crud-resource, file-upload-api | Split-pane file manager. Grid/list left, preview dock right. ContextMenu + drag-drop. |
| **content-studio** | article-layout, rich-text-editor, blog-grid | crud-resource, search-query | Writing environment. Article list → editor → preview pane → published grid. |
| **ai-workspace** | ai-prompt, chat-messaging, file-browser | crud-resource, realtime-messaging | AI assistant: file context left, chat center, tool results right, session timeline bottom. |
| **admin-console** | stats-dashboard, data-table, settings-panel, activity-feed | crud-resource, auth-session, search-query | Admin: stats overview + resource management + progressive settings + audit log. |
| **marketplace** | grid-list, search-results, profile-page | crud-resource, search-query, pagination-api | Extension marketplace: search grid + HoverCard preview + install Drawer + ratings. |
| **event-stream** | notification-feed, stats-dashboard, timeline | realtime-messaging, search-query, pagination-api | Real-time event board: live cards, filter chips, animated counts, hover detail. |

---

## Reference File Format (.ref.tsx)

Each `.ref.tsx` is a working reference that demonstrates:
1. Block atom definitions (thin wrappers, 3-8 lines each)
2. Types/interfaces for data shapes
3. Composition A: primary arrangement
4. Composition B: alternate remix

```tsx
// pricing.ref.tsx — Reference implementation
// Ralph: READ this, then WRITE YOUR OWN. Do not copy verbatim.

import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Check, X } from "lucide-react"

// ─── TYPES ──────────────────────────────────────────
interface Tier {
  name: string; description: string; price: number
  featured?: boolean; features: { name: string; included: boolean }[]
  cta: string
}

// ─── BLOCK ATOMS ────────────────────────────────────

function PricingSection({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("py-20 px-6", className)}>{children}</section>
}

function PricingHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("text-center max-w-2xl mx-auto mb-12", className)}>{children}</div>
}

function PricingHeading({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <h2 className={cn("text-4xl font-bold tracking-tight", className)}>{children}</h2>
}

function PricingGrid({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto", className)}>{children}</div>
}

function PricingTier({ featured, children, className }: PropsWithChildren<{ featured?: boolean; className?: string }>) {
  return (
    <Card className={cn(featured && "border-primary shadow-lg relative", className)}>
      {featured && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>}
      {children}
    </Card>
  )
}

function PricingPrice({ amount, interval = "mo", className }: { amount: number; interval?: string; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className="text-4xl font-bold tabular-nums">${amount}</span>
      <span className="text-muted-foreground">/{interval}</span>
    </div>
  )
}

function PricingFeatures({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <ul className={cn("space-y-2", className)}>{children}</ul>
}

function PricingFeature({ included = true, children }: PropsWithChildren<{ included?: boolean }>) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {included ? <Check className="h-4 w-4 text-primary shrink-0" /> : <X className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className={cn(!included && "text-muted-foreground")}>{children}</span>
    </li>
  )
}

function PricingCTA({ variant = "default", children, className }: PropsWithChildren<{ variant?: "default" | "outline" | "ghost"; className?: string }>) {
  return <Button variant={variant} className={cn("w-full", className)}>{children}</Button>
}

// ─── COMPOSITION A: Traditional 3-tier grid ─────────
function PricingTraditional({ tiers }: { tiers: Tier[] }) {
  return (
    <PricingSection>
      <PricingHeader>
        <Badge variant="secondary" className="mb-4">Pricing</Badge>
        <PricingHeading>Simple, transparent pricing</PricingHeading>
      </PricingHeader>
      <PricingGrid>
        {tiers.map(tier => (
          <PricingTier key={tier.name} featured={tier.featured}>
            <CardHeader><CardTitle>{tier.name}</CardTitle><CardDescription>{tier.description}</CardDescription></CardHeader>
            <CardContent>
              <PricingPrice amount={tier.price} />
              <Separator className="my-4" />
              <PricingFeatures>
                {tier.features.map(f => <PricingFeature key={f.name} included={f.included}>{f.name}</PricingFeature>)}
              </PricingFeatures>
            </CardContent>
            <CardFooter><PricingCTA variant={tier.featured ? "default" : "outline"}>{tier.cta}</PricingCTA></CardFooter>
          </PricingTier>
        ))}
      </PricingGrid>
    </PricingSection>
  )
}

// ─── COMPOSITION B: Merged surface ─────────────────
function PricingMerged({ tiers }: { tiers: Tier[] }) {
  return (
    <PricingSection>
      <PricingHeader><PricingHeading>One price for everything</PricingHeading></PricingHeader>
      <div className="border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-x max-w-5xl mx-auto">
        {tiers.map(tier => (
          <PricingTier key={tier.name} featured={tier.featured} className="border-0 rounded-none shadow-none">
            <CardHeader><CardDescription>{tier.name}</CardDescription><PricingPrice amount={tier.price} /></CardHeader>
            <CardContent>
              <PricingFeatures>{tier.features.filter(f => f.included).map(f => <PricingFeature key={f.name}>{f.name}</PricingFeature>)}</PricingFeatures>
            </CardContent>
            <CardFooter><PricingCTA variant={tier.featured ? "default" : "ghost"}>{tier.cta}</PricingCTA></CardFooter>
          </PricingTier>
        ))}
      </div>
    </PricingSection>
  )
}
```

---

## Updated Markdown Recipe Format

```markdown
---
name: pricing
domain: marketing
intent: Display pricing tiers, plans, or subscription options
complexity: intermediate
atoms: PricingSection, PricingHeader, PricingHeading, PricingGrid, PricingTier, PricingPrice, PricingToggle, PricingFeatures, PricingFeature, PricingCTA
stack: Card, Badge, Button, Switch, Separator, Tabs, Table
ref: pricing.ref.tsx
---

# Pricing

## Block Atoms
- PricingSection — outer wrapper (py-20 px-6)
- PricingHeader — centered intro (max-w-2xl mx-auto text-center)
- PricingHeading — section title (text-4xl font-bold)
- PricingGrid — tier layout (grid grid-cols-1 md:grid-cols-3)
- PricingTier — individual tier (Card wrapper, featured variant)
- PricingPrice — price display (tabular-nums)
- PricingToggle — annual/monthly Switch
- PricingFeatures — feature list (ul space-y-2)
- PricingFeature — feature with Check/X
- PricingCTA — action Button (w-full)

## Remix Arrangements
- **A: Traditional Tiers** — PricingGrid → PricingTier × 3. Middle featured.
- **B: Merged Surface** — single border div → PricingTier × 3 (border-0). divide-x.
- **C: Single Featured** — large PricingTier + small grid of 2 alternatives.
- **D: Toggle + Comparison** — PricingToggle → PricingGrid → Table comparison below.

## Cross-Compositions
- PricingTier can contain Chart (usage viz)
- PricingTier can contain Avatar stack (team plan)
- PricingSection inside Tabs (product × plan tiers)
- PricingGrid replaced with Carousel on mobile

## Anti-Patterns
- ❌ All tiers identical — featured MUST differ
- ❌ Features > 10 items — group or use Table
- ❌ No CTA differentiation
- ❌ >80% similarity to ref.tsx — remix it
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

Establish pattern on 3 priority gumdrops:
1. Update `SKILL.md` with remix composition rules
2. Write `marketing/pricing.ref.tsx`
3. Write `app/stats-dashboard.ref.tsx`
4. Write `app/data-table.ref.tsx`
5. Update corresponding `.md` files to new format
6. Test: Ralph builds pricing page. Compare quality to prose-only approach.

### Phase 2: Marketing Domain (Week 2)

11 remaining marketing refs: hero, features, testimonials, faq, cta, team, social-proof, contact, newsletter, blog-grid, gallery, portfolio, footer

Priority: hero → features → testimonials → faq → footer → rest

### Phase 3: App Domain (Week 3-4)

21 app refs. More complex (~100-150 lines each).

Priority: kanban → form-layout → auth → sidebar-nav → chat → command-palette → settings → rest

### Phase 4: Content + Interactive (Week 5)

11 remaining refs across content (4) and interactive (7).

### Phase 5: Anti-Slop Gates (Week 6)

1. Structural similarity check (>80% match to ref = flag)
2. Cross-composition verification (2+ sections must use cross-component combos)
3. Block atom diversity tracking (same arrangement 3+ projects = flag)
4. Update quality gates for block atom validation

### Phase 6: Shells Domain (Week 7-8) — requires Hono full-stack

10 shell gumdrops. Each gets up to 4 files (.md, .ref.tsx, .api.ts, .schema.ts). Larger refs (~150-250 lines) because they wire pane layouts + API scaffolds + shared hooks.

**Dependency:** Hono Service Worker integration must be working (see `hono-fullstack-plan.md` Phases 0-2). Shell refs can be written before Hono ships, but they can't be tested end-to-end until the backend preview works.

Priority order:
1. **project-board** — best showcase (kanban + stats + chat history in Sheet)
2. **crm-workspace** — universal object inspector pattern, high reuse value
3. **data-observatory** — synced multi-pane dashboard, impressive demo
4. **file-manager** — Resizable split pane, native-app feel
5. **ai-workspace** — extremely Wiggum-aligned, dogfood potential
6. **pricing-lab** — marketing + interactive, strong demo value
7. **admin-console** — common enterprise pattern
8. **content-studio** — writing tools, differentiated
9. **marketplace** — search + install flow
10. **event-stream** — real-time showcase

### Phase 7: Integration Testing (Week 8)

| Project | Expected Cross-Compositions |
|---------|---------------------------|
| SaaS landing | Tabbed features, Merged pricing OR Pricing Lab, HoverCard testimonials |
| Project mgmt app | Collapsible stats, Sheet kanban detail, HoverCard table, Metrics-as-nav |
| E-commerce | Dialog lightbox gallery, Command search, Drawer cart, Contextual action bar |
| Docs site | Collapsible doc sections, Command search, Timeline changelog |
| Chat app | Rich Card messages, Switch+Drawer settings |
| CRM | CRM workspace shell, Expandable data surface, Hover-dense table |
| Analytics dashboard | Data observatory shell, Metrics-as-nav, Timeline slider sync |
| File hosting app | File manager shell, Upload dropzone, Preview dock |

Success criteria:
- Two runs of same project type → visually DIFFERENT output
- Shell-based apps have working Hono APIs in Service Worker preview
- Cross-compositions appear naturally (Ralph isn't forced to use them — the refs show them, Ralph applies them when appropriate)

---

## Numbers

| Metric | Count |
|--------|-------|
| Gumdrop domains | 6 (marketing, app, content, interactive, api, shells) |
| Section gumdrops | 46 (markdown + ref) |
| API gumdrops | 6 (markdown only) |
| Shell gumdrops | 10 (markdown + ref + api + schema) |
| **Total gumdrops** | **62** |
| New .ref.tsx files | ~51 (41 section + 10 shell) |
| New .api.ts files | ~10 (shells only) |
| New .schema.ts files | ~10 (shells only) |
| **Total new files** | **~71** |
| Block atoms (section level) | ~287 |
| Lines per block atom | 3-8 (hard ceiling: 25) |
| Lines per section ref | ~100-120 |
| Lines per shell ref | ~150-250 |
| **Total new code** | **~7,500 lines** |
| Cross-composition patterns | 30 documented |
| Paradigm remixes | 4 documented |
| Shell application types | 10 documented |
| Composition complexity: Simple | 8 |
| Composition complexity: Intermediate | 17 |
| Composition complexity: Advanced | 5 |
| Block atom naming suffixes | 10 standardized |
| Similarity threshold (flag) | >80% structural match |
| Similarity threshold (reject) | >95% structural match |

---

## What This Enables

1. **First in shadcn ecosystem** to carry compound pattern to block level
2. **Diverse output** — same block atoms, different arrangements every time
3. **Anti-slop by architecture** — pieces don't prescribe layout
4. **Themed for free** — wraps atoms that already consume CSS variables
5. **Progressive loading** — markdown first (30 lines), ref on demand (~120 lines)
6. **Cross-domain composition** — 30 combos no AI would default to, plus 4 paradigm remixes that redefine interface categories
7. **Full-stack applications from gumdrops** — shells wire section gumdrops + API gumdrops + Hono backend into complete multi-pane apps. Same composition philosophy, larger scale.
8. **Section → App continuum** — Ralph doesn't mode-switch between "building a pricing section" and "building a CRM." Both are gumdrop compositions. Shells are just bigger ones with a data layer.
9. **Future-proof** — new section gumdrop = 5-8 wrappers + 2 compositions (afternoon of work). New shell = layout skeleton + pane refs + API scaffold (day of work).

### The Scale

```
@wiggum/stack (54 atoms)
     ↓
Section gumdrops (46 × ~6 block atoms = ~287 composable pieces)
     ↓ compose into ↓
Cross-compositions (30 documented patterns + infinite unnamed ones)
     ↓ wire together via ↓
API gumdrops (6 Hono backend patterns)
     ↓ combine into ↓
Shell gumdrops (10 full-stack multi-pane applications)
     ↓ themed by ↓
Theme system (12 moods × dark/light × font pairings)
     ↓ validated by ↓
Anti-slop gates (structural similarity, diversity, composition checks)
```

From 54 atoms to millions of meaningfully distinct applications. Every layer is composable. Every layer is real code. Every layer consumes CSS variables for automatic theming. Every layer is searchable by intent.

The theme system makes ugly impossible.
Gumdrops Remix makes boring impossible.
Shells make "just a frontend" impossible.
Quality gates make slop impossible.
