import * as React from 'react'
import { MessageSquare, RefreshCw, Play } from 'lucide-react'
import { Button, Badge, Tooltip, TooltipContent, TooltipTrigger, cn } from '@wiggum/stack'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from './ChatContext'

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

          {/* Status indicator - shows during active work */}
          {ralphStatus === 'running' && (
            <Badge variant="default" className="gap-1">
              <Play className="h-3 w-3 animate-pulse" />
              {ralphIteration > 1 ? `Iteration ${ralphIteration}` : 'Working...'}
            </Badge>
          )}
          {ralphStatus === 'complete' && ralphIteration > 1 && (
            <Badge variant="outline" className="text-green-600">
              Done ({ralphIteration} iterations)
            </Badge>
          )}
          {ralphStatus === 'waiting' && (
            <Badge variant="secondary" className="text-yellow-600">
              Waiting for input
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
          isLoading
            ? 'Working on your request...'
            : 'Ask me to build something...'
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
        <h3 className="mb-1 text-lg font-medium">What would you like to build?</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Describe your task and Wiggum will work on it autonomously.
          Simple tasks complete instantly. Complex tasks may take multiple iterations.
        </p>
      </div>
    </div>
  )
}
