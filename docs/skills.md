# Skills

Skills are packaged prompts and reference documents that extend Wiggum's capabilities.

## What Are Skills?

A skill is a directory containing:
- A main prompt (SKILL.md)
- Supporting reference documents

When loaded, skills augment the AI's system prompt with specialized knowledge.

## Skill Structure

```
skills/
└── my-skill/
    ├── SKILL.md           # Main prompt
    └── references/        # Supporting docs
        ├── api.md
        └── examples.md
```

### SKILL.md

The main skill prompt. Defines behavior, capabilities, and instructions.

```markdown
# My Skill

You are an expert at [specific domain].

## Capabilities

- Capability 1
- Capability 2

## Instructions

When the user asks about [topic]:
1. Do this
2. Then this
3. Finally this

## References

See the references/ directory for:
- api.md — API documentation
- examples.md — Usage examples
```

### references/

Supporting documents the AI can read for context. These are loaded on demand.

## Built-in Skills

### ralph

The autonomous coding loop skill. Automatically loaded for all sessions.

```
skills/ralph/
├── SKILL.md
└── references/
    └── loop-protocol.md
```

Defines how the AI should:
- Read and understand .ralph/ state
- Update progress after each step
- Signal completion
- Handle errors and edge cases

## Creating Custom Skills

1. Create a directory in `skills/`:

```bash
mkdir -p skills/my-skill/references
```

2. Write the main prompt:

```bash
cat > skills/my-skill/SKILL.md << 'EOF'
# My Skill

[Skill definition here]
EOF
```

3. Add reference docs as needed:

```bash
cat > skills/my-skill/references/guide.md << 'EOF'
# Guide

[Reference content here]
EOF
```

## How Skills Are Loaded

Skills are loaded by the session manager:

```typescript
// lib/skills/loader.ts
export async function loadSkill(fs, skillPath): Promise<Skill> {
  const prompt = await fs.readFile(`${skillPath}/SKILL.md`)
  const refs = await loadReferences(fs, `${skillPath}/references`)

  return { prompt, references: refs }
}
```

The skill prompt is appended to the system prompt:

```typescript
const systemPrompt = `
${baseSystemPrompt}

## Skills

${skill.prompt}
`
```

## Skill Best Practices

### Be Specific

Good:
```markdown
When creating React components, always:
1. Use functional components with hooks
2. Define props with TypeScript interfaces
3. Export as named exports
```

Bad:
```markdown
Be good at React.
```

### Include Examples

```markdown
## Example

User: Create a button component

Response: I'll create a typed Button component:

\`\`\`tsx
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  )
}
\`\`\`
```

### Reference External Docs

For complex APIs, include reference docs:

```
references/
├── api-endpoints.md
├── data-models.md
└── error-codes.md
```

The AI can read these when needed for accurate responses.

## Future: Skill Discovery

Planned features:
- Skill marketplace
- Automatic skill detection from project type
- Skill versioning
- Skill dependencies
