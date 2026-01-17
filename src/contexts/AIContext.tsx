import * as React from 'react'
import type { AIProvider } from '@/lib/ai'
import { PROVIDER_PRESETS } from '@/lib/ai'

const STORAGE_KEY = 'wiggum-ai-settings'

interface AISettings {
  provider: AIProvider | null
  selectedModel: string
  availableModels: string[]
}

interface AIContextValue extends AISettings {
  setProvider: (provider: AIProvider) => void
  setSelectedModel: (model: string) => void
  setApiKey: (apiKey: string) => void
  clearSettings: () => void
  isConfigured: boolean
}

const AIContext = React.createContext<AIContextValue | null>(null)

const DEFAULT_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

function loadSettings(): AISettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        provider: parsed.provider || null,
        selectedModel: parsed.selectedModel || 'gpt-4o',
        availableModels: parsed.availableModels || DEFAULT_MODELS,
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {
    provider: null,
    selectedModel: 'gpt-4o',
    availableModels: DEFAULT_MODELS,
  }
}

function saveSettings(settings: AISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AISettings>(loadSettings)

  // Persist settings to localStorage
  React.useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const setProvider = React.useCallback((provider: AIProvider) => {
    setSettings((s) => ({
      ...s,
      provider,
      selectedModel: provider.defaultModel || s.selectedModel,
    }))
  }, [])

  const setSelectedModel = React.useCallback((model: string) => {
    setSettings((s) => ({ ...s, selectedModel: model }))
  }, [])

  const setApiKey = React.useCallback((apiKey: string) => {
    setSettings((s) => {
      if (s.provider) {
        return {
          ...s,
          provider: { ...s.provider, apiKey },
        }
      }
      // Default to OpenAI if no provider set
      return {
        ...s,
        provider: {
          ...PROVIDER_PRESETS.openai,
          apiKey,
        },
      }
    })
  }, [])

  const clearSettings = React.useCallback(() => {
    setSettings({
      provider: null,
      selectedModel: 'gpt-4o',
      availableModels: DEFAULT_MODELS,
    })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = React.useMemo(
    () => ({
      ...settings,
      setProvider,
      setSelectedModel,
      setApiKey,
      clearSettings,
      isConfigured: !!settings.provider?.apiKey,
    }),
    [settings, setProvider, setSelectedModel, setApiKey, clearSettings]
  )

  // Rename to avoid conflict with imported AIProvider type
  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

// Export with different name to avoid confusion
export { AIProvider as AISettingsProvider }

export function useAISettings(): AIContextValue {
  const context = React.useContext(AIContext)
  if (!context) {
    throw new Error('useAISettings must be used within an AISettingsProvider')
  }
  return context
}

export { AIContext }
