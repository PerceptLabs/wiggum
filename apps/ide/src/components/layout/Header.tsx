import * as React from 'react'
import { Settings, Moon, Sun, PanelLeftClose, PanelLeft } from 'lucide-react'
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
  cn,
} from '@wiggum/stack'
import { useLayout } from './LayoutContext'

interface HeaderProps {
  projectName?: string
  onSettingsClick?: () => void
}

export function Header({ projectName = 'Untitled Project', onSettingsClick }: HeaderProps) {
  const { sidebarCollapsed, toggleSidebar } = useLayout()
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <WiggumLogo />
          <span className="font-semibold">Wiggum</span>
        </div>

        <span className="text-muted-foreground">/</span>

        <span className={cn('text-sm', !projectName && 'text-muted-foreground')}>
          {projectName || 'No project'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSettingsClick}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      className="text-primary"
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
