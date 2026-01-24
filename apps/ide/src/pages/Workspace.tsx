import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/contexts'
import { useFileTree, useFileContent, useGit, usePreview } from '@/hooks'
import { AppLayout } from '@/components/layout'
import { FileTree, PreviewPane, CodeEditorPane, FileProvider, type GitStatusMap, type GitFileStatus, type FileEntry } from '@/components/files'
import { ChatPane, ChatProvider } from '@/components/chat'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Button,
} from '@wiggum/stack'

type FileDialogMode = 'newFile' | 'newFolder' | 'rename' | null

interface FileDialogState {
  mode: FileDialogMode
  name: string
  targetPath?: string // For rename - the file being renamed
}

/**
 * Recursively check if a path is a directory in the file tree
 */
function checkIfDirectory(path: string, entries: FileEntry[]): boolean {
  for (const entry of entries) {
    if (entry.path === path) {
      return entry.type === 'directory'
    }
    if (entry.children) {
      const result = checkIfDirectory(path, entry.children)
      if (result !== false) {
        return result
      }
    }
  }
  return false
}

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
  // Search query state
  const [searchQuery, setSearchQuery] = React.useState('')

  // File content management
  const fileContent = useFileContent(fileTree.selectedFile)

  // HTML file preview state - for previewing selected HTML files
  const [htmlFileContent, setHtmlFileContent] = React.useState<string | null>(null)

  // Check if selected file is HTML
  const isHtmlFile = fileTree.selectedFile?.toLowerCase().endsWith('.html')

  // Load HTML file content when an HTML file is selected
  React.useEffect(() => {
    if (isHtmlFile && fileContent.content) {
      setHtmlFileContent(fileContent.content)
    } else if (!isHtmlFile) {
      setHtmlFileContent(null)
    }
  }, [isHtmlFile, fileContent.content])

  // File dialog state (new file, new folder, rename)
  const [fileDialog, setFileDialog] = React.useState<FileDialogState>({
    mode: null,
    name: '',
  })

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)

  // Git status map
  const [gitStatusMap, setGitStatusMap] = React.useState<GitStatusMap>(new Map())

  // Fetch git status periodically
  React.useEffect(() => {
    if (!git.isRepo) {
      setGitStatusMap(new Map())
      return
    }

    const fetchStatus = async () => {
      try {
        const statusArray = await git.status()
        const map = new Map<string, GitFileStatus>()

        for (const entry of statusArray) {
          // isomorphic-git status format: [filepath, headStatus, workdirStatus, stageStatus]
          const filepath = entry[0]
          const workdirStatus = entry[2]
          const stageStatus = entry[3]

          // Determine file status
          let status: GitFileStatus = 'unchanged'
          if (stageStatus === 2) {
            status = 'added'
          } else if (stageStatus === 3) {
            status = 'modified'
          } else if (workdirStatus === 2) {
            status = 'modified'
          } else if (workdirStatus === 0) {
            status = 'deleted'
          } else if (workdirStatus === 1 && stageStatus === 0) {
            status = 'untracked'
          }

          if (status !== 'unchanged') {
            map.set(`${currentProject.path}/${filepath}`, status)
          }
        }

        setGitStatusMap(map)
      } catch (err) {
        console.error('Failed to fetch git status:', err)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [git.isRepo, git.status, currentProject.path])

  /**
   * Get the target directory for creating new files/folders
   * - If a directory is selected: create inside that directory
   * - If a file is selected: create in the same directory (sibling)
   * - If nothing selected: create at project root
   */
  const getTargetDirectory = React.useCallback(() => {
    if (!fileTree.selectedFile) {
      return currentProject.path
    }

    const isDir = checkIfDirectory(fileTree.selectedFile, fileTree.tree)

    if (isDir) {
      return fileTree.selectedFile
    } else {
      // Extract parent directory from file path
      const lastSlash = fileTree.selectedFile.lastIndexOf('/')
      return lastSlash > 0 ? fileTree.selectedFile.substring(0, lastSlash) : currentProject.path
    }
  }, [fileTree.selectedFile, fileTree.tree, currentProject.path])

  // Handle new file
  const handleNewFile = () => {
    setFileDialog({ mode: 'newFile', name: '' })
  }

  // Handle new folder
  const handleNewFolder = () => {
    setFileDialog({ mode: 'newFolder', name: '' })
  }

  // Handle rename
  const handleRename = (path: string) => {
    const name = path.split('/').pop() || ''
    setFileDialog({ mode: 'rename', name, targetPath: path })
  }

  // Handle delete
  const handleDelete = (path: string) => {
    setDeleteTarget(path)
  }

  // Submit file dialog
  const handleFileDialogSubmit = async () => {
    const { mode, name, targetPath } = fileDialog
    if (!name.trim()) return

    try {
      if (mode === 'newFile') {
        const targetDir = getTargetDirectory()
        await fileTree.createFile(`${targetDir}/${name.trim()}`)
      } else if (mode === 'newFolder') {
        const targetDir = getTargetDirectory()
        await fileTree.createDirectory(`${targetDir}/${name.trim()}`)
      } else if (mode === 'rename' && targetPath) {
        const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
        const newPath = `${parentPath}/${name.trim()}`
        await fileTree.renameEntry(targetPath, newPath)
      }
      setFileDialog({ mode: null, name: '' })
    } catch (err) {
      console.error('File operation failed:', err)
    }
  }

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await fileTree.deleteEntry(deleteTarget)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Handle file save
  const handleSave = React.useCallback(async () => {
    try {
      await fileContent.saveFile()
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [fileContent])

  // Dialog titles and placeholders
  const dialogConfig = {
    newFile: { title: 'New File', placeholder: 'filename.ts', description: 'Enter a name for the new file' },
    newFolder: { title: 'New Folder', placeholder: 'folder-name', description: 'Enter a name for the new folder' },
    rename: { title: 'Rename', placeholder: 'new-name', description: 'Enter a new name' },
  }

  return (
    <>
      <AppLayout
        // Project props
        projects={projects}
        currentProject={currentProject}
        onProjectSelect={onProjectSelect}
        onNewProject={onNewProject}
        // Sidebar props
        onSearch={setSearchQuery}
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
            onToggleDir={fileTree.toggleDir}
            selectedPath={fileTree.selectedFile}
            onRefresh={fileTree.refresh}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            onRename={handleRename}
            onDelete={handleDelete}
            searchQuery={searchQuery}
            gitStatus={gitStatusMap}
          />
        }
        chat={<ChatPane />}
        preview={
          <PreviewPane
            html={htmlFileContent ?? preview.html ?? undefined}
            error={preview.error ?? undefined}
            isLoading={preview.isBuilding}
            onRefresh={preview.build}
            currentFile={isHtmlFile ? fileTree.selectedFile ?? undefined : undefined}
          />
        }
        codeEditor={
          <CodeEditorPane
            selectedFile={fileTree.selectedFile}
            content={fileContent.content}
            isModified={fileContent.isModified}
            isLoading={fileContent.isLoading}
            onChange={fileContent.setContent}
            onSave={handleSave}
          />
        }
      />

      {/* New File / New Folder / Rename Dialog */}
      <Dialog
        open={fileDialog.mode !== null}
        onOpenChange={(open) => !open && setFileDialog({ mode: null, name: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fileDialog.mode && dialogConfig[fileDialog.mode].title}</DialogTitle>
            <DialogDescription>
              {fileDialog.mode && dialogConfig[fileDialog.mode].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder={fileDialog.mode ? dialogConfig[fileDialog.mode].placeholder : ''}
              value={fileDialog.name}
              onChange={(e) => setFileDialog((s) => ({ ...s, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleFileDialogSubmit()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFileDialog({ mode: null, name: '' })}>
                Cancel
              </Button>
              <Button onClick={handleFileDialogSubmit} disabled={!fileDialog.name.trim()}>
                {fileDialog.mode === 'rename' ? 'Rename' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.split('/').pop()}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
