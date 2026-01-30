import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '@/contexts'
import { useTheme } from '@/hooks'
import {
  Plus,
  FolderOpen,
  Trash2,
  Settings,
  Moon,
  Sun,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  cn,
} from '@wiggum/stack'

export function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { projects, isLoading, createProject, deleteProject } = useProject()
  const [newProjectName, setNewProjectName] = React.useState('')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [quickPrompt, setQuickPrompt] = React.useState('')

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newProjectName.trim()) return

    const project = await createProject(newProjectName.trim())
    if (project) {
      setNewProjectName('')
      setIsCreateOpen(false)
      navigate(`/project/${project.id}`)
    }
  }

  const handleQuickCreate = async () => {
    if (!quickPrompt.trim()) return

    // Create a project with a generated name from the prompt
    const projectName = quickPrompt.trim().slice(0, 30) || 'New Project'
    const project = await createProject(projectName)
    if (project) {
      // TODO: Store the prompt to send to chat on workspace load
      navigate(`/project/${project.id}`)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate()
    }
  }

  const handleQuickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleQuickCreate()
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r-[length:var(--border-width,1px)] border-border bg-card">
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b-[length:var(--border-width,1px)] border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-primary [box-shadow:var(--shadow-sm)]">
              <span className="text-sm [font-weight:var(--heading-weight-heavy,900)] text-primary-foreground">W</span>
            </div>
            <span className="text-lg [font-weight:var(--heading-weight-heavy,900)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Wiggum</span>
          </div>
        </div>

        {/* Search */}
        <div className="border-b-[length:var(--border-width,1px)] border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs [font-weight:var(--label-weight,600)] [text-transform:var(--label-transform,none)] [letter-spacing:var(--label-tracking,normal)] text-muted-foreground">
              Projects
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No matching projects' : 'No projects yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className={cn(
                    'group flex cursor-pointer items-center justify-between px-3 py-2',
                    'border border-transparent',
                    'transition-all duration-150',
                    'hover:border-border hover:bg-accent',
                    'hover:[box-shadow:var(--shadow-sm)]'
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-medium">{project.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => handleDelete(project.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t-[length:var(--border-width,1px)] border-border p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
        {/* Hero Section */}
        <div className="w-full max-w-2xl text-center">
          {/* Logo */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-primary [box-shadow:var(--shadow)]">
            <span className="text-4xl [font-weight:var(--heading-weight-heavy,900)] text-primary-foreground">W</span>
          </div>

          <h1 className="mb-2 text-4xl [font-weight:var(--heading-weight-heavy,900)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Wiggum</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Browser-based AI coding with the ralph command
          </p>

          {/* Quick Start Input */}
          <div className="mx-auto max-w-xl">
            <div className="border-[length:var(--border-width,1px)] border-border bg-card p-6 [box-shadow:var(--shadow)]">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="[font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Quick Start</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Describe what you want to build and Wiggum will create a new project for you.
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="Build a todo app with React..."
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="flex-1"
                />
                <Button onClick={handleQuickCreate} disabled={!quickPrompt.trim()} className="gap-2">
                  Create
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Press{' '}
                <kbd className="border border-border bg-muted px-1.5 py-0.5 [font-weight:var(--kbd-weight,700)] [box-shadow:var(--kbd-shadow)]">
                  Cmd
                </kbd>{' '}
                +{' '}
                <kbd className="border border-border bg-muted px-1.5 py-0.5 [font-weight:var(--kbd-weight,700)] [box-shadow:var(--kbd-shadow)]">
                  Enter
                </kbd>{' '}
                to create
              </p>
            </div>
          </div>

          {/* Or separator */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-0.5 flex-1 bg-border" />
            <span className="text-sm [font-weight:var(--label-weight,600)] [text-transform:var(--label-transform,none)] text-muted-foreground">Or</span>
            <div className="h-0.5 flex-1 bg-border" />
          </div>

          {/* Create Empty Project Button */}
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-5 w-5" />
            Create Empty Project
          </Button>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="mt-12 w-full max-w-2xl">
            <h2 className="mb-4 text-sm [font-weight:var(--label-weight,600)] [text-transform:var(--label-transform,none)] [letter-spacing:var(--label-tracking,normal)] text-muted-foreground">
              Recent Projects
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className={cn(
                    'group cursor-pointer border-[length:var(--border-width,1px)] border-border bg-card p-4',
                    'transition-all duration-150',
                    'hover:border-primary hover:bg-primary/5',
                    'hover:[box-shadow:var(--shadow)]',
                    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                    'active:translate-x-0 active:translate-y-0 active:shadow-none'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="truncate [font-weight:var(--heading-weight,700)]">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newProjectName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
