import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * paths - Show writable paths, extensions, and restrictions
 * Helps models discover where they can write files without trial and error
 */
export class PathsCommand implements ShellCommand {
  name = 'paths'
  description = 'Show writable paths, extensions, and restrictions'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    const output = `Writable paths and allowed extensions:

  src/            .tsx .ts .css .json
  .ralph/         (any extension — your workspace)

Read-only:
  .skills/        Skill files (grep-searchable)
  index.html      Entry point (locked — use src/index.css for theming)

Blocked:
  .html/.htm files    Use .tsx in src/ instead (this is a React project)
  .css outside src/   Must be in src/
  /tmp, node_modules  Outside project scope

Notes:
  - Load fonts: /* @fonts: Inter:wght@400;500;600 */ in src/index.css
  - CSS comments: /* */ only (never // — breaks all rules below it)
  - Max 200 lines per file — split into src/sections/`

    return { exitCode: 0, stdout: output, stderr: '' }
  }
}
