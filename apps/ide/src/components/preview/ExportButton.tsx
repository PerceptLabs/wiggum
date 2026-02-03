import * as React from 'react'
import { Button } from '@wiggum/stack'
import { Download } from 'lucide-react'
import { useFS } from '@/contexts'
import { buildProject, createModuleCache } from '@/lib/build'
import { exportSingleHTML, downloadFile } from '@/lib/build/export'

interface ExportButtonProps {
  projectPath: string | null
  disabled?: boolean
}

export function ExportButton({ projectPath, disabled }: ExportButtonProps) {
  const { fs } = useFS()
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = React.useCallback(async () => {
    if (!fs || !projectPath) return

    setIsExporting(true)
    try {
      // Build the project first
      const moduleCache = createModuleCache()
      const buildResult = await buildProject(fs, projectPath, {
        minify: true,
        moduleCache,
      })

      // Export as single HTML
      const result = await exportSingleHTML(fs, projectPath, buildResult)

      if (result.success && result.files.length > 0) {
        downloadFile(result.files[0].name, result.files[0].content, result.files[0].type)
      } else {
        console.error('Export failed:', result.error)
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }, [fs, projectPath])

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || !projectPath || isExporting}
      onClick={handleExport}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export HTML'}
    </Button>
  )
}
