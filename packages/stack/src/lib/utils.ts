import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns'

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date using date-fns
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = 'PPP'
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return 'Invalid date'
  return format(d, formatStr)
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatDateRelative(
  date: Date | string | number,
  baseDate: Date = new Date()
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return 'Invalid date'
  return formatDistance(d, baseDate, { addSuffix: true })
}

/**
 * Format a date relative to today (e.g., "yesterday at 2:00 PM")
 */
export function formatDateRelativeToToday(
  date: Date | string | number,
  baseDate: Date = new Date()
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return 'Invalid date'
  return formatRelative(d, baseDate)
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert a string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * Convert a string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
}

/**
 * Generate a random string ID
 */
export function randomId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get the current platform (mac, windows, linux, or unknown)
 */
export function getPlatform(): 'mac' | 'windows' | 'linux' | 'unknown' {
  if (!isBrowser()) return 'unknown'
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('mac')) return 'mac'
  if (platform.includes('win')) return 'windows'
  if (platform.includes('linux')) return 'linux'
  return 'unknown'
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}
