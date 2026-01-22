import * as React from 'react'
import { Search, GitBranch } from 'lucide-react'
import {
  Button,
  Input,
  ScrollArea,
  Separator,
} from '@wiggum/stack'
import { useLayout, DEFAULT_SIDEBAR_WIDTH } from './LayoutContext'

interface SidebarProps {
  onSearch?: (query: string) => void
  onInitGit?: () => void
  isGitInitialized?: boolean
  children?: React.ReactNode
}

export function Sidebar({
  onSearch,
  onInitGit,
  isGitInitialized = false,
  children,
}: SidebarProps) {
  const { sidebarCollapsed, sidebarWidth } = useLayout()
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  if (sidebarCollapsed) {
    return null
  }

  return (
    <aside
      className="flex flex-col border-r-3 border-border bg-card"
      style={{ width: sidebarWidth || DEFAULT_SIDEBAR_WIDTH }}
    >
      {/* Files header with search */}
      <div className="p-3">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Files</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* File tree area */}
      <ScrollArea className="flex-1">
        <div className="p-2">{children}</div>
      </ScrollArea>

      {/* Git button at bottom */}
      <div className="border-t-2 border-border p-3">
        {isGitInitialized ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>Git initialized</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onInitGit}
            className="w-full gap-2 font-bold uppercase"
          >
            <GitBranch className="h-4 w-4" />
            Init Git
          </Button>
        )}
      </div>
    </aside>
  )
}
