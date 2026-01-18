import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import Prism from 'prismjs'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ToolCallDisplay } from './ToolCallDisplay'
import type { AIToolCall } from '@/lib/ai'

// Import common Prism languages
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'

interface AssistantMessageProps {
  content: string | null
  toolCalls?: AIToolCall[]
  toolResults?: Map<string, string>
  className?: string
}

export function AssistantMessage({
  content,
  toolCalls,
  toolResults,
  className,
}: AssistantMessageProps) {
  return (
    <div className={cn('flex gap-3 px-4 py-3', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <p className="text-sm font-medium">Wiggum</p>

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((toolCall) => (
              <ToolCallDisplay
                key={toolCall.id}
                name={toolCall.function.name}
                arguments={toolCall.function.arguments}
                result={toolResults?.get(toolCall.id)}
                isRalphIteration={toolCall.function.name === 'ralph'}
              />
            ))}
          </div>
        )}

        {/* Markdown content */}
        {content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const language = match ? match[1] : ''
                  const codeString = String(children).replace(/\n$/, '')

                  // Check if it's an inline code block
                  const isInline = !className

                  if (isInline) {
                    return (
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm" {...props}>
                        {children}
                      </code>
                    )
                  }

                  // Highlight with Prism
                  let highlighted = codeString
                  if (language && Prism.languages[language]) {
                    try {
                      highlighted = Prism.highlight(codeString, Prism.languages[language], language)
                    } catch {
                      // Use unhighlighted code
                    }
                  }

                  return (
                    <div className="relative">
                      {language && (
                        <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                          {language}
                        </div>
                      )}
                      <pre className="overflow-x-auto rounded-lg bg-muted p-4">
                        <code
                          className={cn('font-mono text-sm', className)}
                          dangerouslySetInnerHTML={{ __html: highlighted }}
                        />
                      </pre>
                    </div>
                  )
                },
                pre({ children }) {
                  return <>{children}</>
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>
                },
                ul({ children }) {
                  return <ul className="mb-2 list-disc pl-4">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="mb-2 list-decimal pl-4">{children}</ol>
                },
                li({ children }) {
                  return <li className="mb-1">{children}</li>
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      className="text-primary underline hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
