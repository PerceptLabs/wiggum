import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '@/contexts'
import { useFileTree, useGit, useAIChat, useRalphStatus } from '@/hooks'
import { AppLayout, Sidebar, Header } from '@/components/layout'
import { FileTree, FileEditor, PreviewPane, FileProvider } from '@/components/files'
import { ChatPane, ChatProvider } from '@/components/chat'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Workspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, currentProject, setCurrentProject } = useProject()

  // Find and set current project
  React.useEffect(() => {
    if (id) {
      const project = projects.find((p) => p.id === id)
      if (project) {
        setCurrentProject(project)
      } else if (projects.length > 0) {
        // Project not found, redirect to home
        navigate('/')
      }
    }
  }, [id, projects, setCurrentProject, navigate])

  const projectPath = currentProject?.path || null

  // File tree state
  const fileTree = useFileTree(projectPath)

  // Git state
  const git = useGit(projectPath)

  // AI chat
  const chat = useAIChat()

  // Ralph status
  const ralph = useRalphStatus()

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
        <AppLayout
          sidebar={
            <Sidebar>
              <div className="flex items-center justify-between p-3 border-b border-border">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                  Back
                </Button>
                <span className="text-sm font-medium truncate">{currentProject.name}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileTree
                  nodes={fileTree.tree}
                  expandedDirs={fileTree.expandedDirs}
                  selectedFile={fileTree.selectedFile}
                  onToggleDir={fileTree.toggleDir}
                  onSelectFile={fileTree.selectFile}
                />
              </div>
              <div className="border-t border-border p-3">
                {git.isRepo ? (
                  <div className="text-xs text-muted-foreground">
                    Git initialized
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={git.init} className="w-full">
                    Init Git
                  </Button>
                )}
              </div>
            </Sidebar>
          }
          header={
            <Header>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentProject.name}</span>
                {ralph.isRunning && (
                  <Badge variant="secondary">
                    Ralph: {ralph.iteration}/{ralph.maxIterations}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {chat.isReady ? (
                  <Badge variant="outline">AI Ready</Badge>
                ) : (
                  <Badge variant="destructive">No API Key</Badge>
                )}
              </div>
            </Header>
          }
          main={
            <div className="flex h-full">
              <div className="flex-1 flex flex-col">
                {fileTree.selectedFile ? (
                  <FileEditor
                    path={fileTree.selectedFile}
                    onSave={fileTree.refresh}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          }
          chat={
            <ChatPane
              messages={chat.messages}
              streamingContent={chat.streamingContent}
              isLoading={chat.isLoading}
              onSend={chat.sendMessage}
              onCancel={chat.cancel}
              ralphStatus={ralph.status}
              ralphProgress={ralph.progress}
            />
          }
          preview={
            fileTree.selectedFile ? (
              <PreviewPane path={fileTree.selectedFile} />
            ) : null
          }
        />
      </ChatProvider>
    </FileProvider>
  )
}
