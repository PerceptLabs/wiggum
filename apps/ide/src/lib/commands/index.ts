export type { ShellCommand, ShellCommandResult } from './ShellCommand'
export { createSuccessResult, createErrorResult } from './ShellCommand'
export { CommandRegistry } from './registry'

// File commands
export { CatCommand } from './cat'
export { LsCommand } from './ls'
export { CdCommand } from './cd'
export { PwdCommand } from './pwd'
export { MkdirCommand } from './mkdir'
export { TouchCommand } from './touch'
export { RmCommand } from './rm'
export { CpCommand } from './cp'
export { MvCommand } from './mv'

// Text processing commands
export { EchoCommand } from './echo'
export { GrepCommand } from './grep'
export { HeadCommand } from './head'
export { TailCommand } from './tail'
export { WcCommand } from './wc'
export { SortCommand } from './sort'
export { UniqCommand } from './uniq'
export { CutCommand } from './cut'
export { SedCommand } from './sed'
export { TrCommand } from './tr'
export { FindCommand } from './find'

// Git command
export { GitCommand } from './git'
export type { GitSubcommand, GitSubcommandOptions } from './git'

// Ralph command (autonomous iteration loop)
export { RalphCommand } from './ralph'
export type { RalphSubcommand, RalphSubcommandOptions, RalphState, RalphStatus, RalphConfig } from './ralph'
