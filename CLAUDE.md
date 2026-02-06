# Claude Code Instructions

## Git Workflow - Snapshots

When I say "push", "snapshot", or "checkpoint":

1. `git add -A` - Stage everything
2. `git commit -m "Snapshot: <description>"` - Use context from recent work for description
3. `git branch snapshot-YYYY-MM-DD-<short-description>` - Create branch WITHOUT switching
4. `git push origin snapshot-YYYY-MM-DD-<short-description>` - Push the snapshot
5. Stay on current branch - do NOT checkout the snapshot
6. Tell me: what was committed, the snapshot branch name, and confirm I'm still on my working branch

These are frozen checkpoints. I never switch to them. I keep working on main.

**Example** - if I say "push - shell stuff done":
- Commit: `Snapshot: shell improvements complete`
- Branch: `snapshot-2026-02-03-shell-improvements`
- Push it
- Stay on main
