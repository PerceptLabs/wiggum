---
name: ralph
description: Autonomous iteration loop for complex tasks exceeding single context window
when_to_use: Multi-step projects, large refactors, extended sessions, context pollution concerns
---

# Ralph: Autonomous Iteration Loop

Ralph enables persistent progress on complex tasks by storing state in files and git, not LLM memory. Each iteration reads state, executes work, commits progress, and checks completion.

## Core Principle

**Progress lives in files and git, not in the conversation.** When context fills or errors occur, ralph can resume from the last committed state without losing work.

## State Files

Ralph maintains state in `.wiggum/ralph/`:

| File | Purpose |
|------|---------|
| `task.md` | Original task description, never modified after init |
| `progress.md` | Completed work, updated each iteration |
| `feedback.md` | User feedback, blocking issues, questions |
| `iteration.txt` | Current iteration number (1, 2, 3...) |
| `status.txt` | Current status: `running`, `complete`, `waiting`, `error` |

## Iteration Steps

Each ralph iteration follows this sequence:

1. **Read State** - Load task.md, progress.md, feedback.md
2. **Plan** - Determine next actionable step based on remaining work
3. **Execute** - Perform the work (edit files, run commands)
4. **Update Progress** - Append completed work to progress.md
5. **Commit** - Create git commit with iteration number
6. **Check Completion** - If task complete, set status to `complete`

## Commands

```bash
ralph init "Build user authentication system"  # Initialize new task
ralph run                                       # Start/continue iterations
ralph status                                    # Show current state
ralph resume                                    # Resume after interruption
```

## Signaling

Update `status.txt` to signal state changes:

- `running` - Actively working on task
- `complete` - Task finished successfully
- `waiting` - Blocked, needs user input (describe in feedback.md)
- `error` - Unrecoverable error (describe in feedback.md)

## Best Practices

1. Keep iterations small and focused - one logical unit of work
2. Commit after each iteration for recovery points
3. Write clear progress entries for context recovery
4. Use feedback.md for questions rather than assuming
5. Check for existing progress before starting new work
