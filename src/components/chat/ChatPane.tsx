import * as React from 'react'
import { MessageSquare, RefreshCw, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from './ChatContext'
import { cn } from '@/lib/utils/cn'

interface ChatPaneProps {
  className?: string
}

export function ChatPane({ className }: ChatPaneProps) {
  const {
    messages,
    isLoading,
    streamingContent,
    error,
    ralphStatus,
    ralphIteration,
    sendMessage,
    stopGeneration,
    clearMessages,
  } = useChat()

  const handleSend = async (content: string) => {
    await sendMessage(content)
  }

  const isEmpty = messages.length === 0

  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Chat</span>

          {/* Ralph status indicator */}
          {ralphStatus && ralphStatus !== 'idle' && (
            <Badge
              variant={
                ralphStatus === 'running'
                  ? 'default'
                  : ralphStatus === 'complete'
                    ? 'success'
                    : ralphStatus === 'waiting'
                      ? 'warning'
                      : 'secondary'
              }
              className="gap-1"
            >
              {ralphStatus === 'running' && (
                <Play className="h-3 w-3 animate-pulse" />
              )}
              ralph: {ralphStatus}
              {ralphIteration !== undefined && ` (${ralphIteration})`}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearMessages}
                disabled={isEmpty || isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Messages or empty state */}
      {isEmpty ? (
        <EmptyState />
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={stopGeneration}
        isLoading={isLoading}
        placeholder={
          ralphStatus === 'running'
            ? 'Ralph is running... Add feedback to .ralph/feedback.md'
            : 'Type a message...'
        }
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-medium">Start a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ask Wiggum to help you build something. Try "Create a simple todo app" or use{' '}
          <code className="rounded bg-muted px-1 py-0.5">ralph init</code> for autonomous iteration.
        </p>
      </div>
    </div>
  )
}
