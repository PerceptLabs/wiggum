import * as React from 'react'
import { ScrollArea, cn } from '@wiggum/stack'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { StreamingMessage } from './StreamingMessage'
import type { AIMessage } from '@/lib/llm'

interface MessageListProps {
  messages: AIMessage[]
  streamingContent?: string
  isLoading?: boolean
  toolResults?: Map<string, string>
  className?: string
}

export function MessageList({
  messages,
  streamingContent,
  isLoading,
  toolResults,
  className,
}: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Filter out tool messages (they're displayed within assistant messages)
  const visibleMessages = messages.filter((m) => m.role !== 'tool')

  // Build tool results map from tool messages
  const allToolResults = React.useMemo(() => {
    const results = new Map(toolResults)
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        results.set(msg.tool_call_id, msg.content || '')
      }
    }
    return results
  }, [messages, toolResults])

  return (
    <ScrollArea className={cn('flex-1', className)} ref={scrollRef}>
      <div className="space-y-1 pb-4">
        {visibleMessages.map((message, index) => {
          if (message.role === 'user') {
            return <UserMessage key={index} content={message.content || ''} />
          }

          if (message.role === 'assistant') {
            return (
              <AssistantMessage
                key={index}
                content={message.content}
                toolCalls={message.tool_calls}
                toolResults={allToolResults}
              />
            )
          }

          if (message.role === 'system') {
            // System messages are usually not shown to the user
            return null
          }

          return null
        })}

        {/* Streaming message */}
        {isLoading && streamingContent && <StreamingMessage content={streamingContent} />}

        {/* Loading indicator when no content yet */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Wiggum</p>
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  )
}
