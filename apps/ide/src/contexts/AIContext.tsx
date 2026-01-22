import * as React from 'react'
import {
  llmManager,
  type AnyProviderConfig,
  type ModelInfo,
  type CustomProviderConfig,
  fetchOllamaModels,
  DEFAULT_OLLAMA_URL,
} from '@/lib/ai'

const STORAGE_KEY = 'wiggum-ai-settings'

/**
 * Ollama Local settings
 */
interface OllamaLocalSettings {
  enabled: boolean
  baseUrl: string
  /** Discovered models from the local server */
  models: ModelInfo[]
  /** Last time models were refreshed */
  lastRefreshed?: number
}

/**
 * Ollama Cloud settings
 */
interface OllamaCloudSettings {
  enabled: boolean
  apiKey?: string
}

/**
 * Stored settings shape (persisted to localStorage)
 */
interface StoredSettings {
  /** API keys per provider (providerId -> apiKey) */
  apiKeys: Record<string, string>
  /** Selected model ID (format: providerId:modelId) */
  selectedModelId: string
  /** Custom providers added by user */
  customProviders: CustomProviderConfig[]
  /** Ollama Local settings */
  ollamaLocal: OllamaLocalSettings
  /** Ollama Cloud settings */
  ollamaCloud: OllamaCloudSettings
}

/**
 * Context value exposed to components
 */
interface AIContextValue {
  /** All available providers */
  providers: AnyProviderConfig[]
  /** Providers that are ready to use (have API key or don't need one) */
  availableProviders: AnyProviderConfig[]
  /** Currently selected model ID (providerId:modelId) */
  selectedModelId: string
  /** Currently selected provider ID */
  selectedProviderId: string
  /** Currently selected provider config */
  selectedProvider: AnyProviderConfig | undefined
  /** Currently selected model info */
  selectedModel: ModelInfo | undefined
  /** Get models for a specific provider */
  getModelsForProvider: (providerId: string) => ModelInfo[]
  /** Set API key for a provider */
  setApiKey: (providerId: string, apiKey: string) => void
  /** Get API key for a provider */
  getApiKey: (providerId: string) => string | undefined
  /** Set selected model */
  setSelectedModel: (modelId: string) => void
  /** Add a custom provider */
  addCustomProvider: (config: Omit<CustomProviderConfig, 'type' | 'enabled'>) => void
  /** Remove a custom provider */
  removeCustomProvider: (providerId: string) => void

  // Ollama Local
  /** Enable/disable Ollama Local */
  setOllamaLocalEnabled: (enabled: boolean) => void
  /** Set Ollama Local base URL */
  setOllamaLocalBaseUrl: (baseUrl: string) => void
  /** Refresh models from Ollama Local server */
  refreshOllamaLocalModels: () => Promise<ModelInfo[]>
  /** Ollama Local settings */
  ollamaLocalSettings: OllamaLocalSettings
  /** Whether Ollama Local is checking/refreshing models */
  isRefreshingOllamaLocal: boolean

  // Ollama Cloud
  /** Enable/disable Ollama Cloud */
  setOllamaCloudEnabled: (enabled: boolean) => void
  /** Set Ollama Cloud API key */
  setOllamaCloudApiKey: (apiKey: string) => void
  /** Ollama Cloud settings */
  ollamaCloudSettings: OllamaCloudSettings

  /** Whether at least one provider is configured and ready */
  isConfigured: boolean
  /** Clear all settings */
  clearSettings: () => void
  /** Refresh provider list */
  refresh: () => void
}

const AIContext = React.createContext<AIContextValue | null>(null)

const DEFAULT_SETTINGS: StoredSettings = {
  apiKeys: {},
  selectedModelId: 'openai:gpt-4o',
  customProviders: [],
  ollamaLocal: {
    enabled: false,
    baseUrl: DEFAULT_OLLAMA_URL,
    models: [],
  },
  ollamaCloud: {
    enabled: false,
  },
}

function loadSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ollamaLocal: { ...DEFAULT_SETTINGS.ollamaLocal, ...parsed.ollamaLocal },
        ollamaCloud: { ...DEFAULT_SETTINGS.ollamaCloud, ...parsed.ollamaCloud },
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<StoredSettings>(loadSettings)
  const [providers, setProviders] = React.useState<AnyProviderConfig[]>([])
  const [isRefreshingOllamaLocal, setIsRefreshingOllamaLocal] = React.useState(false)

  // Initialize and sync with llmManager
  React.useEffect(() => {
    // Apply stored API keys to llmManager
    for (const [providerId, apiKey] of Object.entries(settings.apiKeys)) {
      try {
        llmManager.setApiKey(providerId, apiKey)
      } catch {
        // Provider may not exist yet
      }
    }

    // Register custom providers
    for (const customProvider of settings.customProviders) {
      try {
        llmManager.registerProvider(customProvider)
      } catch {
        // May already exist
      }
    }

    // Set up Ollama Local if enabled
    if (settings.ollamaLocal.enabled) {
      llmManager.registerOllamaLocal(settings.ollamaLocal.baseUrl, settings.ollamaLocal.models)
    }

    // Set up Ollama Cloud if enabled and has API key
    if (settings.ollamaCloud.enabled && settings.ollamaCloud.apiKey) {
      llmManager.registerOllamaCloud(settings.ollamaCloud.apiKey)
    }

    // Set selected model
    if (settings.selectedModelId) {
      try {
        llmManager.setSelectedModel(settings.selectedModelId)
      } catch {
        // Model may not be available
      }
    }

    // Update providers list
    setProviders(llmManager.listProviders())
  }, [])

  // Persist settings to localStorage
  React.useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const refresh = React.useCallback(() => {
    setProviders(llmManager.listProviders())
  }, [])

  const setApiKey = React.useCallback((providerId: string, apiKey: string) => {
    llmManager.setApiKey(providerId, apiKey)
    setSettings((s) => ({
      ...s,
      apiKeys: { ...s.apiKeys, [providerId]: apiKey },
    }))
    setProviders(llmManager.listProviders())
  }, [])

  const getApiKey = React.useCallback(
    (providerId: string) => settings.apiKeys[providerId],
    [settings.apiKeys]
  )

  const setSelectedModel = React.useCallback((modelId: string) => {
    llmManager.setSelectedModel(modelId)
    setSettings((s) => ({ ...s, selectedModelId: modelId }))
  }, [])

  const getModelsForProvider = React.useCallback((providerId: string) => {
    try {
      return llmManager.listModelsForProvider(providerId)
    } catch {
      return []
    }
  }, [])

  const addCustomProvider = React.useCallback(
    (config: Omit<CustomProviderConfig, 'type' | 'enabled'>) => {
      const fullConfig: CustomProviderConfig = {
        ...config,
        type: 'custom',
        enabled: true,
      }
      llmManager.registerProvider(fullConfig)
      setSettings((s) => ({
        ...s,
        customProviders: [...s.customProviders, fullConfig],
      }))
      setProviders(llmManager.listProviders())
    },
    []
  )

  const removeCustomProvider = React.useCallback((providerId: string) => {
    llmManager.getRegistry().unregisterProvider(providerId)
    setSettings((s) => ({
      ...s,
      customProviders: s.customProviders.filter((p) => p.id !== providerId),
    }))
    setProviders(llmManager.listProviders())
  }, [])

  // Ollama Local functions
  const setOllamaLocalEnabled = React.useCallback((enabled: boolean) => {
    if (enabled) {
      setSettings((s) => {
        llmManager.registerOllamaLocal(s.ollamaLocal.baseUrl, s.ollamaLocal.models)
        return { ...s, ollamaLocal: { ...s.ollamaLocal, enabled: true } }
      })
    } else {
      llmManager.getRegistry().unregisterProvider('ollama-local')
      setSettings((s) => ({ ...s, ollamaLocal: { ...s.ollamaLocal, enabled: false } }))
    }
    setProviders(llmManager.listProviders())
  }, [])

  const setOllamaLocalBaseUrl = React.useCallback((baseUrl: string) => {
    setSettings((s) => {
      const newOllamaLocal = { ...s.ollamaLocal, baseUrl }
      if (s.ollamaLocal.enabled) {
        llmManager.setOllamaLocalBaseUrl(baseUrl)
      }
      return { ...s, ollamaLocal: newOllamaLocal }
    })
    setProviders(llmManager.listProviders())
  }, [])

  const refreshOllamaLocalModels = React.useCallback(async (): Promise<ModelInfo[]> => {
    setIsRefreshingOllamaLocal(true)
    try {
      const models = await fetchOllamaModels(settings.ollamaLocal.baseUrl, 'ollama-local')

      setSettings((s) => {
        const newOllamaLocal = {
          ...s.ollamaLocal,
          models,
          lastRefreshed: Date.now(),
        }

        // If enabled, update the provider with new models
        if (s.ollamaLocal.enabled) {
          llmManager.getRegistry().updateProvider('ollama-local', { models })
        }

        return { ...s, ollamaLocal: newOllamaLocal }
      })

      setProviders(llmManager.listProviders())
      return models
    } finally {
      setIsRefreshingOllamaLocal(false)
    }
  }, [settings.ollamaLocal.baseUrl])

  // Ollama Cloud functions
  const setOllamaCloudEnabled = React.useCallback((enabled: boolean) => {
    if (enabled) {
      setSettings((s) => {
        if (s.ollamaCloud.apiKey) {
          llmManager.registerOllamaCloud(s.ollamaCloud.apiKey)
        }
        return { ...s, ollamaCloud: { ...s.ollamaCloud, enabled: true } }
      })
    } else {
      llmManager.getRegistry().unregisterProvider('ollama-cloud')
      setSettings((s) => ({ ...s, ollamaCloud: { ...s.ollamaCloud, enabled: false } }))
    }
    setProviders(llmManager.listProviders())
  }, [])

  const setOllamaCloudApiKey = React.useCallback((apiKey: string) => {
    setSettings((s) => {
      const newOllamaCloud = { ...s.ollamaCloud, apiKey }
      if (s.ollamaCloud.enabled && apiKey) {
        llmManager.setOllamaCloudApiKey(apiKey)
      }
      return { ...s, ollamaCloud: newOllamaCloud }
    })
    setProviders(llmManager.listProviders())
  }, [])

  const clearSettings = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
    // Re-initialize llmManager
    window.location.reload()
  }, [])

  const availableProviders = React.useMemo(
    () => providers.filter((p) => llmManager.isProviderReady(p.id)),
    [providers]
  )

  const isConfigured = React.useMemo(() => availableProviders.length > 0, [availableProviders])

  // Parse selected model ID to get provider ID and model name
  const [selectedProviderId, selectedModelName] = React.useMemo(() => {
    const idx = settings.selectedModelId.indexOf(':')
    if (idx === -1) return ['', settings.selectedModelId]
    return [settings.selectedModelId.slice(0, idx), settings.selectedModelId.slice(idx + 1)]
  }, [settings.selectedModelId])

  // Get the currently selected provider config
  const selectedProvider = React.useMemo(
    () => providers.find((p) => p.id === selectedProviderId),
    [providers, selectedProviderId]
  )

  // Get the currently selected model info
  const selectedModel = React.useMemo(() => {
    if (!selectedProviderId) return undefined
    try {
      const models = llmManager.listModelsForProvider(selectedProviderId)
      return models.find((m) => m.id === selectedModelName)
    } catch {
      return undefined
    }
  }, [selectedProviderId, selectedModelName])

  const value = React.useMemo(
    () => ({
      providers,
      availableProviders,
      selectedModelId: settings.selectedModelId,
      selectedProviderId,
      selectedProvider,
      selectedModel,
      getModelsForProvider,
      setApiKey,
      getApiKey,
      setSelectedModel,
      addCustomProvider,
      removeCustomProvider,
      setOllamaLocalEnabled,
      setOllamaLocalBaseUrl,
      refreshOllamaLocalModels,
      ollamaLocalSettings: settings.ollamaLocal,
      isRefreshingOllamaLocal,
      setOllamaCloudEnabled,
      setOllamaCloudApiKey,
      ollamaCloudSettings: settings.ollamaCloud,
      isConfigured,
      clearSettings,
      refresh,
    }),
    [
      providers,
      availableProviders,
      settings.selectedModelId,
      selectedProviderId,
      selectedProvider,
      selectedModel,
      settings.ollamaLocal,
      settings.ollamaCloud,
      getModelsForProvider,
      setApiKey,
      getApiKey,
      setSelectedModel,
      addCustomProvider,
      removeCustomProvider,
      setOllamaLocalEnabled,
      setOllamaLocalBaseUrl,
      refreshOllamaLocalModels,
      isRefreshingOllamaLocal,
      setOllamaCloudEnabled,
      setOllamaCloudApiKey,
      isConfigured,
      clearSettings,
      refresh,
    ]
  )

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

// Backwards compatibility alias
export { AIProvider as AISettingsProvider }

export function useAISettings(): AIContextValue {
  const context = React.useContext(AIContext)
  if (!context) {
    throw new Error('useAISettings must be used within an AISettingsProvider')
  }
  return context
}

export { AIContext }
