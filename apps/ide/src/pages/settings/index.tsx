import * as React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings as SettingsIcon, Plug, Wrench } from 'lucide-react'
import { Button, cn } from '@wiggum/stack'
import { Sidebar } from '@/components/layout'

const NAV_ITEMS = [
  {
    to: '/settings',
    label: 'General',
    icon: SettingsIcon,
    description: 'Preferences',
    end: true,
  },
  {
    to: '/settings/integrations',
    label: 'Integrations',
    icon: Plug,
    description: 'AI, Git',
  },
  {
    to: '/settings/advanced',
    label: 'Advanced',
    icon: Wrench,
    description: 'Storage, About',
  },
]

export function Settings() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b-3 border-border bg-primary px-4 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_hsl(50,100%,53%)]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-bold uppercase tracking-wide text-primary-foreground">
          Settings
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings navigation */}
        <aside className="w-64 border-r-3 border-border bg-card">
          <nav className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 text-left text-sm transition-all',
                    'border-2 border-transparent',
                    isActive
                      ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]'
                      : 'hover:border-border hover:bg-muted'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <div>
                  <div className="font-bold uppercase tracking-wide">{item.label}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Settings content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { GeneralSettings } from './GeneralSettings'
export { IntegrationsSettings } from './IntegrationsSettings'
export { AdvancedSettings } from './AdvancedSettings'
