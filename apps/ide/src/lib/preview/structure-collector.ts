/**
 * Structure Collector - Captures DOM structure from preview iframe
 */
import type { StructureCollector, DOMStructure } from '../types/observability'

export interface StructureCollectorConfig {
  timeout: number
}

export const DEFAULT_STRUCTURE_CONFIG: StructureCollectorConfig = {
  timeout: 3000,
}

export function createStructureCollector(
  config: StructureCollectorConfig = DEFAULT_STRUCTURE_CONFIG
): StructureCollector {
  let structure: DOMStructure | null = null
  let listening = false
  let resolvePromise: ((s: DOMStructure | null) => void) | null = null

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'wiggum-dom-structure') {
      structure = event.data.structure
      resolvePromise?.(structure)
    }
  }

  return {
    start() {
      if (listening) return
      window.addEventListener('message', handleMessage)
      listening = true
    },
    stop() {
      window.removeEventListener('message', handleMessage)
      listening = false
    },
    waitForStructure(): Promise<DOMStructure | null> {
      return new Promise((resolve) => {
        if (structure) { resolve(structure); return }
        resolvePromise = resolve
        setTimeout(() => resolve(structure), config.timeout)
      })
    },
    getStructure: () => structure,
    clear: () => { structure = null },
  }
}

export function formatStructure(node: DOMStructure | null, indent = 0): string {
  if (!node) return '(empty)'
  const prefix = '  '.repeat(indent)
  let line = `${prefix}- <${node.tag}>`
  if (node.id) line += `#${node.id}`
  if (node.classes?.length) line += `.${node.classes.join('.')}`
  if (node.text) line += ` "${node.text}"`
  const lines = [line]
  if (node.children) {
    for (const child of node.children) {
      lines.push(formatStructure(child, indent + 1))
    }
  }
  return lines.join('\n')
}
