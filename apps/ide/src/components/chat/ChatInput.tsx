import * as React from 'react'
import { Send, StopCircle, Paperclip } from 'lucide-react'
import { Button, Textarea, Tooltip, TooltipContent, TooltipTrigger, cn } from '@wiggum/stack'

interface ChatInputProps {
  onSend: (content: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export interface ChatInputRef {
  setInput: (text: string) => void
  focus: () => void
}

export const ChatInput = React.forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  {
    onSend,
    onStop,
    isLoading = false,
    disabled = false,
    placeholder = 'Type a message...',
    className,
  },
  ref
) {
  const [value, setValue] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setValue(text)
      // Focus the textarea after setting input
      setTimeout(() => {
        textareaRef.current?.focus()
        // Move cursor to end
        if (textareaRef.current) {
          textareaRef.current.selectionStart = text.length
          textareaRef.current.selectionEnd = text.length
        }
      }, 0)
    },
    focus: () => {
      textareaRef.current?.focus()
    },
  }))

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (value.trim() && !isLoading && !disabled) {
      onSend(value.trim())
      setValue('')
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('border-t-[length:var(--border-width,1px)] border-border bg-background p-4', className)}>
      <div className="flex items-end gap-3">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[52px] max-h-[200px] resize-none pr-20"
            rows={1}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {isLoading ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={onStop}
                className="shrink-0"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop generation</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={!value.trim() || disabled}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send (Cmd+Enter)</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Press <kbd className="border border-border bg-muted px-1.5 py-0.5 [font-weight:var(--kbd-weight,700)] [box-shadow:var(--kbd-shadow)]">Cmd</kbd> +{' '}
        <kbd className="border border-border bg-muted px-1.5 py-0.5 [font-weight:var(--kbd-weight,700)] [box-shadow:var(--kbd-shadow)]">Enter</kbd> to send
      </p>
    </form>
  )
})
