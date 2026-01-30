import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Moon,
  Sun,
  Hammer,
  Terminal,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  FolderOpen,
  Plus,
  Eye,
  Code2,
} from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Input,
  cn,
} from '@wiggum/stack'
import { useLayout } from './LayoutContext'

interface Project {
  id: string
  name: string
}

interface HeaderProps {
  projectName?: string
  projects?: Project[]
  currentProject?: Project | null
  onProjectSelect?: (project: Project) => void
  onNewProject?: () => void
  onSettingsClick?: () => void
  onBuild?: () => void
  onRefreshPreview?: () => void
  previewUrl?: string
  isBuilding?: boolean
  isPreviewable?: boolean
}

export function Header({
  projectName = 'Untitled Project',
  projects = [],
  currentProject,
  onProjectSelect,
  onNewProject,
  onBuild,
  onRefreshPreview,
  previewUrl,
  isBuilding = false,
  isPreviewable = true,
}: HeaderProps) {
  const navigate = useNavigate()
  const { viewMode, setViewMode, toggleLogs, logsOpen } = useLayout()
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b-[length:var(--border-width,1px)] border-border bg-primary px-4 [box-shadow:var(--shadow)]">
      {/* Left section: Logo and project selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <WiggumLogo />
          <span className="[font-weight:var(--heading-weight,700)] text-lg [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)] text-primary-foreground">Wiggum</span>
        </div>

        <span className="text-primary-foreground/60 font-bold">/</span>

        {/* Project dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
              <span className="max-w-[150px] truncate font-semibold">
                {currentProject?.name || projectName || 'Select project'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => {
                  onProjectSelect?.(project)
                  navigate(`/project/${project.id}`)
                }}
                className={cn(currentProject?.id === project.id && 'bg-primary/20')}
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

      {/* Center section: URL bar (only in preview mode) */}
      {viewMode === 'preview' && isPreviewable && (
        <div className="flex items-center gap-2">
          <div className="flex items-center border-[length:var(--border-width,1px)] border-border bg-background">
            <Input
              value={previewUrl || 'localhost:3000'}
              readOnly
              className="h-8 w-48 border-0 bg-transparent text-xs font-mono focus-visible:ring-0"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onRefreshPreview}
                  disabled={isBuilding}
                >
                  <RefreshCw className={cn('h-4 w-4', isBuilding && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-2">
        {/* BUILD button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onBuild}
              disabled={isBuilding}
              className="gap-2 bg-background"
            >
              <Hammer className={cn('h-4 w-4', isBuilding && 'animate-pulse')} />
              Build
            </Button>
          </TooltipTrigger>
          <TooltipContent>Build project</TooltipContent>
        </Tooltip>

        {/* Preview | Code toggle group */}
        <div className="flex border-[length:var(--border-width,1px)] border-border rounded-md overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('preview')}
                disabled={!isPreviewable}
                className={cn(
                  'rounded-none border-0 gap-1.5',
                  viewMode === 'preview' && isPreviewable
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-background hover:bg-accent',
                  !isPreviewable && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPreviewable ? 'View live preview' : 'No previewable content'}
            </TooltipContent>
          </Tooltip>
          <div className="w-px bg-border" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('code')}
                className={cn(
                  'rounded-none border-0 gap-1.5',
                  viewMode === 'code'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-background hover:bg-accent'
                )}
              >
                <Code2 className="h-4 w-4" />
                Code
              </Button>
            </TooltipTrigger>
            <TooltipContent>View code editor</TooltipContent>
          </Tooltip>
        </div>

        {/* LOGS button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={logsOpen ? 'default' : 'outline'}
              size="sm"
              onClick={toggleLogs}
              className={cn(
                'gap-2',
                logsOpen ? 'bg-primary text-primary-foreground' : 'bg-background'
              )}
            >
              <Terminal className="h-4 w-4" />
              Logs
            </Button>
          </TooltipTrigger>
          <TooltipContent>View build logs</TooltipContent>
        </Tooltip>

        <div className="mx-2 h-6 w-px bg-primary-foreground/30" />

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="bg-background">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/settings')}
              className="bg-background"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function WiggumLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary-foreground"
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
