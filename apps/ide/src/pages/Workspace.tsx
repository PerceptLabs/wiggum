import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject, useFS } from '@/contexts'
import { useFileTree, useFileContent, useGit, usePreview } from '@/hooks'
import type { FileNode } from '@/hooks/useFileTree'
import { AppLayout, useLayout } from '@/components/layout'
import { FileTree, PreviewPane, CodeEditorPane, type GitStatusMap, type GitFileStatus } from '@/components/files'
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

/**
 * Check if a file path is a binary file type
 */
function isBinaryFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const binaryExtensions = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'mp3', 'wav', 'ogg', 'mp4', 'webm',
    'pdf', 'zip', 'tar', 'gz',
  ])
  return binaryExtensions.has(ext)
}

type FileDialogMode = 'newFile' | 'newFolder' | 'rename' | null

interface FileDialogState {
  mode: FileDialogMode
  name: string
  targetPath?: string // For rename - the file being renamed
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

  // Build logs
  const { addBuildLog } = useLayout()

  // Preview/build state
  const preview = usePreview(projectPath, { onLog: addBuildLog })

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
  // Filesystem access for Service Worker preview mode
  const { fs } = useFS()

  // File content management
  const fileContent = useFileContent(fileTree.selectedFile)

  // HTML file preview state - for previewing selected HTML files
  const [htmlFileContent, setHtmlFileContent] = React.useState<string | null>(null)

  // Check if selected file is HTML or TSX/JSX
  const isHtmlFile = fileTree.selectedFile?.toLowerCase().endsWith('.html')
  const isTsxFile =
    fileTree.selectedFile?.toLowerCase().endsWith('.tsx') ||
    fileTree.selectedFile?.toLowerCase().endsWith('.jsx')
  const isPreviewableFile = isHtmlFile || isTsxFile

  // Determine if project is previewable (has entry point)
  const isPreviewable = React.useMemo(() => {
    const hasEntry = (nodes: FileNode[]): boolean => {
      for (const node of nodes) {
        if (
          node.name === 'main.tsx' ||
          node.name === 'main.jsx' ||
          node.name === 'index.html' ||
          node.name === 'index.tsx' ||
          node.name === 'index.jsx'
        ) {
          return true
        }
        if (node.type === 'directory' && hasEntry(node.children)) {
          return true
        }
      }
      return false
    }
    return hasEntry(fileTree.tree)
  }, [fileTree.tree])

  // Store build function in ref to avoid dependency issues
  // (preview.build is recreated every render due to buildOptions spread)
  const buildRef = React.useRef(preview.build)
  React.useEffect(() => {
    buildRef.current = preview.build
  })

  // Load HTML file content or trigger build for TSX/JSX files
  React.useEffect(() => {
    if (isHtmlFile && fileContent.content) {
      setHtmlFileContent(fileContent.content)
    } else if (isTsxFile) {
      // Trigger build when TSX/JSX file is selected
      buildRef.current()
      setHtmlFileContent(null)
    } else {
      setHtmlFileContent(null)
    }
  }, [isHtmlFile, isTsxFile, fileContent.content])

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

  // Handle new file - use activeDirectory from fileTree
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

    // Use activeDirectory from fileTree, or fall back to project root
    const targetDir = fileTree.activeDirectory || currentProject.path

    try {
      if (mode === 'newFile') {
        await fileTree.createFile(`${targetDir}/${name.trim()}`)
      } else if (mode === 'newFolder') {
        await fileTree.createDirectory(`${targetDir}/${name.trim()}`)
      } else if (mode === 'rename' && targetPath) {
        const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
        const newPath = `${parentPath}/${name.trim()}`
        await fileTree.renameEntry(targetPath, newPath)
      }
      setFileDialog({ mode: null, name: '' })
    } catch (err) {
      console.error('File operation failed:', err)
      // TODO: Show toast notification for errors
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
      // TODO: Show toast notification for errors
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

  // Handle navigating to error location
  const handleGoToError = React.useCallback(
    (file: string, line: number) => {
      // Resolve file path relative to project
      const fullPath = file.startsWith('/') ? file : `${currentProject.path}/${file}`

      fileTree.selectFile(fullPath)
      // TODO: If editor supports it, scroll to line
      console.log(`[Preview] Navigate to ${fullPath}:${line}`)
    },
    [currentProject.path, fileTree]
  )

  // Read file callback for Service Worker preview mode (supports binary files)
  const handleReadFile = React.useCallback(
    async (path: string): Promise<string | Uint8Array | null> => {
      if (!fs) return null
      try {
        // Check if binary file (images, fonts, etc.)
        if (isBinaryFile(path)) {
          const content = await fs.readFile(path)
          return content as Uint8Array
        }
        // Text file
        const content = await fs.readFile(path, 'utf8')
        return content as string
      } catch {
        return null
      }
    },
    [fs]
  )

  // Dialog titles and placeholders
  const dialogConfig = {
    newFile: {
      title: 'New File',
      placeholder: 'filename.ts',
      description: `Create in: ${fileTree.activeDirectory || currentProject.path}`,
    },
    newFolder: {
      title: 'New Folder',
      placeholder: 'folder-name',
      description: `Create in: ${fileTree.activeDirectory || currentProject.path}`,
    },
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
        // Build props
        onBuild={preview.build}
        onRefreshPreview={preview.build}
        previewUrl="localhost:3000"
        isBuilding={preview.isBuilding}
        isPreviewable={isPreviewable}
        // Content slots
        fileTree={
          <FileTree
            nodes={fileTree.tree}
            onFileSelect={fileTree.selectFile}
            onToggleDir={fileTree.toggleDir}
            selectedPath={fileTree.selectedFile}
            activeDirectory={fileTree.activeDirectory}
            onRefresh={fileTree.refresh}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            gitStatus={gitStatusMap}
            isLoading={fileTree.isLoading}
            error={fileTree.error}
          />
        }
        chat={<ChatPane />}
        preview={
          <PreviewPane
            error={preview.error ?? undefined}
            errors={preview.errors ?? undefined}
            isLoading={preview.isBuilding}
            onRefresh={preview.build}
            onGoToError={handleGoToError}
            currentFile={isPreviewableFile ? (fileTree.selectedFile ?? undefined) : undefined}
            projectPath={currentProject.path}
            buildVersion={preview.buildVersion}
            onReadFile={handleReadFile}
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
              Are you sure you want to delete "{deleteTarget?.split('/').pop()}"? This action cannot
              be undone.
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
