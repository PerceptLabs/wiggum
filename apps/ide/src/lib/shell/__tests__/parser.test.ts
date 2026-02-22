import { describe, it, expect } from 'vitest'
import { stripFdRedirectsFromRaw } from '../parser'

describe('stripFdRedirectsFromRaw', () => {
  it('strips 2>/dev/null (no space)', () => {
    expect(stripFdRedirectsFromRaw('grep foo bar 2>/dev/null')).toBe('grep foo bar')
  })

  it('strips 2> /dev/null (with space)', () => {
    expect(stripFdRedirectsFromRaw('grep foo 2> /dev/null')).toBe('grep foo')
  })

  it('strips 2>&1', () => {
    expect(stripFdRedirectsFromRaw('command 2>&1')).toBe('command')
  })

  it('strips 1>/dev/null', () => {
    expect(stripFdRedirectsFromRaw('command 1>/dev/null')).toBe('command')
  })

  it('leaves normal redirects alone', () => {
    expect(stripFdRedirectsFromRaw('echo hello > file.txt')).toBe('echo hello > file.txt')
  })

  it('handles multiple fd redirects', () => {
    expect(stripFdRedirectsFromRaw('cmd 2>/dev/null 1>/dev/null')).toBe('cmd')
  })

  it('preserves command when fd redirect is at end', () => {
    expect(stripFdRedirectsFromRaw('ls -la 2>&1')).toBe('ls -la')
  })
})
