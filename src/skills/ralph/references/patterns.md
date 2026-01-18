# Common Task Patterns

## New Feature Implementation

**Task Example:** "Add user authentication with email/password"

**Iteration Breakdown:**
1. Design data models (User schema, session handling)
2. Create database migrations
3. Implement registration endpoint
4. Implement login endpoint
5. Add session middleware
6. Create protected route wrapper
7. Add logout functionality
8. Write tests for auth flows
9. Update documentation

**Progress Entry Pattern:**
```markdown
## Iteration 3: Registration Endpoint
- Created POST /api/auth/register endpoint
- Added password hashing with bcrypt
- Implemented email validation
- Returns JWT token on success
- Commits: a1b2c3d
```

## Refactoring

**Task Example:** "Migrate from callbacks to async/await"

**Iteration Breakdown:**
1. Identify all callback-based functions
2. Convert utility functions first (no dependencies)
3. Convert service layer functions
4. Convert API handlers
5. Update tests for async patterns
6. Remove callback helper utilities
7. Final review and cleanup

**Progress Entry Pattern:**
```markdown
## Iteration 2: Utility Functions
- Converted fileUtils.js (5 functions)
- Converted cacheUtils.js (3 functions)
- All utility tests passing
- No breaking changes to public API
```

## Bug Fix

**Task Example:** "Fix race condition in order processing"

**Iteration Breakdown:**
1. Reproduce the bug with test case
2. Identify root cause through logging
3. Implement fix with proper locking
4. Verify test case passes
5. Add regression tests
6. Review for similar patterns elsewhere

**Progress Entry Pattern:**
```markdown
## Iteration 1: Bug Reproduction
- Created test case that triggers race condition
- Bug occurs when two orders submitted within 50ms
- Root cause: non-atomic inventory check and decrement
- Added logging to confirm theory
```

## Migration

**Task Example:** "Migrate from Express to Fastify"

**Iteration Breakdown:**
1. Set up Fastify alongside Express
2. Create route adapter layer
3. Migrate utility routes first
4. Migrate core business routes
5. Migrate authentication middleware
6. Update tests to use new server
7. Remove Express dependencies
8. Performance testing and tuning

## Code Review / Audit

**Task Example:** "Security audit of API endpoints"

**Iteration Breakdown:**
1. Inventory all public endpoints
2. Check authentication requirements
3. Review input validation
4. Check for injection vulnerabilities
5. Review rate limiting
6. Check error message exposure
7. Document findings and recommendations
8. Implement critical fixes
