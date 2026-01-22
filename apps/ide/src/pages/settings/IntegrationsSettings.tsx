import * as React from 'react'
import {
  Bot,
  GitBranch,
  Key,
  Check,
  X,
  Plus,
  Trash2,
  Server,
  Cloud,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Input,
  Badge,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  cn,
} from '@wiggum/stack'
import { useAISettings } from '@/contexts'
import { CUSTOM_PROVIDER_PRESETS, type ModelInfo } from '@/lib/ai'

export function IntegrationsSettings() {
  const {
    providers,
    availableProviders,
    selectedModelId,
    getModelsForProvider,
    setApiKey,
    getApiKey,
    setSelectedModel,
    addCustomProvider,
    removeCustomProvider,
    // Ollama Local
    setOllamaLocalEnabled,
    setOllamaLocalBaseUrl,
    refreshOllamaLocalModels,
    ollamaLocalSettings,
    isRefreshingOllamaLocal,
    // Ollama Cloud
    setOllamaCloudEnabled,
    setOllamaCloudApiKey,
    ollamaCloudSettings,
    isConfigured,
  } = useAISettings()

  const [editingProvider, setEditingProvider] = React.useState<string | null>(null)
  const [tempApiKey, setTempApiKey] = React.useState('')
  const [showAddCustom, setShowAddCustom] = React.useState(false)
  const [customName, setCustomName] = React.useState('')
  const [customBaseUrl, setCustomBaseUrl] = React.useState('')
  const [customApiKey, setCustomApiKey] = React.useState('')
  const [gitUsername, setGitUsername] = React.useState('')
  const [gitEmail, setGitEmail] = React.useState('')

  // Parse selected model
  const [selectedProviderId, selectedModelName] = React.useMemo(() => {
    const idx = selectedModelId.indexOf(':')
    if (idx === -1) return ['', selectedModelId]
    return [selectedModelId.slice(0, idx), selectedModelId.slice(idx + 1)]
  }, [selectedModelId])

  // Get models for selected provider
  const modelsForSelectedProvider = React.useMemo(() => {
    if (!selectedProviderId) return []
    return getModelsForProvider(selectedProviderId)
  }, [selectedProviderId, getModelsForProvider])

  // Official providers (OpenAI, Anthropic, Google)
  const officialProviders = providers.filter((p) => p.type === 'official')

  // Custom providers
  const customProviders = providers.filter((p) => p.type === 'custom')

  const handleSaveApiKey = (providerId: string) => {
    if (tempApiKey.trim()) {
      setApiKey(providerId, tempApiKey.trim())
      setTempApiKey('')
      setEditingProvider(null)
    }
  }

  const handleAddCustomProvider = () => {
    if (customName && customBaseUrl) {
      const id = customName.toLowerCase().replace(/\s+/g, '-')
      addCustomProvider({
        id,
        name: customName,
        baseUrl: customBaseUrl,
        apiKey: customApiKey || undefined,
        models: [],
      })
      setCustomName('')
      setCustomBaseUrl('')
      setCustomApiKey('')
      setShowAddCustom(false)
    }
  }

  const handleAddFromPreset = (presetId: string) => {
    const preset = CUSTOM_PROVIDER_PRESETS[presetId as keyof typeof CUSTOM_PROVIDER_PRESETS]
    if (preset) {
      addCustomProvider({
        id: preset.id,
        name: preset.name,
        baseUrl: preset.baseUrl,
        models: preset.models as ModelInfo[],
        defaultModelId: preset.defaultModelId,
      })
    }
  }

  const handleRefreshOllamaModels = async () => {
    await refreshOllamaLocalModels()
  }

  // Format last refreshed time
  const lastRefreshedText = React.useMemo(() => {
    if (!ollamaLocalSettings.lastRefreshed) return null
    const date = new Date(ollamaLocalSettings.lastRefreshed)
    return date.toLocaleTimeString()
  }, [ollamaLocalSettings.lastRefreshed])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide">Integrations</h2>
        <p className="mt-1 text-muted-foreground">Configure AI providers and version control</p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Active Model</CardTitle>
              <CardDescription>Select which AI model to use</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wide">Status:</span>
            {isConfigured ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                Ready
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <X className="h-3 w-3" />
                No Provider Configured
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide">Provider</Label>
              <Select
                value={selectedProviderId}
                onValueChange={(providerId) => {
                  const models = getModelsForProvider(providerId)
                  const defaultModel = models[0]?.id || ''
                  if (defaultModel) {
                    setSelectedModel(`${providerId}:${defaultModel}`)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide">Model</Label>
              <Select
                value={selectedModelName}
                onValueChange={(modelName) => {
                  setSelectedModel(`${selectedProviderId}:${modelName}`)
                }}
                disabled={!selectedProviderId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsForSelectedProvider.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Cloud Providers</CardTitle>
              <CardDescription>OpenAI, Anthropic, and Google AI</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {officialProviders.map((provider) => {
            const hasKey = !!getApiKey(provider.id)
            const isEditing = editingProvider === provider.id

            return (
              <div
                key={provider.id}
                className={cn(
                  'border-2 border-border p-4',
                  'transition-all duration-150',
                  hasKey && 'border-green-500/50 bg-green-500/5'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{provider.name}</span>
                    {hasKey ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not configured</Badge>
                    )}
                  </div>
                  {hasKey && !isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProvider(provider.id)
                        setTempApiKey('')
                      }}
                    >
                      Update Key
                    </Button>
                  ) : null}
                </div>

                {(isEditing || !hasKey) && (
                  <div className="mt-4 flex gap-2">
                    <Input
                      type="password"
                      placeholder={`${provider.name} API Key`}
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      className="flex-1 font-mono"
                    />
                    <Button
                      onClick={() => handleSaveApiKey(provider.id)}
                      disabled={!tempApiKey.trim()}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    {isEditing && (
                      <Button variant="outline" onClick={() => setEditingProvider(null)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Ollama Local */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Ollama Local</CardTitle>
                <CardDescription>Run models on your local machine</CardDescription>
              </div>
            </div>
            <Switch
              checked={ollamaLocalSettings.enabled}
              onCheckedChange={setOllamaLocalEnabled}
            />
          </div>
        </CardHeader>
        {ollamaLocalSettings.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide">Base URL</Label>
              <Input
                placeholder="http://localhost:11434"
                value={ollamaLocalSettings.baseUrl}
                onChange={(e) => setOllamaLocalBaseUrl(e.target.value)}
              />
            </div>

            {/* Models Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold uppercase tracking-wide">
                  Discovered Models
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshOllamaModels}
                  disabled={isRefreshingOllamaLocal}
                >
                  {isRefreshingOllamaLocal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Models
                </Button>
              </div>

              {lastRefreshedText && (
                <p className="text-xs text-muted-foreground">
                  Last refreshed: {lastRefreshedText}
                </p>
              )}

              {ollamaLocalSettings.models.length > 0 ? (
                <div className="grid gap-2">
                  {ollamaLocalSettings.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between border-2 border-border p-2"
                    >
                      <div>
                        <span className="font-medium">{model.label}</span>
                        {model.description && (
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-border p-4 text-center text-muted-foreground">
                  <p>No models found</p>
                  <p className="text-xs">
                    Make sure Ollama is running and click "Refresh Models"
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ollama Cloud */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Ollama Cloud</CardTitle>
                <CardDescription>Access cloud-hosted Ollama models</CardDescription>
              </div>
            </div>
            <Switch
              checked={ollamaCloudSettings.enabled}
              onCheckedChange={setOllamaCloudEnabled}
            />
          </div>
        </CardHeader>
        {ollamaCloudSettings.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide">API Key</Label>
              <p className="text-xs text-muted-foreground">
                Required for Ollama Cloud access
              </p>
              <Input
                type="password"
                placeholder="Ollama API key"
                value={ollamaCloudSettings.apiKey || ''}
                onChange={(e) => setOllamaCloudApiKey(e.target.value)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Custom Providers</CardTitle>
                <CardDescription>OpenAI-compatible endpoints</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Add Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wide">Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CUSTOM_PROVIDER_PRESETS)
                .filter(([id]) => !providers.some((p) => p.id === id))
                .map(([id, preset]) => (
                  <Button
                    key={id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddFromPreset(id)}
                  >
                    {preset.name}
                  </Button>
                ))}
            </div>
          </div>

          {/* Custom Providers List */}
          {customProviders.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide">Configured</Label>
              {customProviders.map((provider) => {
                const hasKey = !!getApiKey(provider.id)
                return (
                  <div
                    key={provider.id}
                    className={cn(
                      'flex items-center justify-between border-2 border-border p-3',
                      hasKey && 'border-green-500/50 bg-green-500/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{provider.name}</span>
                      {hasKey ? (
                        <Badge variant="success">Connected</Badge>
                      ) : (
                        <Badge variant="outline">No API key</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!hasKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProvider(provider.id)
                            setTempApiKey('')
                          }}
                        >
                          Add Key
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomProvider(provider.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Custom Provider Dialog */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Provider</DialogTitle>
            <DialogDescription>Add any OpenAI-compatible API endpoint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="My Provider"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                placeholder="https://api.example.com/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key (optional)</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCustom(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomProvider} disabled={!customName || !customBaseUrl}>
                Add Provider
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Git Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Git</CardTitle>
              <CardDescription>Configure version control settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wide">Username</Label>
            <Input
              placeholder="Your name"
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wide">Email</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={gitEmail}
              onChange={(e) => setGitEmail(e.target.value)}
            />
          </div>
          <Button disabled={!gitUsername || !gitEmail}>Save Git Config</Button>
        </CardContent>
      </Card>
    </div>
  )
}
