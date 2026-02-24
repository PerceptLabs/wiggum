import { describe, it, expect } from 'vitest'
import { createFallbackTask } from '../task-parser'
import { formatStructuredTask } from '../task-types'
import type { StructuredTask } from '../task-types'

describe('createFallbackTask', () => {
  it('creates fresh task when no plan exists', () => {
    const task = createFallbackTask('Build me a landing page', { planExists: false, lastSummary: '', fileList: [] }, 1)
    expect(task.type).toBe('fresh')
    expect(task.taskNumber).toBe(1)
    expect(task.requirements).toHaveLength(1)
    expect(task.requirements[0].marker).toBe('ADD')
    expect(task.rawMessage).toBe('Build me a landing page')
  })

  it('creates mutation task when plan exists', () => {
    const task = createFallbackTask('Add a contact form', { planExists: true, lastSummary: '', fileList: [] }, 3)
    expect(task.type).toBe('mutation')
    expect(task.requirements[0].marker).toBe('MODIFY')
  })

  it('detects bugfix from message keywords', () => {
    const task = createFallbackTask('The hero section is broken', { planExists: true, lastSummary: '', fileList: [] }, 2)
    expect(task.type).toBe('bugfix')
    expect(task.requirements[0].marker).toBe('FIX')
  })

  it('detects bugfix with "fix" keyword', () => {
    const task = createFallbackTask('Fix the navigation layout', { planExists: false, lastSummary: '', fileList: [] }, 1)
    expect(task.type).toBe('bugfix')
  })

  it('truncates long titles to 80 chars', () => {
    const longMsg = 'A'.repeat(120)
    const task = createFallbackTask(longMsg, { planExists: false, lastSummary: '', fileList: [] }, 1)
    expect(task.title.length).toBeLessThanOrEqual(83) // 80 + "..."
  })
})

describe('formatStructuredTask', () => {
  const sampleTask: StructuredTask = {
    type: 'mutation',
    title: 'Add nighttime flavors to landing page',
    taskNumber: 3,
    previousTag: 'task-2-post',
    requirements: [
      { marker: 'ADD', description: 'Add 2 nighttime drink flavors to the grid' },
      { marker: 'MODIFY', description: 'Refine hero copy for evening audience' },
    ],
    scope: {
      preserve: ['All 8 existing energy drink flavors'],
      affectedFiles: ['HeroSection.tsx', 'FlavorGrid.tsx'],
    },
    rawMessage: 'Add nighttime flavors and update the hero',
  }

  it('produces valid markdown with title', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('# Task: Add nighttime flavors to landing page')
  })

  it('includes task type and counter', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('Type: mutation')
    expect(md).toContain('Counter: 3')
  })

  it('includes previous snapshot tag', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('Previous snapshot: task-2-post')
  })

  it('includes requirements with markers', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('[ADD] Add 2 nighttime drink flavors')
    expect(md).toContain('[MODIFY] Refine hero copy')
  })

  it('includes scope constraints', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('PRESERVE: All 8 existing energy drink flavors')
    expect(md).toContain('AFFECTED: HeroSection.tsx')
  })

  it('includes raw message in blockquote', () => {
    const md = formatStructuredTask(sampleTask)
    expect(md).toContain('> Add nighttime flavors and update the hero')
  })

  it('omits previous tag when not set', () => {
    const task = { ...sampleTask, previousTag: undefined }
    const md = formatStructuredTask(task)
    expect(md).not.toContain('Previous snapshot')
  })
})
