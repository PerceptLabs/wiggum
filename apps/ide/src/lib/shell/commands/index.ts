/**
 * Shell commands registry
 */

import type { ShellExecutor } from '../types'

import { CatCommand } from './cat'
import { LsCommand } from './ls'
import { EchoCommand } from './echo'
import { GrepCommand } from './grep'
import { HeadCommand } from './head'
import { TailCommand } from './tail'
import { WcCommand } from './wc'
import { MkdirCommand } from './mkdir'
import { RmCommand } from './rm'
import { CpCommand } from './cp'
import { MvCommand } from './mv'
import { PwdCommand } from './pwd'
import { FindCommand } from './find'
import { TouchCommand } from './touch'
import { SortCommand } from './sort'
import { UniqCommand } from './uniq'
import { GitCommand } from './git'
import { TreeCommand } from './tree'
import { ReplaceCommand } from './replace'
import { RmdirCommand } from './rmdir'
import { DiffCommand } from './diff'
import { ConsoleCommand } from './console'

/**
 * Register all built-in shell commands with the executor
 */
export function registerAllCommands(executor: ShellExecutor): void {
  executor.registerCommand(new CatCommand())
  executor.registerCommand(new LsCommand())
  executor.registerCommand(new EchoCommand())
  executor.registerCommand(new GrepCommand())
  executor.registerCommand(new HeadCommand())
  executor.registerCommand(new TailCommand())
  executor.registerCommand(new WcCommand())
  executor.registerCommand(new MkdirCommand())
  executor.registerCommand(new RmCommand())
  executor.registerCommand(new CpCommand())
  executor.registerCommand(new MvCommand())
  executor.registerCommand(new PwdCommand())
  executor.registerCommand(new FindCommand())
  executor.registerCommand(new TouchCommand())
  executor.registerCommand(new SortCommand())
  executor.registerCommand(new UniqCommand())
  executor.registerCommand(new GitCommand())
  executor.registerCommand(new TreeCommand())
  executor.registerCommand(new ReplaceCommand())
  executor.registerCommand(new RmdirCommand())
  executor.registerCommand(new DiffCommand())
  executor.registerCommand(new ConsoleCommand())
}

// Export all command classes for individual use
export { CatCommand } from './cat'
export { LsCommand } from './ls'
export { EchoCommand } from './echo'
export { GrepCommand } from './grep'
export { HeadCommand } from './head'
export { TailCommand } from './tail'
export { WcCommand } from './wc'
export { MkdirCommand } from './mkdir'
export { RmCommand } from './rm'
export { CpCommand } from './cp'
export { MvCommand } from './mv'
export { PwdCommand } from './pwd'
export { FindCommand } from './find'
export { TouchCommand } from './touch'
export { SortCommand } from './sort'
export { UniqCommand } from './uniq'
export { GitCommand } from './git'
export { TreeCommand } from './tree'
export { ReplaceCommand } from './replace'
export { RmdirCommand } from './rmdir'
export { DiffCommand } from './diff'
export { ConsoleCommand } from './console'

// Export utilities
export { resolvePath, normalizePath, basename, dirname } from './utils'
