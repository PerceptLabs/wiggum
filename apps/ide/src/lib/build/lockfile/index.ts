/**
 * Lockfile Module - Package version resolution from lockfiles
 *
 * Provides esm.sh URL generation with pinned versions from npm/yarn lockfiles.
 */

export type {
  ParsedLockfile,
  ResolvedPackage,
  ResolutionRequest,
  ResolutionResult,
  EsmShOptions,
  NpmLockfile,
  NpmPackageEntry,
  YarnLockfile,
  YarnLockEntry,
} from './types'

export { parseLockfile, resolveFromLockfile, resolveWithContext } from './parse'

export {
  resolvePackage,
  resolvePackageWithContext,
  buildEsmShUrl,
  buildDepsFromLockfile,
  LockfileResolver,
  createResolver,
} from './resolve'

export { loadLockfile } from './loader'
