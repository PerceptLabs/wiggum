---
name: auth-login
domain: app
intent: Login, registration, and authentication flows
complexity: intermediate
components: Card, Input, Button, Checkbox, Separator, Label
---

# Auth / Login

## Recipe
**Core:** Centered Card (sm:max-w-md, min-h-dvh flex items-center justify-center) +
Logo/heading + Input fields (email, password) + Button (full-width submit) +
footer links (forgot password, create account)

**Registration extends:** + name Input, confirm password Input, Checkbox (terms agreement)

**Social login:** Separator with "or" text (flex items-center: line + text + line) +
Button(variant=outline) for each provider (Google, GitHub icons)

## Variants
- **simple-login**: Email + password + submit. Minimal.
- **with-social**: + Separator + social login buttons below form.
- **registration**: Full registration with name, email, password, confirm, terms checkbox.
- **split-layout**: Two-column — form one side, illustration/image other side.

## Interaction Patterns
- Password visibility: useState boolean, Eye/EyeOff icon toggle, type="password"/"text"
- Form state: useState for each field (email, password, etc.)
- Validation: email format, password minimum length, confirm match
- Submit: disable Button + show loading state during auth

## Data Patterns

### Frontend-only
- Simulated auth: store "logged in" boolean in useState or localStorage
- No real authentication — just UI flow demonstration
- Redirect to dashboard on "success"

### Full-stack (when Hono backend exists)
- Zod schemas: LoginSchema { email, password }, RegisterSchema { name, email, password }
  in src/shared/schemas/auth.ts
- API: POST /api/auth/login → validates credentials, returns session token
- API: POST /api/auth/register → creates user, returns session token
- API: POST /api/auth/logout → invalidates session
- API: GET /api/auth/me → returns current user (for session validation)
- Session: httpOnly cookie or Authorization header (see auth-session API gumdrop)
- Client hook: useAuth() → { user, isLoading, login, register, logout }
- Protected routes: check useAuth().user, redirect to /login if null
- Error handling: 401 → "Invalid credentials" message, 409 → "Email already exists"

## Anti-Patterns
- ❌ Password in plain text (no visibility toggle)
- ❌ No loading state on submit
- ❌ Registration without password confirmation
- ❌ No link between login and register flows
- ❌ Storing passwords in localStorage (frontend-only is simulation only)

## Composition Notes
- Standalone page — not a section within another page
- After login, redirect to dashboard (stats-dashboard + sidebar-nav)
- Registration can lead into onboarding gumdrop flow
