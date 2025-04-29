import React, { useState, useId, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { CheckCircle2, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // Optionally pass settings to other components
  setGlobalSettings: (settings: any) => void;
}

// Remove static allModels array, keep for fallback only
const allModels = [
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "text-davinci-003",
  "text-ada-001",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-2.1",
  "claude-2.0",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it"
];

interface ProviderSettings {
  apiKey: string;
  base_url: string; // Added field
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  contextSize: number;
}

// Add interface for runtime settings
interface RuntimeSettings {
  enableOperationsVisibility: boolean;
}

// Add interface for env vars
interface EnvVariable {
  key: string;
  value: string;
}

export default function SettingsModal({ isOpen, setIsOpen, setGlobalSettings }: SettingsModalProps) {
  // Create a stable session ID that changes each time the modal opens
  const sessionId = useMemo(() => `llm-settings-${Date.now()}`, [isOpen]);
  const uniqueId = useId();
  
  // Providers are now dynamic, each provider is { id }
  const [providers, setProviders] = useState<{ id: string }[]>([]);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null);
  const [maskedInputs, setMaskedInputs] = useState<Record<string, boolean>>({});
  
  const [settings, setSettings] = useState<Record<string, ProviderSettings>>({});

  // Update activeTab type to include 'runtime'
  const [activeTab, setActiveTab] = useState<'providers' | 'environment' | 'runtime'>('providers');
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  // Add state for runtime settings
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>({
    enableOperationsVisibility: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add state for model dropdown
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelInputValue, setModelInputValue] = useState<string>("");

  // Add state for fetched models
  const [fetchedModels, setFetchedModels] = useState<{model: string, provider: string}[]>([]);

  // Clear form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMaskedInputs({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      // Fetch settings when the modal opens
      fetch('/load_settings')
        .then(async (response) => {
          if (!response.ok) {
            // Try to get more specific error if possible
            let errorBody = await response.text();
             try { errorBody = JSON.parse(errorBody); } catch (e) {/* ignore if not json */}
            console.error("Settings load response error:", response.status, response.statusText, errorBody);
            throw new Error(`Failed to load settings: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log('Loaded settings:', data);
          console.log('Raw data from backend:', JSON.stringify(data, null, 2));
          // Access the nested 'settings' object here: data.settings.settings
          const providerSettingsData = data.settings?.settings || {}; // Handle case where it might be missing
          const environmentData = data.settings?.environment || []; // Extract environment data
          const defaultProviderData = data.settings?.defaultProvider || null; // Extract default provider
          const runtimeData = data.settings?.runtime || { enableOperationsVisibility: false }; // Extract runtime settings

          // Build providers list from keys of providerSettingsData
          const loadedProviders = Object.keys(providerSettingsData).map((modelName) => ({
            id: modelName,
          }));
          setProviders(loadedProviders);
          setActiveProvider(loadedProviders.length > 0 ? loadedProviders[0].id : null);
          setDefaultProvider(defaultProviderData || (loadedProviders.length > 0 ? loadedProviders[0].id : null));
          setSettings(providerSettingsData);
          setEnvVars(environmentData);
          setRuntimeSettings(runtimeData);

          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading settings:', err);
          setError(err.message || 'Failed to load settings.');
          setIsLoading(false);
        });
    }
  // Add fetchedModels as dependency so provider names are matched after models are loaded
  }, [isOpen, fetchedModels]);

  // Fetch model list from LiteLLM registry when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json")
        .then(async (resp) => {
          if (!resp.ok) throw new Error(`Failed to fetch model registry: ${resp.status}`);
          const data = await resp.json();
          // Skip the first record, and extract model/provider
          const models: {model: string, provider: string}[] = Object.entries(data)
            .slice(1)
            .map(([model, info]: [string, any]) => ({
              model,
              provider: info.litellm_provider || "unknown"
            }));
          setFetchedModels(models);
        })
        .catch((err) => {
          console.error("Failed to fetch model registry:", err);
          setFetchedModels([]); // fallback to empty
        });
    }
  }, [isOpen]);

  // Keep modelInputValue in sync with settings[activeProvider].model
  useEffect(() => {
    setModelInputValue(settings[activeProvider]?.model || "");
  }, [activeProvider, settings[activeProvider]?.model]);

  // Filter model options based on input value (substring match, case-insensitive)
  const filteredModelOptions = useMemo(() => {
    // Always use the full list (from registry if available, else fallback)
    const options = fetchedModels.length > 0
      ? fetchedModels
      : allModels.map(m => ({ model: m, provider: "" }));
    if (!modelInputValue) return options;
    const filter = modelInputValue.toLowerCase();
    // Only filter by model name, not provider
    return options.filter(opt => opt.model.toLowerCase().includes(filter));
  }, [fetchedModels, modelInputValue]);

  // Prevent rendering form until settings are loaded


  const handleSettingChange = (providerId: string, setting: keyof ProviderSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [setting]: value,
      },
    }));
  };

  const handleDefaultChange = (providerId: string) => {
    setDefaultProvider(providerId);
  };

  // Add env var handlers
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  // Add Provider handler (no prompt, just add with default model name)
  const handleAddProvider = () => {
    // Generate a unique id for the new provider
    let baseId = "No model selected";
    let id = baseId;
    let counter = 1;
    while (providers.some(p => p.id === id)) {
      id = `${baseId} (${counter++})`;
    }
    setProviders(prev => [...prev, { id }]);
    setSettings(prev => ({
      ...prev,
      [id]: {
        apiKey: "",
        base_url: "",
        model: "", // No model selected yet
        temperature: 0.7,
        topP: 1,
        topK: 50,
        contextSize: 4096,
      }
    }));
    setActiveProvider(id);
  };

  // Delete Provider handler
  const handleDeleteProvider = (providerId: string) => {
    if (!window.confirm("Are you sure you want to delete this provider?")) return;
    setProviders(prev => prev.filter(p => p.id !== providerId));
    setSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[providerId];
      return newSettings;
    });
    // If deleting active or default, update
    if (activeProvider === providerId) {
      const remaining = providers.filter(p => p.id !== providerId);
      setActiveProvider(remaining.length > 0 ? remaining[0].id : null);
    }
    if (defaultProvider === providerId) {
      const remaining = providers.filter(p => p.id !== providerId);
      setDefaultProvider(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Update save handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedSettings = {...settings};

    // Ensure all numeric settings are correctly formatted as numbers before saving
    Object.keys(updatedSettings).forEach(provider => {
      updatedSettings[provider].temperature = Number(updatedSettings[provider].temperature ?? 0);
      updatedSettings[provider].topP = Number(updatedSettings[provider].topP ?? 1);
      updatedSettings[provider].topK = Number(updatedSettings[provider].topK ?? 50);
      updatedSettings[provider].contextSize = Number(updatedSettings[provider].contextSize ?? 4096);

      // Add a check for NaN just in case, though previous steps should prevent it
      if (isNaN(updatedSettings[provider].temperature)) updatedSettings[provider].temperature = 0.7; // Or a safe default
      if (isNaN(updatedSettings[provider].topP)) updatedSettings[provider].topP = 1;
      if (isNaN(updatedSettings[provider].topK)) updatedSettings[provider].topK = 50;
      if (isNaN(updatedSettings[provider].contextSize)) updatedSettings[provider].contextSize = 4096;

      console.log(`Final ${provider} temperature before save:`, updatedSettings[provider].temperature);
    });
    
    // Create the payload for saving
    // Only save settings for current providers
    const filteredSettings = {};
    providers.forEach(p => {
      if (updatedSettings[p.id]) filteredSettings[p.id] = updatedSettings[p.id];
    });
    const configToSave = {
      settings: filteredSettings,
      defaultProvider: defaultProvider,
      environment: envVars,
      runtime: runtimeSettings
    };
    
    console.log("Saving configuration:", JSON.stringify(configToSave, null, 2));
    
    try {
      const response = await fetch('/save_settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
      });
      
      if (response.ok) {
        console.log('Settings saved successfully');
        // Now we use the same structure for global settings
        setGlobalSettings(configToSave);
      } else {
        const errorData = await response.text();
        console.error('Error saving settings:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setIsOpen(false);
  };

  const handleOpenSettingsFile = () => {
    console.log("Opening settings file");
    // Implement the logic to open the settings file
  };

  const handleApiKeyChange = (providerId: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[900px] bg-background text-foreground rounded-lg shadow-lg z-50 border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-3xl font-bold">Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your LLM provider settings here. Be sure to keep API keys secret and never share them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex space-x-4 mb-4">
          <Button
            onClick={() => setActiveTab('providers')}
            className={cn(
              "h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              activeTab === 'providers'
                ? 'bg-muted text-foreground shadow'
                : 'bg-transparent text-gray-400 border border-border hover:bg-muted/50 hover:text-foreground'
            )}
          >
            LLM Providers
          </Button>
          <Button
            onClick={() => setActiveTab('environment')}
            className={cn(
              "h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              activeTab === 'environment'
                ? 'bg-muted text-foreground shadow'
                : 'bg-transparent text-gray-400 border border-border hover:bg-muted/50 hover:text-foreground'
            )}
          >
            Environment Variables
          </Button>
          <Button
            onClick={() => setActiveTab('runtime')}
            className={cn(
              "h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              activeTab === 'runtime'
                ? 'bg-muted text-foreground shadow'
                : 'bg-transparent text-gray-400 border border-border hover:bg-muted/50 hover:text-foreground'
            )}
          >
            Runtime
          </Button>
        </div>

        <form 
          id={sessionId}
          key={sessionId}
          onSubmit={handleSaveSettings} 
          autoComplete="off"
          className="space-y-4"
        >
          <div className="h-[500px] overflow-y-auto pr-2">
            {activeTab === 'providers' ? (
              <div className="flex">
                <div className="w-1/4 border-r border-border pr-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-400">Providers</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddProvider}
                      className="ml-2"
                    >
                      Add
                    </Button>
                  </div>
                  {providers.length === 0 && (
                    <div className="text-gray-400 text-sm py-2">No providers added.</div>
                  )}
                  {providers.map((provider) => {
                    // Get model name from settings
                    const modelName = settings[provider.id]?.model || "No model selected";
                    // Find provider name from fetchedModels
                    let providerName = "";
                    if (modelName && fetchedModels.length > 0) {
                      const match = fetchedModels.find(m => m.model === modelName);
                      providerName = match ? match.provider : "";
                    }
                    return (
                      <div
                        key={provider.id}
                        className={cn(
                          "flex items-center justify-between p-2 cursor-pointer rounded-md hover:bg-muted group",
                          activeProvider === provider.id ? "bg-muted" : ""
                        )}
                        onClick={() => setActiveProvider(provider.id)}
                      >
                        <div>
                          <span className={cn(
                            activeProvider === provider.id ? "font-semibold text-foreground" : "",
                            defaultProvider !== provider.id ? "text-gray-400" : "text-foreground"
                          )}>{modelName}</span>
                          <div className="text-xs">
                            {modelName && providerName
                              ? <span className="text-blue-400">{providerName}</span>
                              : <span className="text-red-400">Provider not detected</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {defaultProvider === provider.id && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteProvider(provider.id);
                            }}
                            title="Delete provider"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="w-3/4 pl-4 overflow-y-auto">
                  {activeProvider && settings[activeProvider] ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-default`} className="text-gray-300">Set as Default</Label>
                        <Switch
                          id={`${uniqueId}-settings-modal-${activeProvider}-default`}
                          checked={defaultProvider === activeProvider}
                          onCheckedChange={() => handleDefaultChange(activeProvider)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-api-key`} className="text-gray-300">API Key</Label>
                        <Input
                          id={`${uniqueId}-${sessionId}-${activeProvider}-api-key`}
                          name={`${sessionId}-api-key`}
                          value={settings[activeProvider]?.apiKey || ''}
                          onChange={(e) => handleApiKeyChange(activeProvider, e.target.value)}
                          type="text"
                          className={cn(
                            "bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            maskedInputs[activeProvider] && "font-mono [text-security: disc]"
                          )}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck="false"
                          data-lpignore="true"
                          aria-autocomplete="none"
                        />
                      </div>
                      {activeProvider.toLowerCase().includes("openai") && (
                        <div className="space-y-2">
                          <Label htmlFor={`${uniqueId}-${sessionId}-${activeProvider}-base-url`} className="text-gray-300">Base URL</Label>
                          <Input
                            id={`${uniqueId}-${sessionId}-${activeProvider}-base-url`}
                            value={settings[activeProvider]?.base_url || ''}
                            onChange={(e) => handleSettingChange(activeProvider, "base_url", e.target.value)}
                            type="text"
                            className="bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        {/* Model label with provider name if matched */}
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-model`} className="text-gray-300 flex items-center">
                          Model
                          {(() => {
                            // Find provider for current modelInputValue
                            const match = (fetchedModels.length > 0
                              ? fetchedModels
                              : allModels.map(m => ({model: m, provider: ""}))
                            ).find(opt => opt.model === modelInputValue);
                            if (match && match.provider) {
                              return (
                                <span className="ml-2 text-sm">
                                  (provider: <span className="text-blue-400">{match.provider}</span>)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            id={`${uniqueId}-settings-modal-${activeProvider}-model`}
                            value={modelInputValue}
                            onChange={(e) => {
                              setModelInputValue(e.target.value);
                              handleSettingChange(activeProvider, "model", e.target.value);
                              setModelDropdownOpen(true);
                            }}
                            onFocus={() => setModelDropdownOpen(true)}
                            autoComplete="off"
                            className="bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                            onClick={() => setModelDropdownOpen((open) => !open)}
                          >
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>
                          {modelDropdownOpen && (
                            <div
                              className="absolute z-20 mt-1 w-full bg-background border border-border rounded shadow-lg max-h-48 overflow-auto"
                              onMouseLeave={() => setModelDropdownOpen(false)}
                            >
                              {filteredModelOptions.length === 0 ? (
                                <div className="px-3 py-2 text-gray-400 text-sm">No models found</div>
                              ) : (
                                filteredModelOptions.map((option) => (
                                  <div
                                    key={option.model}
                                    className={cn(
                                      "px-3 py-2 cursor-pointer hover:bg-muted text-foreground flex items-center",
                                      option.model === modelInputValue ? "bg-muted font-semibold" : ""
                                    )}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setModelInputValue(option.model);
                                      handleSettingChange(activeProvider, "model", option.model);
                                      setModelDropdownOpen(false);
                                    }}
                                  >
                                    {option.provider && (
                                      <span className="text-blue-400 mr-2">{option.provider}</span>
                                    )}
                                    <span>{option.model}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-temperature`} className="w-24 text-gray-300">Temperature</Label>
                        <Input
                          type="number"
                          id={`${uniqueId}-settings-modal-${activeProvider}-temperature`}
                          value={String(settings[activeProvider]?.temperature ?? 0)}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            let numValue: number;

                            if (inputValue === '' || inputValue === '-') {
                               numValue = 0;
                            } else {
                              numValue = parseFloat(inputValue);
                              if (!isNaN(numValue)) {
                                numValue = Math.max(0, Math.min(1, numValue));
                                // Explicitly round input value to nearest 0.1 step
                                numValue = Math.round(numValue * 10) / 10;
                              } else {
                                numValue = 0;
                              }
                            }
                            console.log(`Input changed temperature to: ${numValue}`);
                            handleSettingChange(activeProvider, "temperature", numValue);
                          }}
                          className="w-20 bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          min={0}
                          max={1}
                          step={0.1}
                        />
                        <Slider
                          id={`${uniqueId}-settings-modal-${activeProvider}-temperature-slider`}
                          value={[Number(settings[activeProvider]?.temperature ?? 0)]}
                          onValueChange={([value]) => {
                             // 1. Round the incoming value from the slider to the nearest 0.1
                             const roundedValue = Math.round(value * 10) / 10;

                             // 2. Only update state if the rounded value is different
                             //    from the current state to prevent potential feedback loops
                             if (roundedValue !== Number(settings[activeProvider]?.temperature ?? 0)) {
                               console.log(`Slider raw value: ${value}, Rounded & Setting: ${roundedValue}`);
                               handleSettingChange(activeProvider, "temperature", roundedValue);
                             } else {
                               // Optional: Log when no change is needed
                               // console.log(`Slider value ${value} rounded to ${roundedValue}, matches current state. No update.`);
                             }
                          }}
                          max={1}
                          min={0}
                          step={0.1}
                          className="flex-grow"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                         <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-top-p`} className="w-24 text-gray-300">Top P</Label>
                         <Input
                           type="number"
                           id={`${uniqueId}-settings-modal-${activeProvider}-top-p`}
                           value={String(settings[activeProvider]?.topP ?? 1)}
                           onChange={(e) => {
                             const inputValue = e.target.value;
                             let numValue = parseFloat(inputValue);
                             if (!isNaN(numValue)) {
                               numValue = Math.max(0, Math.min(1, numValue));
                               // Round Top P input value
                               numValue = Math.round(numValue * 10) / 10;
                             } else {
                               numValue = 1;
                             }
                             handleSettingChange(activeProvider, "topP", numValue);
                           }}
                           className="w-20 bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                           min={0}
                           max={1}
                           step={0.1}
                         />
                         <Slider
                           id={`${uniqueId}-settings-modal-${activeProvider}-top-p-slider`}
                           value={[Number(settings[activeProvider]?.topP ?? 1)]}
                           onValueChange={([value]) => {
                             // Round Top P slider value
                             const roundedValue = Math.round(value * 10) / 10;
                             if (roundedValue !== Number(settings[activeProvider]?.topP ?? 1)) {
                               handleSettingChange(activeProvider, "topP", roundedValue);
                             }
                           }}
                           max={1}
                           min={0}
                           step={0.1}
                           className="flex-grow"
                         />
                      </div>
                      <div className="flex items-center space-x-4">
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-top-k`} className="w-24 text-gray-300">Top K</Label>
                        <Input
                          type="number"
                          id={`${uniqueId}-settings-modal-${activeProvider}-top-k`}
                          value={settings[activeProvider]?.topK.toString()}
                          onChange={(e) => handleSettingChange(activeProvider, "topK", parseInt(e.target.value) || 50)}
                          className="w-20 bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          min={0}
                          max={100}
                          step={1}
                        />
                        <Slider
                          id={`${uniqueId}-settings-modal-${activeProvider}-top-k-slider`}
                          value={[settings[activeProvider]?.topK || 50]}
                          onValueChange={([value]) => handleSettingChange(activeProvider, "topK", value)}
                          max={100}
                          step={1}
                          className="flex-grow"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-context-size`} className="w-24 text-gray-300">Context Size</Label>
                        <Input
                          type="number"
                          id={`${uniqueId}-settings-modal-${activeProvider}-context-size`}
                          value={settings[activeProvider]?.contextSize.toString()}
                          onChange={(e) => handleSettingChange(activeProvider, "contextSize", parseInt(e.target.value) || 4096)}
                          className="w-20 bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          min={1024}
                          step={1024}
                        />
                        <Slider
                          id={`${uniqueId}-settings-modal-${activeProvider}-context-size-slider`}
                          value={[settings[activeProvider]?.contextSize || 4096]}
                          onValueChange={([value]) => handleSettingChange(activeProvider, "contextSize", value)}
                          min={1024}
                          max={32768}
                          step={1024}
                          className="flex-grow"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm py-2">Select a provider to edit settings.</div>
                  )}
                </div>
              </div>
            ) : activeTab === 'environment' ? (
              <div className="space-y-4 p-4">
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={addEnvVar}
                    variant="outline"
                  >
                    Add Variable
                  </Button>
                </div>
                
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="Variable name"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                      className="bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <Input
                      placeholder="Value" 
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      className="bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvVar(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 p-4">
                <div className="bg-muted/30 p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-medium text-gray-200 mb-4">Runtime Settings</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`${uniqueId}-settings-modal-enable-operations-visibility`} className="text-gray-300 font-medium">
                          Enable operations visibility for LLM in context
                        </Label>
                        <p className="text-sm text-gray-400">
                          When enabled, Fractalic operations will be visible to the LLM as part of the context window. 
                          This can improve the model's understanding of your workflow, but may consume additional tokens. 
                          Use with caution in production environments.
                        </p>
                      </div>
                      <Switch
                        id={`${uniqueId}-settings-modal-enable-operations-visibility`}
                        checked={runtimeSettings.enableOperationsVisibility}
                        onCheckedChange={(checked) => 
                          setRuntimeSettings(prev => ({
                            ...prev,
                            enableOperationsVisibility: checked
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              type="button"
              variant="link"
              onClick={handleOpenSettingsFile}
              className="text-blue-400 hover:text-blue-300"
            >
              Open settings file
            </Button>
            <Button type="submit" className="bg-gray-700 hover:bg-primary text-white hover:text-white">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
