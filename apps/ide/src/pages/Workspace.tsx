import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/contexts'
import { useFileTree, useGit, usePreview } from '@/hooks'
import { AppLayout } from '@/components/layout'
import { FileTree, PreviewPane, CodeEditorPane, FileProvider } from '@/components/files'
import { ChatPane, ChatProvider } from '@/components/chat'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
} from '@wiggum/stack'

export function Workspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, currentProject, selectProject, createProject } = useProject()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newProjectName, setNewProjectName] = React.useState('')

  // Find and set current project
  React.useEffect(() => {
    if (id) {
      const project = projects.find((p) => p.id === id)
      if (project) {
        selectProject(project.id)
      } else if (projects.length > 0) {
        // Project not found, redirect to home
        navigate('/')
      }
    }
  }, [id, projects, selectProject, navigate])

  const projectPath = currentProject?.path || null

  // File tree state
  const fileTree = useFileTree(projectPath)

  // Git state
  const git = useGit(projectPath)

  // Preview/build state
  const preview = usePreview(projectPath)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const project = await createProject(newProjectName.trim())
    if (project) {
      setNewProjectName('')
      setIsCreateOpen(false)
      navigate(`/project/${project.id}`)
    }
  }

  const handleProjectSelect = (project: { id: string; name: string }) => {
    selectProject(project.id)
  }

  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  return (
    <FileProvider>
      <ChatProvider>
        <WorkspaceContent
          projects={projects}
          currentProject={currentProject}
          onProjectSelect={handleProjectSelect}
          onNewProject={() => setIsCreateOpen(true)}
          fileTree={fileTree}
          git={git}
          preview={preview}
        />

        {/* Create project dialog */}
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </ChatProvider>
    </FileProvider>
  )
}

interface WorkspaceContentProps {
  projects: Array<{ id: string; name: string }>
  currentProject: { id: string; name: string; path: string }
  onProjectSelect: (project: { id: string; name: string }) => void
  onNewProject: () => void
  fileTree: ReturnType<typeof useFileTree>
  git: ReturnType<typeof useGit>
  preview: ReturnType<typeof usePreview>
}

function WorkspaceContent({
  projects,
  currentProject,
  onProjectSelect,
  onNewProject,
  fileTree,
  git,
  preview,
}: WorkspaceContentProps) {
  return (
    <AppLayout
      // Project props
      projects={projects}
      currentProject={currentProject}
      onProjectSelect={onProjectSelect}
      onNewProject={onNewProject}
      // Sidebar props
      onSearch={(query) => {
        // TODO: Implement file search filtering
        console.log('Search:', query)
      }}
      onInitGit={git.init}
      isGitInitialized={git.isRepo}
      // Build props
      onBuild={preview.build}
      onRefreshPreview={preview.build}
      previewUrl="localhost:3000"
      isBuilding={preview.isBuilding}
      // Content slots
      sidebar={
        <FileTree
          entries={fileTree.tree}
          onFileSelect={fileTree.selectFile}
          selectedPath={fileTree.selectedFile}
          onRefresh={fileTree.refresh}
        />
      }
      chat={<ChatPane />}
      preview={
        <PreviewPane
          html={preview.html ?? undefined}
          error={preview.error ?? undefined}
          isLoading={preview.isBuilding}
          onRefresh={preview.build}
        />
      }
      codeEditor={
        <CodeEditorPane
          selectedFile={fileTree.selectedFile}
          content=""
          isModified={false}
        />
      }
    />
  )
}
