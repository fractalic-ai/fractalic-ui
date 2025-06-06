import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddServer: (serverConfig: any) => void;
}

export const AddServerDialog: React.FC<AddServerDialogProps> = ({
  open,
  onOpenChange,
  onAddServer,
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [serverName, setServerName] = useState('');
  const [jsonConfig, setJsonConfig] = useState('');
  const [activeTab, setActiveTab] = useState('manual');

  const handleAddServer = () => {
    if (activeTab === 'manual') {
      if (!serverUrl.trim() || !serverName.trim()) {
        alert('Please fill in both Server URL and Server Name');
        return;
      }
      
      const config = {
        name: serverName.trim(),
        url: serverUrl.trim(),
        type: 'manual'
      };
      
      onAddServer(config);
    } else {
      try {
        const config = JSON.parse(jsonConfig);
        onAddServer({ ...config, type: 'json' });
      } catch (error) {
        alert('Invalid JSON configuration. Please check your input.');
        return;
      }
    }
    
    // Reset form
    setServerUrl('');
    setServerName('');
    setJsonConfig('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setServerUrl('');
    setServerName('');
    setJsonConfig('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="json">JSON Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serverName">Server Name</Label>
              <Input
                id="serverName"
                placeholder="Enter server name (e.g., My Custom MCP Server)"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                placeholder="Enter server URL (e.g., https://api.example.com/mcp)"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jsonConfig">JSON Configuration</Label>
              <Textarea
                id="jsonConfig"
                placeholder={`Paste your MCP server JSON configuration here, e.g.:
{
  "name": "My MCP Server",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "bearer",
    "token": "your-token"
  },
  "capabilities": ["tools", "resources"]
}`}
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Please check the complete installation process on the MCP repository 
            or follow the official instructions to ensure all requirements and tools are properly installed 
            before adding your server. Some MCP servers may require additional dependencies or configuration.
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAddServer}>
            Add to Fractalic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
