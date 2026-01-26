import * as React from 'react'
import { useFS } from './FSContext'

const STORAGE_KEY = 'wiggum-projects'
const PROJECTS_DIR = '/projects'

export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
  updatedAt: string
}

interface ProjectContextValue {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  createProject: (name: string) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  selectProject: (id: string | null) => void
  refreshProjects: () => Promise<void>
}

const ProjectContext = React.createContext<ProjectContextValue | null>(null)

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function loadProjectsFromStorage(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveProjectsToStorage(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // Ignore storage errors
  }
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { fs, isReady } = useFS()
  const [projects, setProjects] = React.useState<Project[]>(loadProjectsFromStorage)
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const currentProject = React.useMemo(
    () => projects.find((p) => p.id === currentProjectId) || null,
    [projects, currentProjectId]
  )

  // Ensure projects directory exists
  React.useEffect(() => {
    if (fs && isReady) {
      fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {
        // Directory might already exist
      })
    }
  }, [fs, isReady])

  // Persist projects to localStorage
  React.useEffect(() => {
    saveProjectsToStorage(projects)
  }, [projects])

  const createProject = React.useCallback(
    async (name: string): Promise<Project> => {
      if (!fs) {
        throw new Error('Filesystem not ready')
      }

      setIsLoading(true)
      setError(null)

      try {
        const id = generateId()
        const path = `${PROJECTS_DIR}/${id}`
        const now = new Date().toISOString()

        // Create project directory structure
        await fs.mkdir(path, { recursive: true })
        await fs.mkdir(`${path}/src`, { recursive: true })

        // Create starter files
        await fs.writeFile(`${path}/README.md`, `# ${name}\n\nCreated with Wiggum.\n`)

        // Create package.json with @wiggum/stack dependency
        await fs.writeFile(
          `${path}/package.json`,
          JSON.stringify(
            {
              name: name.toLowerCase().replace(/\s+/g, '-'),
              private: true,
              type: 'module',
              dependencies: {
                react: '^19.0.0',
                'react-dom': '^19.0.0',
                '@wiggum/stack': 'workspace:*',
              },
            },
            null,
            2
          )
        )

        // Main entry point with CSS import
        await fs.writeFile(
          `${path}/src/main.tsx`,
          `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
        )

        // CSS file - Tailwind is loaded via CDN in preview
        await fs.writeFile(
          `${path}/src/index.css`,
          `/*
 * Custom styles go here.
 * Tailwind is loaded via CDN in the preview iframe.
 * Use Tailwind classes in your components for styling.
 */
`
        )

        // App component with @wiggum/stack
        await fs.writeFile(
          `${path}/src/App.tsx`,
          `import { Card, CardHeader, CardTitle, CardContent, Button } from '@wiggum/stack'

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome to ${name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Edit <code className="bg-muted px-1 rounded">src/App.tsx</code> to get started.
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </div>
  )
}
`
        )

        const project: Project = {
          id,
          name,
          path,
          createdAt: now,
          updatedAt: now,
        }

        setProjects((prev) => [...prev, project])
        setCurrentProjectId(id)

        return project
      } catch (err) {
        const message = (err as Error).message
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fs]
  )

  const deleteProject = React.useCallback(
    async (id: string): Promise<void> => {
      if (!fs) {
        throw new Error('Filesystem not ready')
      }

      setIsLoading(true)
      setError(null)

      try {
        const project = projects.find((p) => p.id === id)
        if (project) {
          // Delete project directory recursively
          await fs.rmdir(project.path, { recursive: true })
        }

        setProjects((prev) => prev.filter((p) => p.id !== id))

        if (currentProjectId === id) {
          setCurrentProjectId(null)
        }
      } catch (err) {
        const message = (err as Error).message
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fs, projects, currentProjectId]
  )

  const renameProject = React.useCallback(
    async (id: string, name: string): Promise<void> => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
        )
      )
    },
    []
  )

  const selectProject = React.useCallback((id: string | null) => {
    setCurrentProjectId(id)
  }, [])

  const refreshProjects = React.useCallback(async (): Promise<void> => {
    // For now, just reload from storage
    // In the future, could sync with filesystem
    setProjects(loadProjectsFromStorage())
  }, [])

  const value = React.useMemo(
    () => ({
      projects,
      currentProject,
      isLoading,
      error,
      createProject,
      deleteProject,
      renameProject,
      selectProject,
      refreshProjects,
    }),
    [
      projects,
      currentProject,
      isLoading,
      error,
      createProject,
      deleteProject,
      renameProject,
      selectProject,
      refreshProjects,
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectContextValue {
  const context = React.useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

export { ProjectContext }
