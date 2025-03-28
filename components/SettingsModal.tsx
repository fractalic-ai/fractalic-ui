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

  // Add new state
  const [activeTab, setActiveTab] = useState<'providers' | 'environment'>('providers');
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);

  // Clear form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMaskedInputs({});
    }
  }, [isOpen]);

  useEffect(() => {
    let mounted = true;
    
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/load_settings/');
        const data = await response.json();
        
        if (mounted && data.settings) {
          const newSettings = providers.reduce((acc, provider) => ({
            ...acc,
            [provider.id]: {
              apiKey: data.settings.settings[provider.id]?.apiKey || "",
              base_url: data.settings.settings[provider.id]?.base_url || "", // Added field
              model: data.settings.settings[provider.id]?.model || modelOptions[provider.id][0],
              temperature: data.settings.settings[provider.id]?.temperature ?? 0.7,
              topP: data.settings.settings[provider.id]?.topP ?? 1,
              topK: data.settings.settings[provider.id]?.topK ?? 50,
              contextSize: data.settings.settings[provider.id]?.contextSize ?? 4096,
            },
          }), {});
          
          setSettings(newSettings);
          setDefaultProvider(data.settings.defaultProvider || providers[0].id);

          // Load environment variables
          if (data.settings.environment) {
            setEnvVars(data.settings.environment);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (isOpen) {
      fetchSettings();
    }

    return () => {
      mounted = false;
    };
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
    console.log("Saving configuration:", { settings, defaultProvider });
    try {
      const response = await fetch('/api/save_settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          settings, 
          defaultProvider,
          environment: envVars 
        }),
      });
      if (response.ok) {
        console.log('Settings saved successfully');
        // Optionally update global settings
        setGlobalSettings({ settings, defaultProvider, environment: envVars });
      } else {
        console.error('Error saving settings');
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


      <DialogContent className="sm:max-w-[900px] bg-black text-white rounded-lg shadow-lg z-50">
        <DialogHeader>
          <DialogTitle className="text-white">Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your LLM provider settings here. Be sure to keep API keys secret and never share them.
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex space-x-4 mb-4">
          <Button
            variant={activeTab === 'providers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('providers')}
            className={activeTab === 'providers' ? 'bg-accent text-accent-foreground' : ''}
          >
            LLM Providers
          </Button>
          <Button
            variant={activeTab === 'environment' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('environment')}
            className={activeTab === 'environment' ? 'bg-accent text-accent-foreground' : ''}
          >
            Environment Variables
          </Button>
        </div>

        <form 
          id={sessionId}
          key={sessionId}
          onSubmit={handleSaveSettings} 
          autoComplete="off"
          className="space-y-4"
        >
          {/* Tab content */}
          <div className="h-[500px] overflow-y-auto">
            {activeTab === 'providers' ? (
              <div className="flex">
                {/* Providers content */}
                <div className="w-1/4 border-r border-gray-800 pr-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className={`flex items-center justify-between p-2 cursor-pointer ${
                        activeProvider === provider.id ? "bg-gray-900" : ""
                      }`}
                      onClick={() => setActiveProvider(provider.id)}
                    >
                      <span>{provider.name}</span>
                      {defaultProvider === provider.id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="w-3/4 pl-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-default`} className="text-white">Set as Default</Label>
                      <Switch
                        id={`${uniqueId}-settings-modal-${activeProvider}-default`}
                        checked={defaultProvider === activeProvider}
                        onCheckedChange={() => handleDefaultChange(activeProvider)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-api-key`} className="text-white">API Key</Label>
                      <Input
                        id={`${uniqueId}-${sessionId}-${activeProvider}-api-key`}
                        name={`${sessionId}-api-key`}
                        value={settings[activeProvider]?.apiKey || ''}
                        onChange={(e) => handleApiKeyChange(activeProvider, e.target.value)}
                        type="text" // Use text instead of password
                        className={cn(
                          "bg-gray-900 text-white border-gray-800",
                          maskedInputs[activeProvider] && "font-mono [text-security: disc]" // CSS masking
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
                        <Label htmlFor={`${uniqueId}-${sessionId}-${activeProvider}-base-url`} className="text-white">Base URL</Label>
                        <Input
                          id={`${uniqueId}-${sessionId}-${activeProvider}-base-url`}
                          value={settings[activeProvider]?.base_url || ''}
                          onChange={(e) => handleSettingChange(activeProvider, "base_url", e.target.value)}
                          type="text"
                          className="bg-gray-900 text-white border-gray-800"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-model`} className="text-white">Model</Label>
                      <Input
                        type="text"
                        id={`${uniqueId}-settings-modal-${activeProvider}-model`}
                        value={settings[activeProvider]?.model || ''}
                        onChange={(e) => handleSettingChange(activeProvider, "model", e.target.value)}
                        className="bg-gray-900 text-white border-gray-800"
                      />
                    </div>
                    {/* Temperature */}
                    <div className="flex items-center space-x-4">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-temperature`} className="w-24 text-white">Temperature</Label>
                      <Input
                        type="number"
                        id={`${uniqueId}-settings-modal-${activeProvider}-temperature`}
                        value={settings[activeProvider]?.temperature.toString() || '0.7'}
                        onChange={(e) => handleSettingChange(activeProvider, "temperature", parseFloat(e.target.value))}
                        className="w-20 bg-gray-900 text-white border-gray-800"
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <Slider
                        id={`${uniqueId}-settings-modal-${activeProvider}-temperature-slider`}
                        value={[settings[activeProvider]?.temperature || 0.7]}
                        onValueChange={([value]) => handleSettingChange(activeProvider, "temperature", value)}
                        max={1}
                        step={0.01}
                        className="flex-grow"
                      />
                    </div>
                    {/* Top P */}
                    <div className="flex items-center space-x-4">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-top-p`} className="w-24 text-white">Top P</Label>
                      <Input
                        type="number"
                        id={`${uniqueId}-settings-modal-${activeProvider}-top-p`}
                        value={settings[activeProvider]?.topP.toString() || '1'}
                        onChange={(e) => handleSettingChange(activeProvider, "topP", parseFloat(e.target.value))}
                        className="w-20 bg-gray-900 text-white border-gray-800"
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <Slider
                        id={`${uniqueId}-settings-modal-${activeProvider}-top-p-slider`}
                        value={[settings[activeProvider]?.topP || 1]}
                        onValueChange={([value]) => handleSettingChange(activeProvider, "topP", value)}
                        max={1}
                        step={0.01}
                        className="flex-grow"
                      />
                    </div>
                    {/* Top K */}
                    <div className="flex items-center space-x-4">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-top-k`} className="w-24 text-white">Top K</Label>
                      <Input
                        type="number"
                        id={`${uniqueId}-settings-modal-${activeProvider}-top-k`}
                        value={settings[activeProvider]?.topK.toString() || '50'}
                        onChange={(e) => handleSettingChange(activeProvider, "topK", parseInt(e.target.value))}
                        className="w-20 bg-gray-900 text-white border-gray-800"
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
                    {/* Context Size */}
                    <div className="flex items-center space-x-4">
                      <Label htmlFor={`${uniqueId}-settings-modal-${activeProvider}-context-size`} className="w-24 text-white">Context Size</Label>
                      <Input
                        type="number"
                        id={`${uniqueId}-settings-modal-${activeProvider}-context-size`}
                        value={settings[activeProvider]?.contextSize.toString() || '4096'}
                        onChange={(e) => handleSettingChange(activeProvider, "contextSize", parseInt(e.target.value))}
                        className="w-20 bg-gray-900 text-white border-gray-800"
                        min={1024}
                        max={32768}
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
            ) : (
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
                      className="bg-gray-900 text-white border-gray-800"
                    />
                    <Input
                      placeholder="Value" 
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      className="bg-gray-900 text-white border-gray-800"
                    />
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvVar(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form footer */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="link"
              onClick={handleOpenSettingsFile}
              className="text-blue-400 hover:text-blue-300"
            >
              Open settings file
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
