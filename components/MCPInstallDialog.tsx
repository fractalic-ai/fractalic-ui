import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InfoIcon, AlertCircle, Package, Server, Key, Code2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MCPInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: any; // Registry server object
  onInstall: (config: any) => Promise<void>;
}

export const MCPInstallDialog: React.FC<MCPInstallDialogProps> = ({
  open,
  onOpenChange,
  server,
  onInstall,
}) => {
  const [envVariables, setEnvVariables] = useState<Record<string, string>>({});
  const [selectedTransport, setSelectedTransport] = useState<string>('');
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();

  // Получаем доступные пакеты и транспорты
  const availablePackages = useMemo(() => {
    if (!server?.packages) return [];
    return server.packages.map((pkg: any, index: number) => ({
      ...pkg,
      index,
      label: `${pkg.registry_type || 'unknown'} - ${pkg.identifier || 'unnamed'}`,
      transportType: pkg.transport?.type || 'stdio'
    }));
  }, [server]);

  // Получаем environment variables для выбранного пакета
  const requiredEnvVars = useMemo(() => {
    if (!server?.packages?.[selectedPackageIndex]) return [];
    const pkg = server.packages[selectedPackageIndex];
    return pkg.environmentVariables || [];
  }, [server, selectedPackageIndex]);

  // Получаем доступные транспорты
  const availableTransports = useMemo(() => {
    const transports = new Set<string>();

    // Добавляем транспорты из packages
    server?.packages?.forEach((pkg: any) => {
      if (pkg.transport?.type) {
        transports.add(pkg.transport.type);
      }
    });

    // Добавляем транспорты из remotes
    server?.remotes?.forEach((remote: any) => {
      if (remote.type) {
        transports.add(remote.type);
      }
    });

    // Если транспортов нет, используем stdio по умолчанию
    if (transports.size === 0) {
      transports.add('stdio');
    }

    return Array.from(transports);
  }, [server]);

  // Устанавливаем дефолтный транспорт
  React.useEffect(() => {
    if (availableTransports.length > 0 && !selectedTransport) {
      setSelectedTransport(availableTransports[0]);
    }
  }, [availableTransports, selectedTransport]);

  // Сбрасываем состояние при открытии диалога
  React.useEffect(() => {
    if (open) {
      setEnvVariables({});
      setSelectedPackageIndex(0);
      setSelectedTransport(availableTransports[0] || 'stdio');
    }
  }, [open, availableTransports]);

  const handleInstall = async () => {
    if (isInstalling) return;

    // Check required environment variables
    const missingVars = requiredEnvVars
      .filter((env: any) => env.is_required !== false)
      .filter((env: any) => !envVariables[env.name || env.key])
      .map((env: any) => env.name || env.key);

    if (missingVars.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in required variables: ${missingVars.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsInstalling(true);

    try {
      const selectedPackage = server.packages?.[selectedPackageIndex];

      // Generate config in the correct format
      // The system will automatically install necessary packages
      const serverConfig = {
        // For npm packages
        ...(selectedPackage?.registry_type === 'npm' && {
          command: 'npx',
          args: [
            '-y',
            `${selectedPackage.identifier}${selectedPackage.version ? `@${selectedPackage.version}` : ''}`
          ]
        }),
        // For python packages
        ...(selectedPackage?.registry_type === 'pypi' && {
          command: 'uvx',
          args: [
            '--from',
            `${selectedPackage.identifier}${selectedPackage.version ? `==${selectedPackage.version}` : ''}`,
            selectedPackage.identifier
          ]
        }),
        // For OCI containers
        ...(selectedPackage?.registry_type === 'oci' && {
          command: 'docker',
          args: [
            'run',
            '-i',
            '--rm',
            `${selectedPackage.registry_base_url || ''}${selectedPackage.identifier}:${selectedPackage.version || 'latest'}`
          ]
        }),
        // For binary packages
        ...(selectedPackage?.registry_type === 'mcpb' && {
          command: selectedPackage.identifier,
          args: []
        }),
        // Transport
        transport: selectedTransport,
        // Environment variables
        ...(Object.keys(envVariables).length > 0 && {
          env: envVariables
        })
      };

      // Clean server name for use as config key
      const serverKey = server.name.replace(/[^a-zA-Z0-9_-]/g, '_');

      const config = {
        type: 'json',
        jsonConfig: JSON.stringify({
          mcpServers: {
            [serverKey]: serverConfig
          }
        }, null, 2)
      };

      console.log('Installing server with config:', config);
      await onInstall(config);

      // Reset state after successful installation
      setEnvVariables({});
      onOpenChange(false);

      toast({
        title: "Success",
        description: `Server ${server.name} has been added`,
      });
    } catch (error) {
      console.error('Installation error:', error);
      toast({
        title: "Installation Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Install MCP Server</DialogTitle>
          <DialogDescription>
            Configure installation parameters for {server.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Server Information */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-muted-foreground">{server.description}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{server.status}</Badge>
                      {server.version && <Badge variant="outline">{server.version}</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package selection if multiple available */}
            {availablePackages.length > 1 && (
              <div className="space-y-2">
                <Label>Select package to install</Label>
                <Select
                  value={selectedPackageIndex.toString()}
                  onValueChange={(value) => setSelectedPackageIndex(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePackages.map((pkg: any) => (
                      <SelectItem key={pkg.index} value={pkg.index.toString()}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{pkg.label}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {pkg.transportType}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Transport selection if multiple available */}
            {availableTransports.length > 1 && (
              <div className="space-y-2">
                <Label>Communication Protocol</Label>
                <Select value={selectedTransport} onValueChange={setSelectedTransport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransports.map((transport) => (
                      <SelectItem key={transport} value={transport}>
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4" />
                          <span className="font-mono">{transport}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  Select the protocol for server communication
                </div>
              </div>
            )}

            {/* Environment Variables */}
            {requiredEnvVars.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label>Environment Variables</Label>
                </div>

                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    These variables are required for the server to function. Usually API keys or access tokens.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {requiredEnvVars.map((env: any) => {
                    const envName = env.name || env.key;
                    const isRequired = env.is_required !== false;
                    const isSecret = env.is_secret === true;

                    return (
                      <div key={envName} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={envName}>
                            {envName}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {isSecret && (
                            <Badge variant="secondary" className="text-xs">
                              Secret
                            </Badge>
                          )}
                        </div>
                        <Input
                          id={envName}
                          type={isSecret ? "password" : "text"}
                          placeholder={env.description || `Enter ${envName}`}
                          value={envVariables[envName] || ''}
                          onChange={(e) => setEnvVariables({
                            ...envVariables,
                            [envName]: e.target.value
                          })}
                        />
                        {env.description && (
                          <div className="text-xs text-muted-foreground">
                            {env.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Automatic installation info */}
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                The system will automatically install all necessary dependencies for this server.
                {server.packages?.[selectedPackageIndex]?.registry_type === 'npm' && ' Will use npm/npx.'}
                {server.packages?.[selectedPackageIndex]?.registry_type === 'pypi' && ' Will use pip/uvx.'}
                {server.packages?.[selectedPackageIndex]?.registry_type === 'oci' && ' Will use Docker.'}
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              'Install'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MCPInstallDialog;