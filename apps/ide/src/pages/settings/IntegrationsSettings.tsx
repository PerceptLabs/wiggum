import * as React from 'react'
import { Bot, GitBranch, Key, Check, X, RefreshCw, Loader2, Globe, Server } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@wiggum/stack'
import { useAISettings } from '@/contexts'
import type { ProviderPreset } from '@/lib/llm'

export function IntegrationsSettings() {
  const {
    providerOptions,
    getModelsForProvider,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    setApiKey,
    getApiKey,
    setCustomEndpoint,
    getCustomEndpoint,
    isConfigured,
    localProviderStatus,
    refreshLocalProviders,
    isDetectingProviders,
    refreshModelsForProvider,
  } = useAISettings()

  const [editingProvider, setEditingProvider] = React.useState<string | null>(null)
  const [tempApiKey, setTempApiKey] = React.useState('')
  const [tempEndpoint, setTempEndpoint] = React.useState('')
  const [gitUsername, setGitUsername] = React.useState('')
  const [gitEmail, setGitEmail] = React.useState('')
  const [refreshingModels, setRefreshingModels] = React.useState<string | null>(null)

  // Get models for selected provider
  const modelsForSelectedProvider = React.useMemo(() => {
    return getModelsForProvider(selectedProvider)
  }, [selectedProvider, getModelsForProvider])

  const handleSaveApiKey = (providerId: string) => {
    if (tempApiKey.trim()) {
      setApiKey(providerId, tempApiKey.trim())
      setTempApiKey('')
      setEditingProvider(null)
    }
  }

  const handleSaveEndpoint = (providerId: string) => {
    if (tempEndpoint.trim()) {
      setCustomEndpoint(providerId, tempEndpoint.trim())
      setTempEndpoint('')
      setEditingProvider(null)
      // Refresh models for this provider after setting endpoint
      refreshModelsForProvider(providerId)
    }
  }

  const handleRefreshModels = async (providerId: string) => {
    setRefreshingModels(providerId)
    await refreshModelsForProvider(providerId)
    setRefreshingModels(null)
  }

  // Get local provider status
  const getLocalStatus = (providerId: string) => {
    return localProviderStatus.find((s) => s.preset === providerId)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Integrations</h2>
        <p className="mt-1 text-muted-foreground">Configure AI providers and version control</p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-primary [box-shadow:var(--shadow-sm)]">
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
            <span className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Status:</span>
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
              <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(providerId) => {
                  setSelectedProvider(providerId as ProviderPreset)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => {
                    const localStatus = getLocalStatus(p.id)
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.name}
                          {localStatus?.available && (
                            <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
                          )}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Model</Label>
                {providerOptions.find((p) => p.id === selectedProvider)?.isLocal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleRefreshModels(selectedProvider)}
                    disabled={refreshingModels === selectedProvider}
                  >
                    {refreshingModels === selectedProvider ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <Select
                value={selectedModel}
                onValueChange={(modelName) => {
                  setSelectedModel(modelName)
                }}
                disabled={!selectedProvider || modelsForSelectedProvider.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelsForSelectedProvider.length === 0 ? 'No models found' : 'Select model'} />
                </SelectTrigger>
                <SelectContent>
                  {modelsForSelectedProvider.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Configure API keys for cloud providers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerOptions
            .filter((provider) => provider.needsApiKey)
            .map((provider) => {
              const hasKey = !!getApiKey(provider.id)
              const isEditing = editingProvider === provider.id

              return (
                <div
                  key={provider.id}
                  className={cn(
                    'border-[length:var(--border-width,1px)] border-border p-4',
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

      {/* Local Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Local Providers</CardTitle>
                <CardDescription>Ollama, LM Studio, and other local servers</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLocalProviders}
              disabled={isDetectingProviders}
              className="gap-2"
            >
              {isDetectingProviders ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Detect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerOptions
            .filter((provider) => provider.isLocal)
            .map((provider) => {
              const localStatus = getLocalStatus(provider.id)
              const customEndpoint = getCustomEndpoint(provider.id)
              const isEditing = editingProvider === `endpoint-${provider.id}`

              return (
                <div
                  key={provider.id}
                  className={cn(
                    'border-[length:var(--border-width,1px)] border-border p-4',
                    'transition-all duration-150',
                    localStatus?.available && 'border-green-500/50 bg-green-500/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{provider.name}</span>
                      {localStatus?.available ? (
                        <Badge variant="success" className="gap-1">
                          <Check className="h-3 w-3" />
                          Running
                        </Badge>
                      ) : customEndpoint ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Custom URL
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not detected</Badge>
                      )}
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(`endpoint-${provider.id}`)
                          setTempEndpoint(customEndpoint || localStatus?.baseUrl || '')
                        }}
                      >
                        {customEndpoint ? 'Edit URL' : 'Set URL'}
                      </Button>
                    )}
                  </div>

                  {/* Show current endpoint */}
                  {(localStatus?.baseUrl || customEndpoint) && !isEditing && (
                    <p className="mt-2 text-sm text-muted-foreground font-mono">
                      {customEndpoint || localStatus?.baseUrl}
                    </p>
                  )}

                  {/* Show models count */}
                  {localStatus?.available && localStatus.models.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {localStatus.models.length} models available
                    </p>
                  )}

                  {/* Editing endpoint */}
                  {isEditing && (
                    <div className="mt-4 flex gap-2">
                      <Input
                        type="text"
                        placeholder={provider.id === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1'}
                        value={tempEndpoint}
                        onChange={(e) => setTempEndpoint(e.target.value)}
                        className="flex-1 font-mono"
                      />
                      <Button
                        onClick={() => handleSaveEndpoint(provider.id)}
                        disabled={!tempEndpoint.trim()}
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProvider(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Help text */}
                  {!localStatus?.available && !customEndpoint && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {provider.id === 'ollama'
                        ? 'Start Ollama locally or set a custom URL.'
                        : 'Start LM Studio locally or set a custom URL.'}
                    </p>
                  )}
                </div>
              )
            })}
        </CardContent>
      </Card>

      {/* Custom Endpoint */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Custom Endpoint</CardTitle>
              <CardDescription>Connect to any OpenAI-compatible API</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const customEndpoint = getCustomEndpoint('custom')
            const customApiKey = getApiKey('custom')
            const isEditingUrl = editingProvider === 'endpoint-custom'
            const isEditingKey = editingProvider === 'apikey-custom'

            return (
              <div className={cn(
                'border-[length:var(--border-width,1px)] border-border p-4',
                'transition-all duration-150',
                customEndpoint && 'border-blue-500/50 bg-blue-500/5'
              )}>
                <div className="space-y-4">
                  {/* Endpoint URL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Endpoint URL</Label>
                      {customEndpoint && !isEditingUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProvider('endpoint-custom')
                            setTempEndpoint(customEndpoint)
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                    {isEditingUrl || !customEndpoint ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="https://api.example.com/v1"
                          value={isEditingUrl ? tempEndpoint : ''}
                          onChange={(e) => setTempEndpoint(e.target.value)}
                          className="flex-1 font-mono"
                        />
                        <Button
                          onClick={() => handleSaveEndpoint('custom')}
                          disabled={!tempEndpoint.trim()}
                        >
                          Save
                        </Button>
                        {isEditingUrl && (
                          <Button variant="outline" onClick={() => setEditingProvider(null)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground font-mono">{customEndpoint}</p>
                    )}
                  </div>

                  {/* API Key (optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">API Key (Optional)</Label>
                      {customApiKey && !isEditingKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProvider('apikey-custom')
                            setTempApiKey('')
                          }}
                        >
                          Update
                        </Button>
                      )}
                    </div>
                    {isEditingKey || !customApiKey ? (
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="API key (if required)"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          className="flex-1 font-mono"
                        />
                        <Button
                          onClick={() => {
                            if (tempApiKey.trim()) {
                              setApiKey('custom', tempApiKey.trim())
                            }
                            setTempApiKey('')
                            setEditingProvider(null)
                          }}
                        >
                          Save
                        </Button>
                        {isEditingKey && (
                          <Button variant="outline" onClick={() => setEditingProvider(null)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground font-mono">••••••••</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Git Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
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
            <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Username</Label>
            <Input
              placeholder="Your name"
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Email</Label>
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
