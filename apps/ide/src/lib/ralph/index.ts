/**
 * Ralph - The autonomous coding agent loop
 *
 * This is the core loop that runs autonomously.
 * The lib/commands/ralph/ files handle the CLI interface.
 */
export {
  initRalphDir,
  getRalphState,
  isComplete,
  isWaiting,
  setIteration,
  appendProgress,
  RALPH_DIR,
  type RalphState,
} from './state'

export {
  runRalphLoop,
  type RalphCallbacks,
  type RalphResult,
} from './loop'
