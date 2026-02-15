---
name: profile-page
domain: app
intent: User profile display with avatar, details, tabs, and edit capabilities
complexity: intermediate
components: Avatar, Card, Tabs, Badge, Button
---

# Profile Page

## Recipe
**Core:** Profile header + Tabs for content sections.
Header: large Avatar + name (text-2xl font-bold) + bio/title (text-muted-foreground) +
Badge for role/status + Button ("Edit Profile" or "Follow").

**Profile header layout:** flex gap-6 items-start. Avatar (size w-24 h-24) on left,
details stacked on right. Stats row below: flex gap-6 with counts
(posts, followers, following) as text-sm.

**Tabs content:** TabsList with TabsTrigger per section (Overview, Posts, Activity, Settings).
Each TabsContent renders section-specific content.

**Enhancements:**
- Cover image/banner above Avatar
- Edit mode: Dialog with form for updating profile fields
- Badge for verification or role (Admin, Pro, etc.)
- Activity tab reuses activity-feed pattern

## Variants
- **standard**: Header + Tabs. Classic profile layout.
- **card-style**: Profile info in a centered Card. Compact, social media feel.
- **sidebar-profile**: Profile summary in sidebar, content in main area.
- **public-profile**: Read-only view for other users, with Follow Button.

## Interaction Patterns
- Edit profile: Button opens Dialog with form (name, bio, avatar upload)
- Tab navigation: Tabs component switches content sections
- Follow/unfollow: Button toggles state with optimistic update
- Avatar upload: click Avatar to trigger file-upload flow

## Data Patterns

### Frontend-only
- useState for profile object (name, bio, avatar, role)
- Edits update local state directly
- Avatar stored as data URL or placeholder
- Stats are hardcoded numbers for demo

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/user.ts (id, name, email, bio, avatarUrl, role, createdAt)
- API: GET /api/users/:id, PATCH /api/users/:id, POST /api/users/:id/avatar (multipart)
- Client hook: useProfile(userId) → { profile, updateProfile, uploadAvatar, isLoading }
- Avatar upload: FormData with file, returns new URL
- Loading skeleton for profile header on initial fetch

## Anti-Patterns
- ❌ No Avatar — profile MUST have visual identity
- ❌ No edit capability for own profile — always provide edit flow
- ❌ All content on one page without Tabs — use Tabs to organize sections
- ❌ No role/status indicator — Badge helps identify user type

## Composition Notes
- Accessible from user avatar DropdownMenu in app header
- Edit Dialog reuses form-layout patterns
- Activity tab embeds activity-feed component
- Settings tab can link to or embed settings-panel
