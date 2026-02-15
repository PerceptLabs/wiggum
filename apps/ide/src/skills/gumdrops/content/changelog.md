---
name: changelog
domain: content
intent: Version history with release notes, badges, and date grouping
complexity: basic
components: Badge, Separator, Card
---

# Changelog

## Recipe
**Core:** Reverse-chronological list of releases. Each release: version heading
(text-xl font-bold) + date (text-sm text-muted-foreground) + Badge for release type +
change list. Separator between releases.

**Release types (Badge variants):**
- "Major" — destructive (red)
- "Minor" — default (primary)
- "Patch" — secondary
- "Beta" — outline

**Change list:** Grouped by type with prefix icons:
- Added (Plus icon, green): new features
- Changed (Pencil icon, blue): modifications
- Fixed (Bug icon, yellow): bug fixes
- Removed (Trash icon, red): deprecated/removed

**Enhancements:**
- Card wrapper per release for visual grouping
- Filter by release type: Button group or Select
- Link to full release notes or GitHub release
- "Latest" Badge on most recent release

## Variants
- **timeline**: Vertical timeline with version nodes. Visual.
- **card-list**: Each release in a Card. Clear separation.
- **compact**: Version + one-line summary per release. Dense overview.
- **grouped**: Changes grouped by type across releases. Feature-focused.

## Anti-Patterns
- ❌ No version numbers — MUST clearly label each release
- ❌ No dates — temporal context is essential
- ❌ No change categorization — group by Added/Changed/Fixed/Removed
- ❌ Wall of text — use lists, badges, and separators for scanning

## Composition Notes
- Links from documentation sidebar as "Changelog" nav item
- Pairs with timeline for visual release history
- Badge types align with semver conventions
- Can link each version to corresponding git tag or release page
