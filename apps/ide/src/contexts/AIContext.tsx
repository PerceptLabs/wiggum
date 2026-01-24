import * as React from 'react'
import {
  createProvider,
  fetchOllamaModels,
  fetchOpenAICompatibleModels,
  detectLocalProviders,
  getDefaultModel,
  type LLMProvider,
  type ProviderPreset,
  type LocalProviderStatus,
} from '@/lib/llm'

const STORAGE_KEY = 'wiggum-ai-settings'

/**
 * Provider option with metadata
 */
interface ProviderOption {
  id: ProviderPreset
  name: string
  needsApiKey: boolean
  isLocal: boolean
}

/**
 * Available provider presets
 */
const PROVIDER_OPTIONS: ProviderOption[] = [
  { id: 'openai', name: 'OpenAI', needsApiKey: true, isLocal: false },
  { id: 'anthropic', name: 'Anthropic', needsApiKey: true, isLocal: false },
  { id: 'ollama', name: 'Ollama (Local)', needsApiKey: false, isLocal: true },
  { id: 'lmstudio', name: 'LM Studio (Local)', needsApiKey: false, isLocal: true },
  { id: 'custom', name: 'Custom Endpoint', needsApiKey: false, isLocal: false },
]

/**
 * Static model options for cloud providers
 */
const STATIC_MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
}

/**
 * Stored settings shape
 */
interface StoredSettings {
  apiKeys: Record<string, string>
  selectedProvider: ProviderPreset
  selectedModel: string
  customEndpoints: Record<string, string> // provider -> baseUrl
}

/**
 * Context value
 */
interface AIContextValue {
  /** Available provider options */
  providerOptions: ProviderOption[]
  /** Get models for a provider */
  getModelsForProvider: (providerId: string) => string[]
  /** Selected provider ID */
  selectedProvider: ProviderPreset
  /** Selected model name */
  selectedModel: string
  /** Full model ID (provider:model) */
  selectedModelId: string
  /** Set selected provider */
  setSelectedProvider: (providerId: ProviderPreset) => void
  /** Set selected model */
  setSelectedModel: (modelName: string) => void
  /** Set API key for a provider */
  setApiKey: (providerId: string, apiKey: string) => void
  /** Get API key for a provider */
  getApiKey: (providerId: string) => string | undefined
  /** Set custom endpoint URL for a provider */
  setCustomEndpoint: (providerId: string, baseUrl: string) => void
  /** Get custom endpoint URL for a provider */
  getCustomEndpoint: (providerId: string) => string | undefined
  /** Whether current provider is configured (has API key if needed) */
  isConfigured: boolean
  /** Get the current LLMProvider for making requests */
  getProvider: () => LLMProvider | null
  /** Clear all settings */
  clearSettings: () => void
  /** Local provider status from auto-detect */
  localProviderStatus: LocalProviderStatus[]
  /** Refresh local provider detection */
  refreshLocalProviders: () => Promise<void>
  /** Whether local provider detection is in progress */
  isDetectingProviders: boolean
  /** Dynamic models fetched from local providers */
  dynamicModels: Record<string, string[]>
  /** Refresh models for a specific provider */
  refreshModelsForProvider: (providerId: string) => Promise<void>
}

const AIContext = React.createContext<AIContextValue | null>(null)

const DEFAULT_SETTINGS: StoredSettings = {
  apiKeys: {},
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  customEndpoints: {},
}

function loadSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Ensure these are objects even if stored data is corrupted
        apiKeys: parsed.apiKeys && typeof parsed.apiKeys === 'object' ? parsed.apiKeys : {},
        customEndpoints: parsed.customEndpoints && typeof parsed.customEndpoints === 'object' ? parsed.customEndpoints : {},
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore
  }
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<StoredSettings>(loadSettings)
  const [localProviderStatus, setLocalProviderStatus] = React.useState<LocalProviderStatus[]>([])
  const [isDetectingProviders, setIsDetectingProviders] = React.useState(false)
  const [dynamicModels, setDynamicModels] = React.useState<Record<string, string[]>>({})

  // Persist settings
  React.useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Auto-detect local providers on mount
  const refreshLocalProviders = React.useCallback(async () => {
    setIsDetectingProviders(true)
    try {
      const status = await detectLocalProviders()
      setLocalProviderStatus(status)

      // Update dynamic models from detected providers
      const newDynamicModels: Record<string, string[]> = {}
      for (const provider of status) {
        if (provider.available && provider.models.length > 0) {
          newDynamicModels[provider.preset] = provider.models
        }
      }
      setDynamicModels((prev) => ({ ...prev, ...newDynamicModels }))
    } catch (error) {
      console.warn('Failed to detect local providers:', error)
    } finally {
      setIsDetectingProviders(false)
    }
  }, [])

  // Run auto-detect on mount
  React.useEffect(() => {
    refreshLocalProviders()
  }, [refreshLocalProviders])

  // Refresh models for a specific provider
  const refreshModelsForProvider = React.useCallback(async (providerId: string) => {
    try {
      let models: string[] = []

      if (providerId === 'ollama') {
        const customUrl = settings.customEndpoints[providerId]
        models = await fetchOllamaModels(customUrl || undefined)
      } else if (providerId === 'lmstudio' || providerId === 'custom') {
        const customUrl = settings.customEndpoints[providerId]
        if (customUrl) {
          models = await fetchOpenAICompatibleModels(customUrl)
        } else if (providerId === 'lmstudio') {
          models = await fetchOpenAICompatibleModels('http://localhost:1234/v1')
        }
      }

      if (models.length > 0) {
        setDynamicModels((prev) => ({ ...prev, [providerId]: models }))
      }
    } catch (error) {
      console.warn(`Failed to refresh models for ${providerId}:`, error)
    }
  }, [settings.customEndpoints])

  const getModelsForProvider = React.useCallback(
    (providerId: string) => {
      // First check dynamic models (from local providers)
      const dynamic = dynamicModels[providerId]
      if (Array.isArray(dynamic) && dynamic.length > 0) {
        return dynamic
      }

      // Fall back to static model options
      const staticModels = STATIC_MODEL_OPTIONS[providerId]
      if (Array.isArray(staticModels)) {
        return staticModels
      }

      // Return empty array if nothing found
      return []
    },
    [dynamicModels]
  )

  const setSelectedProvider = React.useCallback((providerId: ProviderPreset) => {
    setSettings((s) => {
      // Get first available model for this provider
      const dynamic = dynamicModels[providerId]
      const staticModels = STATIC_MODEL_OPTIONS[providerId]
      const availableModels = (Array.isArray(dynamic) && dynamic.length > 0)
        ? dynamic
        : (Array.isArray(staticModels) ? staticModels : [])

      const newModel = availableModels[0] || getDefaultModel(providerId)

      return {
        ...s,
        selectedProvider: providerId,
        selectedModel: newModel,
      }
    })
  }, [dynamicModels])

  const setSelectedModel = React.useCallback((modelName: string) => {
    setSettings((s) => ({ ...s, selectedModel: modelName }))
  }, [])

  const setApiKey = React.useCallback((providerId: string, apiKey: string) => {
    setSettings((s) => ({
      ...s,
      apiKeys: { ...s.apiKeys, [providerId]: apiKey },
    }))
  }, [])

  const getApiKey = React.useCallback(
    (providerId: string) => settings.apiKeys[providerId],
    [settings.apiKeys]
  )

  const setCustomEndpoint = React.useCallback((providerId: string, baseUrl: string) => {
    setSettings((s) => ({
      ...s,
      customEndpoints: { ...s.customEndpoints, [providerId]: baseUrl },
    }))
  }, [])

  const getCustomEndpoint = React.useCallback(
    (providerId: string) => settings.customEndpoints[providerId],
    [settings.customEndpoints]
  )

  const isConfigured = React.useMemo(() => {
    const provider = PROVIDER_OPTIONS.find((p) => p.id === settings.selectedProvider)
    if (!provider) return false

    // Cloud providers need API keys
    if (provider.needsApiKey) {
      return !!settings.apiKeys[settings.selectedProvider]
    }

    // Local providers need to be detected as available OR have a custom endpoint
    if (provider.isLocal) {
      const status = localProviderStatus.find((s) => s.preset === settings.selectedProvider)
      if (status?.available) return true
      // Check if custom endpoint is set
      if (settings.customEndpoints[settings.selectedProvider]) return true
      return false
    }

    // Custom endpoint needs a URL configured
    if (settings.selectedProvider === 'custom') {
      return !!settings.customEndpoints.custom
    }

    return false
  }, [settings, localProviderStatus])

  const getProvider = React.useCallback((): LLMProvider | null => {
    if (!isConfigured) return null

    const apiKey = settings.apiKeys[settings.selectedProvider]
    const customUrl = settings.customEndpoints[settings.selectedProvider]

    return createProvider(settings.selectedProvider, {
      apiKey,
      model: settings.selectedModel,
      baseUrl: customUrl,
    })
  }, [isConfigured, settings])

  const clearSettings = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = React.useMemo(
    () => ({
      providerOptions: PROVIDER_OPTIONS,
      getModelsForProvider,
      selectedProvider: settings.selectedProvider,
      selectedModel: settings.selectedModel,
      selectedModelId: `${settings.selectedProvider}:${settings.selectedModel}`,
      setSelectedProvider,
      setSelectedModel,
      setApiKey,
      getApiKey,
      setCustomEndpoint,
      getCustomEndpoint,
      isConfigured,
      getProvider,
      clearSettings,
      localProviderStatus,
      refreshLocalProviders,
      isDetectingProviders,
      dynamicModels,
      refreshModelsForProvider,
    }),
    [
      settings,
      getModelsForProvider,
      setSelectedProvider,
      setSelectedModel,
      setApiKey,
      getApiKey,
      setCustomEndpoint,
      getCustomEndpoint,
      isConfigured,
      getProvider,
      clearSettings,
      localProviderStatus,
      refreshLocalProviders,
      isDetectingProviders,
      dynamicModels,
      refreshModelsForProvider,
    ]
  )

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

// Backwards compatibility alias
export { AIProvider as AISettingsProvider }

export function useAISettings(): AIContextValue {
  const context = React.useContext(AIContext)
  if (!context) {
    throw new Error('useAISettings must be used within an AIProvider')
  }
  return context
}

export { AIContext }
