/**
 * Task parser — structured task decomposition before Ralph sees it.
 *
 * Classifies user messages into structured tasks with typed requirements
 * ([ADD]/[MODIFY]/[FIX]/[REMOVE]) and scope constraints via a lightweight LLM call.
 * Falls back to a template-based approach if the LLM call fails.
 */

import type { LLMProvider, Message } from '../llm/client'
import { chat } from '../llm/client'
import type { StructuredTask, TaskType, ScopeMarker, TaskRequirement, TaskScope } from './task-types'

// ============================================================================
// PUBLIC API
// ============================================================================

export interface ParseContext {
  planExists: boolean
  lastSummary: string
  fileList: string[]
}

/**
 * Parse raw user message into a structured task via LLM.
 * Falls back to createFallbackTask on any error.
 */
export async function parseTask(
  provider: LLMProvider,
  rawMessage: string,
  context: ParseContext,
  taskNumber: number,
  signal?: AbortSignal,
): Promise<StructuredTask> {
  try {
    return await llmParseTask(provider, rawMessage, context, taskNumber, signal)
  } catch (err) {
    console.error('[task-parser] LLM parse failed, using fallback:', err)
    return createFallbackTask(rawMessage, context, taskNumber)
  }
}

/**
 * Fallback when LLM call fails or is unavailable.
 * Wraps raw message in a template based on whether a plan exists.
 */
export function createFallbackTask(
  rawMessage: string,
  context: ParseContext,
  taskNumber: number,
): StructuredTask {
  const type: TaskType = context.planExists ? 'mutation' : 'fresh'
  const isBugfix = /\b(fix|bug|broken|crash|error|wrong|doesn't work|not working)\b/i.test(rawMessage)

  return {
    type: isBugfix ? 'bugfix' : type,
    title: rawMessage.slice(0, 80) + (rawMessage.length > 80 ? '...' : ''),
    taskNumber,
    requirements: [{
      marker: isBugfix ? 'FIX' : (context.planExists ? 'MODIFY' : 'ADD'),
      description: rawMessage,
    }],
    scope: {
      preserve: [],
      affectedFiles: [],
    },
    rawMessage,
  }
}

// ============================================================================
// LLM PARSE
// ============================================================================

const PARSE_SYSTEM_PROMPT = `You are a task classifier. Given a user message and project context, output ONLY a JSON object with these fields:

{
  "type": "fresh" | "mutation" | "bugfix",
  "title": "short title (max 80 chars)",
  "requirements": [
    { "marker": "ADD" | "MODIFY" | "FIX" | "REMOVE", "description": "what to do" }
  ],
  "scope": {
    "preserve": ["things that must not change"],
    "affectedFiles": ["likely files to touch"]
  }
}

Classification rules:
- "fresh": No plan exists, or user says "build me", "start over", "create"
- "bugfix": Short message describing broken behavior (fix, bug, crash, error, wrong)
- "mutation": Plan exists and user references existing features to change

Output ONLY valid JSON. No markdown fences, no explanation.`

async function llmParseTask(
  provider: LLMProvider,
  rawMessage: string,
  context: ParseContext,
  taskNumber: number,
  signal?: AbortSignal,
): Promise<StructuredTask> {
  const userContent = [
    `User message: ${rawMessage}`,
    `Plan exists: ${context.planExists}`,
    context.lastSummary ? `Last task summary: ${context.lastSummary.slice(0, 200)}` : '',
    context.fileList.length > 0 ? `Project files: ${context.fileList.slice(0, 20).join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const messages: Message[] = [
    { role: 'system', content: PARSE_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]

  const response = await chat(provider, messages, undefined, signal)
  const parsed = parseJsonResponse(response.content)

  return {
    type: validateTaskType(parsed.type, context),
    title: typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : rawMessage.slice(0, 80),
    taskNumber,
    requirements: validateRequirements(parsed.requirements),
    scope: validateScope(parsed.scope),
    rawMessage,
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

function parseJsonResponse(content: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse task JSON: ${cleaned.slice(0, 100)}`)
  }
}

function validateTaskType(raw: unknown, context: ParseContext): TaskType {
  if (raw === 'fresh' || raw === 'mutation' || raw === 'bugfix') return raw
  return context.planExists ? 'mutation' : 'fresh'
}

function validateRequirements(raw: unknown): TaskRequirement[] {
  if (!Array.isArray(raw)) return []
  const VALID_MARKERS: ScopeMarker[] = ['ADD', 'MODIFY', 'FIX', 'REMOVE']
  return raw
    .filter((r): r is { marker: string; description: string } =>
      r && typeof r === 'object' && typeof r.marker === 'string' && typeof r.description === 'string'
    )
    .map(r => ({
      marker: VALID_MARKERS.includes(r.marker as ScopeMarker) ? r.marker as ScopeMarker : 'MODIFY',
      description: r.description,
    }))
}

function validateScope(raw: unknown): TaskScope {
  if (!raw || typeof raw !== 'object') return { preserve: [], affectedFiles: [] }
  const scope = raw as Record<string, unknown>
  return {
    preserve: Array.isArray(scope.preserve) ? scope.preserve.filter((s): s is string => typeof s === 'string') : [],
    affectedFiles: Array.isArray(scope.affectedFiles) ? scope.affectedFiles.filter((s): s is string => typeof s === 'string') : [],
  }
}
