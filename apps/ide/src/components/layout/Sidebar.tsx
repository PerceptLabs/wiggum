import * as React from 'react'
import { FolderOpen, ChevronDown, Plus } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
  Separator,
  cn,
} from '@wiggum/stack'
import { useLayout, DEFAULT_SIDEBAR_WIDTH } from './LayoutContext'

interface Project {
  id: string
  name: string
}

interface SidebarProps {
  projects?: Project[]
  currentProject?: Project
  onProjectSelect?: (project: Project) => void
  onNewProject?: () => void
  children?: React.ReactNode
}

export function Sidebar({
  projects = [],
  currentProject,
  onProjectSelect,
  onNewProject,
  children,
}: SidebarProps) {
  const { sidebarCollapsed, sidebarWidth } = useLayout()

  if (sidebarCollapsed) {
    return null
  }

  return (
    <aside
      className="flex flex-col border-r bg-muted/30"
      style={{ width: sidebarWidth || DEFAULT_SIDEBAR_WIDTH }}
    >
      {/* Project selector */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{currentProject?.name || 'Select project'}</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectSelect?.(project)}
                className={cn(currentProject?.id === project.id && 'bg-accent')}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
            {projects.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onNewProject}>
              <Plus className="mr-2 h-4 w-4" />
              New project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      {/* File tree area */}
      <ScrollArea className="flex-1">
        <div className="p-2">{children}</div>
      </ScrollArea>
    </aside>
  )
}
