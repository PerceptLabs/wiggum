/**
 * snapshot - Git-based save points with task-aware tagging
 *
 * First command to use the Toolkit 2.0 dual-mode pattern (argsSchema + parseCliArgs).
 * Works as both a shell string command and a discrete typed LLM tool.
 *
 * Actions:
 *   save     — commit all changes + create a tag
 *   list     — show snapshot tags with dates and messages
 *   rollback — hard restore to a tagged snapshot
 *   diff     — file-level changes since a tagged snapshot
 *   status   — uncommitted changes + last snapshot info
 */

import { z } from 'zod'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'

// ============================================================================
// SCHEMA (Toolkit 2.0 dual-mode)
// ============================================================================

const SnapshotArgsSchema = z.object({
  action: z.enum(['save', 'list', 'rollback', 'diff', 'status']),
  message: z.string().optional().describe('Commit message (for save)'),
  tag: z.string().optional().describe('Tag name (for rollback, diff)'),
})

type SnapshotArgs = z.infer<typeof SnapshotArgsSchema>

const SNAPSHOT_AUTHOR = { name: 'Wiggum Snapshot', email: 'snapshot@wiggum.local' }

// ============================================================================
// COMMAND
// ============================================================================

export class SnapshotCommand implements ShellCommand<SnapshotArgs> {
  name = 'snapshot'
  description = 'Git-based save points with task-aware tagging (save/list/rollback/diff/status)'

  argsSchema = SnapshotArgsSchema

  examples = [
    'snapshot save "before CTA redesign"',
    'snapshot list',
    'snapshot rollback task-2-post',
    'snapshot diff task-2-post',
    'snapshot status',
  ]

  parseCliArgs(args: string[]): unknown {
    const [action, ...rest] = args
    if (action === 'save') return { action, message: rest.join(' ') || undefined }
    if (action === 'rollback' || action === 'diff') return { action, tag: rest[0] }
    return { action }
  }

  async execute(args: SnapshotArgs, options: ShellOptions): Promise<ShellResult> {
    const { git } = options
    if (!git) {
      return { exitCode: 1, stdout: '', stderr: 'snapshot: git not available' }
    }

    switch (args.action) {
      case 'save': return this.save(args, options)
      case 'list': return this.list(options)
      case 'rollback': return this.rollback(args, options)
      case 'diff': return this.diff(args, options)
      case 'status': return this.status(options)
      default:
        return { exitCode: 1, stdout: '', stderr: `snapshot: unknown action "${args.action}"` }
    }
  }

  // --------------------------------------------------------------------------
  // SAVE
  // --------------------------------------------------------------------------

  private async save(args: SnapshotArgs, options: ShellOptions): Promise<ShellResult> {
    const git = options.git!
    const tagName = `manual-${Date.now()}`
    const message = args.message || 'manual snapshot'

    try {
      // Stage all changes by content hash (not stat-based detection).
      // add('.') re-hashes all files, which is reliable with LightningFS.
      // addAll() uses statusMatrix stat-based detection, which can miss changes
      // when file mtimes don't update (e.g., fake-indexeddb in tests).
      await git.add('.')

      // Check for actual staged changes after add (stat-based check is unreliable)
      const matrix = await git.statusMatrix()
      const hasChanges = matrix.some(([, head, , stage]) =>
        head !== stage
      )
      if (!hasChanges) {
        return { exitCode: 0, stdout: 'Nothing to snapshot — no changes since last commit.\n', stderr: '' }
      }

      // Commit
      const oid = await git.commit({
        message: `snapshot: ${message}`,
        author: SNAPSHOT_AUTHOR,
      })

      // Tag
      await git.tag(tagName)

      const shortOid = oid.slice(0, 7)
      return {
        exitCode: 0,
        stdout: `Snapshot saved: ${tagName} (${shortOid})\nMessage: ${message}\n`,
        stderr: '',
      }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `snapshot save: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  // --------------------------------------------------------------------------
  // LIST
  // --------------------------------------------------------------------------

  private async list(options: ShellOptions): Promise<ShellResult> {
    const git = options.git!

    try {
      const allTags = await git.listTags()
      const snapshotTags = allTags.filter(t =>
        t.startsWith('task-') || t.startsWith('manual-') || t.startsWith('stall-')
      )

      if (snapshotTags.length === 0) {
        return { exitCode: 0, stdout: 'No snapshots found.\n', stderr: '' }
      }

      const lines: string[] = ['Snapshots:']
      lines.push('')

      for (const tag of snapshotTags.sort().reverse()) {
        try {
          const oid = await git.resolveRef(tag)
          const [commit] = await git.log({ ref: oid, depth: 1 })
          const date = new Date(commit.commit.author.timestamp! * 1000)
          const dateStr = date.toISOString().replace('T', ' ').slice(0, 19)
          const msg = commit.commit.message.replace(/^snapshot: /, '')
          lines.push(`  ${tag}  ${dateStr}  ${msg}`)
        } catch {
          lines.push(`  ${tag}  (unable to read)`)
        }
      }

      lines.push('')
      return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `snapshot list: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  // --------------------------------------------------------------------------
  // ROLLBACK
  // --------------------------------------------------------------------------

  private async rollback(args: SnapshotArgs, options: ShellOptions): Promise<ShellResult> {
    const git = options.git!
    const tag = args.tag

    if (!tag) {
      return { exitCode: 1, stdout: '', stderr: 'snapshot rollback: tag name required\nUsage: snapshot rollback <tag-name>' }
    }

    try {
      // Verify tag exists
      const allTags = await git.listTags()
      if (!allTags.includes(tag)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `snapshot rollback: tag "${tag}" not found\nAvailable: ${allTags.filter(t => t.startsWith('task-') || t.startsWith('manual-') || t.startsWith('stall-')).join(', ') || '(none)'}`,
        }
      }

      // Resolve tag to oid — isomorphic-git checkout works reliably with commit SHAs
      const oid = await git.resolveRef(tag)
      await git.checkout({ ref: oid, force: true })

      return {
        exitCode: 0,
        stdout: `Restored to ${tag}\nAll files now match the snapshot state.\n`,
        stderr: '',
      }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `snapshot rollback: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  // --------------------------------------------------------------------------
  // DIFF
  // --------------------------------------------------------------------------

  private async diff(args: SnapshotArgs, options: ShellOptions): Promise<ShellResult> {
    const git = options.git!
    const tag = args.tag

    if (!tag) {
      return { exitCode: 1, stdout: '', stderr: 'snapshot diff: tag name required\nUsage: snapshot diff <tag-name>' }
    }

    try {
      // Verify tag exists
      const allTags = await git.listTags()
      if (!allTags.includes(tag)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `snapshot diff: tag "${tag}" not found`,
        }
      }

      // Committed changes: tag vs HEAD (resolve tag to oid for reliable TREE resolution)
      const tagOid = await git.resolveRef(tag)
      const headOid = await git.resolveRef('HEAD')
      const entries = await git.diff({ ref1: tagOid, ref2: headOid })

      // Uncommitted changes: HEAD vs working directory
      const matrix = await git.statusMatrix()
      const uncommitted = matrix.filter(([, head, workdir]) => head !== workdir)

      const lines: string[] = []

      if (entries.length > 0) {
        lines.push(`Changes since ${tag} (committed):`)
        for (const e of entries) {
          const prefix = e.type === 'add' ? 'A' : e.type === 'remove' ? 'D' : 'M'
          lines.push(`  ${prefix} ${e.filepath}`)
        }
      }

      if (uncommitted.length > 0) {
        if (lines.length > 0) lines.push('')
        lines.push('Uncommitted changes:')
        for (const [filepath, head, workdir] of uncommitted) {
          const prefix = head === 0 ? 'A' : workdir === 0 ? 'D' : 'M'
          lines.push(`  ${prefix} ${filepath}`)
        }
      }

      if (lines.length === 0) {
        lines.push(`No changes since ${tag}.`)
      }

      lines.push('')
      return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `snapshot diff: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  // --------------------------------------------------------------------------
  // STATUS
  // --------------------------------------------------------------------------

  private async status(options: ShellOptions): Promise<ShellResult> {
    const git = options.git!

    try {
      // Uncommitted changes
      const matrix = await git.statusMatrix()
      const uncommitted = matrix.filter(([, head, workdir, stage]) =>
        head !== workdir || head !== stage
      )

      // Snapshot tags
      const allTags = await git.listTags()
      const snapshotTags = allTags.filter(t =>
        t.startsWith('task-') || t.startsWith('manual-') || t.startsWith('stall-')
      ).sort().reverse()

      const lines: string[] = ['Snapshot status:']
      lines.push(`  Uncommitted changes: ${uncommitted.length}`)
      lines.push(`  Total snapshots: ${snapshotTags.length}`)

      if (snapshotTags.length > 0) {
        const latest = snapshotTags[0]
        try {
          const oid = await git.resolveRef(latest)
          const [commit] = await git.log({ ref: oid, depth: 1 })
          const date = new Date(commit.commit.author.timestamp! * 1000)
          const dateStr = date.toISOString().replace('T', ' ').slice(0, 19)
          lines.push(`  Latest: ${latest} (${dateStr})`)
        } catch {
          lines.push(`  Latest: ${latest}`)
        }
      }

      lines.push('')
      return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `snapshot status: ${err instanceof Error ? err.message : String(err)}` }
    }
  }
}
