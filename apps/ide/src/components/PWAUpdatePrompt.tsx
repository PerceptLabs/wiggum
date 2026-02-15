import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@wiggum/stack'
import { initPrewarmer } from '@/lib/module-prewarmer'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        initPrewarmer()
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
      <span className="text-sm text-card-foreground">
        Update available
      </span>
      <Button
        size="sm"
        onClick={() => updateServiceWorker(true)}
      >
        Refresh
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setNeedRefresh(false)}
      >
        Dismiss
      </Button>
    </div>
  )
}
