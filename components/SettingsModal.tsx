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
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // Optionally pass settings to other components
  setGlobalSettings: (settings: any) => void;
}

const providers = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "groq", name: "Groq" },
];

const modelOptions: Record<string, string[]> = {
  openai: ["gpt-3.5-turbo", "gpt-4o"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-instant-1"],
  groq: ["llama2-70b-4096", "mixtral-8x7b-32768"],
};

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
  
  const [activeProvider, setActiveProvider] = useState(providers[0].id);
  const [defaultProvider, setDefaultProvider] = useState<string>(providers[0].id);
  const [maskedInputs, setMaskedInputs] = useState<Record<string, boolean>>({});
  
  const [settings, setSettings] = useState<Record<string, ProviderSettings>>(
    providers.reduce((acc, provider) => ({
      ...acc,
      [provider.id]: {
        apiKey: "",
        base_url: "", // Added field
        model: modelOptions[provider.id][0],
        temperature: 0.7,
        topP: 1,
        topK: 50,
        contextSize: 4096,
      },
    }), {})
  );

  // Update activeTab type to include 'runtime'
  const [activeTab, setActiveTab] = useState<'providers' | 'environment' | 'runtime'>('providers');
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  // Add state for runtime settings
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>({
    enableOperationsVisibility: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          const defaultProviderData = data.settings?.defaultProvider || providers[0].id; // Extract default provider
          const runtimeData = data.settings?.runtime || { enableOperationsVisibility: false }; // Extract runtime settings

          const newSettings = providers.reduce((acc, provider) => ({
            ...acc,
            [provider.id]: {
              // Use providerSettingsData instead of data.settings directly
              apiKey: providerSettingsData[provider.id]?.apiKey || "",
              base_url: providerSettingsData[provider.id]?.base_url || "",
              model: providerSettingsData[provider.id]?.model || modelOptions[provider.id][0],
              temperature: providerSettingsData[provider.id]?.temperature ?? 0.7,
              topP: providerSettingsData[provider.id]?.topP ?? 1,
              topK: providerSettingsData[provider.id]?.topK ?? 50,
              contextSize: providerSettingsData[provider.id]?.contextSize ?? 4096,
            },
          }), {});
          
          console.log('Processed newSettings object:', JSON.stringify(newSettings, null, 2));

          setSettings(newSettings);
          // Use the extracted defaultProviderData and environmentData
          setDefaultProvider(defaultProviderData); 
          setEnvVars(environmentData);
          // Set runtime settings
          setRuntimeSettings(runtimeData);

          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading settings:', err);
          setError(err.message || 'Failed to load settings.');
          setIsLoading(false);
        });
    }
  }, [isOpen]);

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
    const configToSave = {
      settings: updatedSettings,
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
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className={cn(
                        "flex items-center justify-between p-2 cursor-pointer rounded-md hover:bg-muted",
                        activeProvider === provider.id ? "bg-muted" : ""
                      )}
                      onClick={() => setActiveProvider(provider.id)}
                    >
                      <span className={cn(
                        activeProvider === provider.id ? "font-semibold text-foreground" : "",
                        defaultProvider !== provider.id ? "text-gray-400" : "text-foreground"
                      )}>{provider.name}</span>
                      {defaultProvider === provider.id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="w-3/4 pl-4 overflow-y-auto">
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
                    {activeProvider === "openai" && (
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
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-model`} className="text-gray-300">Model</Label>
                      <Input
                        type="text"
                        id={`${uniqueId}-settings-modal-${activeProvider}-model`}
                        value={settings[activeProvider]?.model || ''}
                        onChange={(e) => handleSettingChange(activeProvider, "model", e.target.value)}
                        className="bg-muted border-gray-700 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
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
