import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * date - Display the current date and time
 * Usage: date [-u] [+FORMAT]
 * Format specifiers: %Y %m %d %H %M %S %s %A %B
 */
export class DateCommand implements ShellCommand {
  name = 'date'
  description = 'Display current date and time'

  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    let useUtc = false
    let format: string | null = null

    for (const arg of args) {
      if (arg === '-u' || arg === '--utc') {
        useUtc = true
      } else if (arg.startsWith('+')) {
        format = arg.slice(1)
      }
    }

    const now = new Date()

    if (format) {
      const result = formatDate(now, format, useUtc)
      return { exitCode: 0, stdout: result + '\n', stderr: '' }
    }

    // Default output
    const output = useUtc ? now.toUTCString() : now.toString()
    return { exitCode: 0, stdout: output + '\n', stderr: '' }
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

function formatDate(d: Date, format: string, utc: boolean): string {
  const year = utc ? d.getUTCFullYear() : d.getFullYear()
  const month = utc ? d.getUTCMonth() : d.getMonth()
  const day = utc ? d.getUTCDate() : d.getDate()
  const hours = utc ? d.getUTCHours() : d.getHours()
  const minutes = utc ? d.getUTCMinutes() : d.getMinutes()
  const seconds = utc ? d.getUTCSeconds() : d.getSeconds()
  const dayOfWeek = utc ? d.getUTCDay() : d.getDay()

  return format
    .replace(/%Y/g, String(year))
    .replace(/%m/g, pad(month + 1))
    .replace(/%d/g, pad(day))
    .replace(/%H/g, pad(hours))
    .replace(/%M/g, pad(minutes))
    .replace(/%S/g, pad(seconds))
    .replace(/%s/g, String(Math.floor(d.getTime() / 1000)))
    .replace(/%A/g, DAYS[dayOfWeek])
    .replace(/%B/g, MONTHS[month])
}
