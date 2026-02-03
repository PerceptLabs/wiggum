import * as React from 'react'
import { MessageSquare, RefreshCw, Play, Lightbulb, FileEdit, Wrench, Rocket, ChevronDown, Check, Settings } from 'lucide-react'
import {
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@wiggum/stack'
import { MessageList } from './MessageList'
import { ChatInput, type ChatInputRef } from './ChatInput'
import { useChat } from './ChatContext'
import { useAISettings } from '@/contexts/AIContext'
import type { ProviderPreset } from '@/lib/llm'
import { Link } from 'react-router-dom'

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
    retry,
    isRetryable,
  } = useChat()

  const {
    providerOptions,
    getModelsForProvider,
    selectedProvider,
    selectedModel,
    selectedModelId,
    setSelectedProvider,
    setSelectedModel,
    isConfigured,
  } = useAISettings()

  const inputRef = React.useRef<ChatInputRef>(null)

  // Group models by provider for the dropdown
  const modelsByProvider = React.useMemo(() => {
    const groups: Array<{ providerId: string; providerName: string; models: Array<{ id: string; label: string }> }> = []

    for (const provider of providerOptions) {
      const models = getModelsForProvider(provider.id)
      if (models.length > 0) {
        groups.push({
          providerId: provider.id,
          providerName: provider.name,
          models: models.map((modelName) => ({
            id: `${provider.id}:${modelName}`,
            label: modelName,
          })),
        })
      }
    }

    return groups
  }, [providerOptions, getModelsForProvider])

  const handleSend = async (content: string) => {
    await sendMessage(content)
  }

  const handleSuggestionClick = (suggestion: string) => {
    inputRef.current?.setInput(suggestion)
  }

  const isEmpty = messages.length === 0

  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b-[length:var(--border-width,1px)] border-border px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Chat</span>

          {/* Status indicator - shows during active work */}
          {ralphStatus === 'running' && (
            <Badge variant="default" className="gap-1">
              <Play className="h-3 w-3 animate-pulse" />
              {ralphIteration > 1 ? `Iteration ${ralphIteration}` : 'Working...'}
            </Badge>
          )}
          {ralphStatus === 'complete' && ralphIteration > 1 && (
            <Badge variant="success">
              Done ({ralphIteration} iterations)
            </Badge>
          )}
          {ralphStatus === 'waiting' && (
            <Badge variant="warning">
              Waiting for input
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Model Selector */}
          {isConfigured ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs font-medium"
                  disabled={isLoading}
                >
                  <span className="max-w-[120px] truncate">
                    {selectedModel || 'Select model'}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {modelsByProvider.map((group, idx) => (
                  <React.Fragment key={group.providerId}>
                    {idx > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                      {group.providerName}
                    </DropdownMenuLabel>
                    {group.models.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => {
                          const [providerId] = model.id.split(':')
                          setSelectedProvider(providerId as ProviderPreset)
                          setSelectedModel(model.label)
                        }}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{model.label}</span>
                        {selectedModelId === model.id && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/integrations" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configure Providers
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium"
              asChild
            >
              <Link to="/settings/integrations">
                <Settings className="h-4 w-4" />
                Setup AI
              </Link>
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
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
        <EmptyState onSuggestionClick={handleSuggestionClick} isConfigured={isConfigured} />
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive shadow-[2px_2px_0px_0px] shadow-destructive">
          <span className="flex-1">{error}</span>
          {isRetryable && (
            <Button
              variant="destructive"
              size="sm"
              onClick={retry}
              disabled={isLoading}
              className="shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Input */}
      <ChatInput
        ref={inputRef}
        onSend={handleSend}
        onStop={stopGeneration}
        isLoading={isLoading}
        disabled={!isConfigured}
        placeholder={
          !isConfigured
            ? 'Configure an AI provider to start...'
            : isLoading
              ? 'Working on your request...'
              : 'Ask me to build something...'
        }
      />
    </div>
  )
}

interface EmptyStateProps {
  onSuggestionClick?: (suggestion: string) => void
  isConfigured: boolean
}

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    label: 'Ask me to add new features',
    prompt: 'Add a new feature that ',
  },
  {
    icon: FileEdit,
    label: 'Request file edits and improvements',
    prompt: 'Improve the code in ',
  },
  {
    icon: Wrench,
    label: 'Get help with debugging',
    prompt: 'Help me debug the issue with ',
  },
  {
    icon: Rocket,
    label: 'Build and deploy your project',
    prompt: 'Build and prepare the project for deployment',
  },
]

function EmptyState({ onSuggestionClick, isConfigured }: EmptyStateProps) {
  // Show setup prompt when no provider is configured
  if (!isConfigured) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center border-[length:var(--border-width,1px)] border-border bg-card p-8 [box-shadow:var(--shadow)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
            <Settings className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Setup Required</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Configure an AI provider to start using Wiggum.
            Add your API key for OpenAI, Anthropic, Google, or connect to a local Ollama server.
          </p>
          <Button asChild className="gap-2">
            <Link to="/settings/integrations">
              <Settings className="h-4 w-4" />
              Configure Providers
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center border-[length:var(--border-width,1px)] border-border bg-card p-8 [box-shadow:var(--shadow)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-primary [box-shadow:var(--shadow-sm)]">
          <MessageSquare className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="mb-2 text-xl [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">What would you like to build?</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Describe your task and Wiggum will work on it autonomously.
          Simple tasks complete instantly. Complex tasks may take multiple iterations.
        </p>

        {/* Suggestion buttons */}
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion.prompt)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-left text-sm',
                'border border-border bg-background',
                'transition-all duration-150',
                'hover:border-primary hover:bg-primary/5',
                'hover:[box-shadow:var(--shadow-sm)]',
                'hover:translate-x-[-1px] hover:translate-y-[-1px]',
                'active:translate-x-0 active:translate-y-0 active:shadow-none'
              )}
            >
              <suggestion.icon className="h-4 w-4 shrink-0 text-primary" />
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
