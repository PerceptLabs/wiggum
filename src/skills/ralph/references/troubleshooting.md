# Troubleshooting Guide

## Common Issues

### Context Window Exhaustion

**Symptom:** Responses become truncated or conversation ends unexpectedly.

**Solution:**
1. Ralph automatically handles this via state files
2. Run `ralph resume` to continue from last committed state
3. Progress.md contains all completed work
4. New context starts fresh but informed

### Lost Progress

**Symptom:** Work done but not reflected after resume.

**Cause:** Iteration completed but not committed to git.

**Prevention:**
- Always commit after updating progress.md
- Use atomic commits: `git add . && git commit -m "ralph: iteration N"`

**Recovery:**
1. Check `git status` for uncommitted changes
2. Check `git stash list` for stashed work
3. Review file modification times

### Stuck in Waiting State

**Symptom:** Status shows "waiting" but no clear blocking issue.

**Solution:**
1. Check feedback.md for pending questions
2. Answer questions or provide clarification
3. Update feedback.md with responses
4. Run `ralph resume`

### Infinite Loop

**Symptom:** Iterations repeat without progress.

**Causes:**
- Task completion criteria unclear
- Progress entries too vague
- Skipping already-done work

**Solution:**
1. Review progress.md for duplicate entries
2. Clarify task.md with explicit completion criteria
3. Add "DONE:" prefix to completed subtasks
4. Check if detecting already-modified files

### Git Conflicts

**Symptom:** Cannot commit due to conflicts.

**Solution:**
1. Run `git status` to identify conflicts
2. Resolve conflicts manually
3. Stage resolved files
4. Continue with `ralph resume`

### Wrong Branch

**Symptom:** Work committed to wrong branch.

**Solution:**
1. Note current commit hash
2. Switch to correct branch
3. Cherry-pick commits: `git cherry-pick <hash>`
4. Update ralph state to reflect new location

## State Recovery

### Corrupted State Files

If state files are corrupted:

```bash
# Check git history for last good state
git log --oneline .wiggum/ralph/

# Restore from specific commit
git checkout <commit> -- .wiggum/ralph/

# Or reset to start fresh
ralph init "Task description"
```

### Missing Iteration Count

If iteration.txt is missing or incorrect:

1. Count commits since ralph started
2. Or count entries in progress.md
3. Recreate: `echo "N" > .wiggum/ralph/iteration.txt`

## Performance Issues

### Slow Iterations

**Causes:**
- Reading too many files per iteration
- Large test suites running each time
- Unnecessary full rebuilds

**Solutions:**
- Focus on specific files per iteration
- Run targeted tests only
- Use incremental builds

### Large Progress Files

If progress.md grows too large:

1. Archive completed sections to progress-archive.md
2. Keep only recent iterations in main progress.md
3. Reference archive for historical context

## Best Practices Reminders

1. **Small Iterations**: One logical unit of work per iteration
2. **Clear Progress**: Write entries that future-you can understand
3. **Frequent Commits**: Commit after every successful iteration
4. **Early Questions**: Use feedback.md instead of guessing
5. **Status Updates**: Keep status.txt current
