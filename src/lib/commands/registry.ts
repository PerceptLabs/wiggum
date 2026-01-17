import type { ShellCommand } from './ShellCommand'

/**
 * Registry for shell commands
 * Manages command registration and lookup
 */
export class CommandRegistry {
  private commands = new Map<string, ShellCommand>()

  /**
   * Register a command
   * @param command - Command to register
   */
  register(command: ShellCommand): void {
    this.commands.set(command.name, command)
  }

  /**
   * Register multiple commands
   * @param commands - Commands to register
   */
  registerAll(commands: ShellCommand[]): void {
    for (const command of commands) {
      this.register(command)
    }
  }

  /**
   * Get a command by name
   * @param name - Command name
   * @returns Command or undefined if not found
   */
  get(name: string): ShellCommand | undefined {
    return this.commands.get(name)
  }

  /**
   * Check if a command exists
   * @param name - Command name
   */
  has(name: string): boolean {
    return this.commands.has(name)
  }

  /**
   * List all visible commands (excludes easter eggs)
   * @returns Array of visible commands sorted by name
   */
  list(): ShellCommand[] {
    return Array.from(this.commands.values())
      .filter((cmd) => !cmd.isEasterEgg)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * List all commands including easter eggs
   * @returns Array of all commands sorted by name
   */
  listAll(): ShellCommand[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get command names for tab completion
   * @param prefix - Optional prefix to filter by
   * @returns Array of command names
   */
  getCompletions(prefix = ''): string[] {
    return Array.from(this.commands.keys())
      .filter((name) => name.startsWith(prefix))
      .sort()
  }
}
