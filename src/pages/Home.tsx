import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '@/contexts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function Home() {
  const navigate = useNavigate()
  const { projects, isLoading, createProject, deleteProject } = useProject()
  const [newProjectName, setNewProjectName] = React.useState('')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const handleCreate = async () => {
    if (!newProjectName.trim()) return

    const project = await createProject(newProjectName.trim())
    if (project) {
      setNewProjectName('')
      setIsCreateOpen(false)
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-3xl font-bold">Wiggum</h1>
          <p className="mt-1 text-muted-foreground">
            Browser-based AI coding with the ralph command
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>New Project</Button>
            </DialogTrigger>
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

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started with AI-powered coding
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last modified: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(project.id, e)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Delete
                </Button>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
