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
import { TrueCommand } from './true'
import { FalseCommand } from './false'
import { BasenameCommand } from './basename'
import { DirnameCommand } from './dirname'
import { TacCommand } from './tac'
import { StatCommand } from './stat'
import { SedCommand } from './sed'
import { CutCommand } from './cut'
import { TrCommand } from './tr'
import { WhichCommand } from './which'
import { DateCommand } from './date'
import { EnvCommand } from './env'
import { WhoamiCommand } from './whoami'
import { ClearCommand } from './clear'
import { PathsCommand } from './paths'
import { PreviewCommand } from './preview'
import { ThemeCommand } from './theme'
import { ModulesCommand } from './modules'
import { CacheStatsCommand } from './cache-stats'
import { BuildCacheCommand } from './build-cache'
import { TokensCommand } from './tokens'
import { BuildCommand } from './build'

/**
 * Register all built-in shell commands with the executor
 */
export function registerAllCommands(executor: ShellExecutor): void {
  // Original commands (22)
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

  // New commands (14)
  executor.registerCommand(new TrueCommand())
  executor.registerCommand(new FalseCommand())
  executor.registerCommand(new BasenameCommand())
  executor.registerCommand(new DirnameCommand())
  executor.registerCommand(new TacCommand())
  executor.registerCommand(new StatCommand())
  executor.registerCommand(new SedCommand())
  executor.registerCommand(new CutCommand())
  executor.registerCommand(new TrCommand())
  executor.registerCommand(new DateCommand())
  executor.registerCommand(new EnvCommand())
  executor.registerCommand(new WhoamiCommand())
  executor.registerCommand(new ClearCommand())
  executor.registerCommand(new PathsCommand())
  executor.registerCommand(new PreviewCommand())
  executor.registerCommand(new ThemeCommand())
  executor.registerCommand(new ModulesCommand())
  executor.registerCommand(new CacheStatsCommand())
  executor.registerCommand(new BuildCacheCommand())
  executor.registerCommand(new TokensCommand())
  executor.registerCommand(new BuildCommand())

  // which must be registered last — needs the full command list
  const allCommandNames = [
    'cat', 'ls', 'echo', 'grep', 'head', 'tail', 'wc', 'mkdir', 'rm', 'cp', 'mv',
    'pwd', 'find', 'touch', 'sort', 'uniq', 'git', 'tree', 'replace', 'rmdir', 'diff',
    'console', 'true', 'false', 'basename', 'dirname', 'tac', 'stat', 'sed', 'cut',
    'tr', 'date', 'env', 'whoami', 'clear', 'paths', 'preview', 'theme',
    'modules', 'cache-stats', 'build-cache', 'tokens', 'build', 'which',
  ]
  executor.registerCommand(new WhichCommand(allCommandNames))
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
export { TrueCommand } from './true'
export { FalseCommand } from './false'
export { BasenameCommand } from './basename'
export { DirnameCommand } from './dirname'
export { TacCommand } from './tac'
export { StatCommand } from './stat'
export { SedCommand } from './sed'
export { CutCommand } from './cut'
export { TrCommand } from './tr'
export { WhichCommand } from './which'
export { DateCommand } from './date'
export { EnvCommand } from './env'
export { WhoamiCommand } from './whoami'
export { ClearCommand } from './clear'
export { ThemeCommand } from './theme'
export { ModulesCommand } from './modules'
export { CacheStatsCommand } from './cache-stats'
export { BuildCacheCommand } from './build-cache'
export { TokensCommand } from './tokens'
export { BuildCommand } from './build'

// Export utilities
export { resolvePath, normalizePath, basename, dirname } from './utils'
