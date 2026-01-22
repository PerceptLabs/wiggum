import * as React from 'react'
import { Database, Trash2, Info, HardDrive } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@wiggum/stack'

export function AdvancedSettings() {
  const [storageUsed, setStorageUsed] = React.useState<string>('Calculating...')

  React.useEffect(() => {
    // Estimate storage usage
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const usedMB = (used / (1024 * 1024)).toFixed(2)
        const quotaMB = (quota / (1024 * 1024)).toFixed(0)
        setStorageUsed(`${usedMB} MB / ${quotaMB} MB`)
      })
    } else {
      setStorageUsed('Unknown')
    }
  }, [])

  const handleClearStorage = () => {
    if (
      confirm(
        'This will delete all projects and settings. This action cannot be undone. Are you sure?'
      )
    ) {
      localStorage.clear()
      // Clear IndexedDB
      indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        })
      })
      window.location.reload()
    }
  }

  const handleExportData = () => {
    const data = {
      localStorage: { ...localStorage },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wiggum-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide">Advanced</h2>
        <p className="mt-1 text-muted-foreground">Storage and system information</p>
      </div>

      {/* Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Storage</CardTitle>
              <CardDescription>Manage browser storage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-2 border-border bg-muted p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-bold">Browser Storage</div>
                <div className="text-sm text-muted-foreground">{storageUsed}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportData}>
              Export Data
            </Button>
            <Button variant="destructive" onClick={handleClearStorage}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            All data is stored locally in your browser. Clearing data will delete all projects and
            settings.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
              <Info className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>About Wiggum</CardTitle>
              <CardDescription>Version and credits</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">Version</span>
              <Badge variant="secondary">0.1.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Build</span>
              <Badge variant="outline">Development</Badge>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Wiggum is a browser-based AI coding IDE with the ralph command for autonomous
              development. Built with React, TypeScript, and Claude AI.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a
                href="https://github.com/your-repo/wiggum"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://docs.wiggum.dev" target="_blank" rel="noopener noreferrer">
                Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
