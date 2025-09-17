import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Globe, Package, GitBranch, Download, Search, ExternalLink, ChevronRight, Code2, Server, Clock, RefreshCw } from 'lucide-react';
import { useAppConfig, getApiUrl } from '@/hooks/use-app-config';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import MCPInstallDialog from './MCPInstallDialog';

interface RegistryServer {
  name: string;
  description: string;
  status: 'active' | 'deprecated' | 'deleted';
  repository?: {
    url?: string;
    source?: string;
    id?: string;
    subfolder?: string;
  };
  version?: string;
  packages?: Array<{
    registry_type?: string;
    registry_base_url?: string;
    identifier?: string;
    version?: string;
    file_sha256?: string;
    runtime_hint?: string;
    transport?: {
      type?: string;
      url?: string;
      headers?: Array<{key: string, value: string}>;
    };
    runtime_arguments?: Array<{name: string, description?: string, required?: boolean}>;
    package_arguments?: Array<{name: string, description?: string, required?: boolean}>;
    environment_variables?: Array<{
      name?: string;
      key?: string;
      value?: string;
      description?: string;
      is_required?: boolean;
      is_secret?: boolean;
      default?: string;
    }>;
  }>;
  remotes?: Array<{
    type?: string;
    url?: string;
    headers?: Array<{key: string, value: string}>;
  }>;
  // Standard metadata field with underscore prefix
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      id?: string;
      published_at?: string;
      updated_at?: string;
      is_latest?: boolean;
    };
    [key: string]: any;
  };
  // Legacy meta field for backward compatibility
  meta?: {
    official?: {
      id?: string;
      published_at?: string;
      updated_at?: string;
      is_latest?: boolean;
    };
    publisher_provided?: Record<string, any>;
  };
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      id?: string;
      published_at?: string;
      updated_at?: string;
      is_latest?: boolean;
    };
  };
}

export default function MCPRegistry() {
  const { config } = useAppConfig();
  const { toast } = useToast();
  const [servers, setServers] = useState<RegistryServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<RegistryServer | null>(null);
  const [selectedServerDetails, setSelectedServerDetails] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [installingServer, setInstallingServer] = useState<string | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [serverToInstall, setServerToInstall] = useState<RegistryServer | null>(null);

  useEffect(() => {
    fetchRegistryServers();
  }, []);

  const fetchRegistryServers = async () => {
    setLoading(true);
    
    // Only show error if we don't have any servers yet
    if (servers.length === 0) {
      setError(null);
    }
    
    try {
      // Use Next.js rewrite proxy to avoid CORS issues
      const response = await fetch('/api/mcp_registry/servers');
      
      if (!response.ok) {
        if (response.status === 503) {
          // Registry is down with database issues
          const errorData = await response.json();
          setError(errorData.details || 'MCP Registry is temporarily unavailable');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const activeServers = data.servers?.filter((s: any) => s.status === 'active') || [];
      
      console.log(`Received ${activeServers.length} active servers from ${data.servers?.length || 0} total`);
      
      setServers(activeServers);
      setError(null); // Clear any errors on success
    } catch (err) {
      console.error('Registry fetch error:', err);
      
      // Only show error to user if we don't have any servers to display
      if (servers.length === 0) {
        setError(`Unable to fetch MCP Registry: ${err instanceof Error ? err.message : 'Network error'}`);
      } else {
        console.log('Fetch failed but keeping existing servers visible');
      }
    }
    
    setLoading(false);
  };

  const fetchServerDetails = async (server: RegistryServer) => {
    try {
      // Use the official UUID from _meta if available, otherwise fallback to name
      const serverId = server._meta?.['io.modelcontextprotocol.registry/official']?.id ||
                       server.meta?.official?.id ||
                       server.name;

      // Use Next.js rewrite proxy to avoid CORS issues
      const response = await fetch(`/api/mcp_registry/servers/${encodeURIComponent(serverId)}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedServerDetails(data);
      } else {
        console.warn(`Failed to fetch details for ${server.name}, using basic info`);
        setSelectedServerDetails(server);
      }
    } catch (err) {
      console.warn(`Error fetching details for ${server.name}:`, err);
      setSelectedServerDetails(server);
    }
  };

  const handleInstall = (server: RegistryServer) => {
    // Открываем диалог установки с переданным сервером
    setServerToInstall(server);
    setShowInstallDialog(true);
  };

  const handleInstallServer = async (installConfig: any) => {
    if (!serverToInstall) return;

    console.log('Installing server:', serverToInstall.name);
    console.log('Install config:', installConfig);

    setInstallingServer(serverToInstall.name);

    const apiUrl = `${getApiUrl('mcp_manager', config)}/add_server`;
    console.log('Sending to API URL:', apiUrl);

    try {
      // Parse the JSON config to extract server configuration
      let serverConfig: any;

      if (installConfig.type === 'json' && installConfig.jsonConfig) {
        const parsedJson = JSON.parse(installConfig.jsonConfig);

        if (parsedJson.mcpServers) {
          // Extract the first (and should be only) server from mcpServers
          const serverKeys = Object.keys(parsedJson.mcpServers);
          if (serverKeys.length === 0) {
            throw new Error('No servers found in configuration');
          }

          const serverKey = serverKeys[0];
          const serverData = parsedJson.mcpServers[serverKey];

          // Create config in format expected by FastMCP backend
          serverConfig = {
            name: serverKey,
            command: serverData.command,
            args: serverData.args || [],
            transport: serverData.transport || 'stdio',
            env: serverData.env || {},
            enabled: true,
            // Add URL if present (for HTTP-based servers)
            ...(serverData.url && { url: serverData.url }),
            // Add headers if present
            ...(serverData.headers && { headers: serverData.headers }),
            // Add description if present
            ...(serverData.description && { description: serverData.description })
          };
        } else {
          throw new Error('Invalid JSON format: mcpServers not found');
        }
      } else {
        // Direct server config (fallback)
        serverConfig = installConfig;
      }

      console.log('Processed server config:', serverConfig);

      // Send config to backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverConfig),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Success response:', data);

      toast({
        title: "Success",
        description: `MCP server ${serverToInstall.name} installed`,
      });

      // Закрываем диалог
      setShowInstallDialog(false);
      setServerToInstall(null);

    } catch (err) {
      console.error('Server installation error:', err);
      toast({
        title: "Installation Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
      throw err; // Re-throw error for dialog handling
    } finally {
      setInstallingServer(null);
    }
  };

  // Enhanced search with AND logic for space-separated terms
  const filteredServers = useMemo(() => {
    // First, deduplicate servers by name (in case there are duplicates from API)
    const uniqueServers = servers.reduce((acc, server) => {
      const existing = acc.find(s => s.name === server.name);
      if (!existing) {
        acc.push(server);
      }
      return acc;
    }, [] as RegistryServer[]);

    if (!searchQuery.trim()) return uniqueServers;

    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return uniqueServers.filter(server => {
      const searchableText = [
        server.name,
        server.description,
        ...(server.packages?.map(pkg => pkg.identifier) || []),
        server.repository?.url || ''
      ].join(' ').toLowerCase();

      // All terms must be found somewhere in the searchable text (AND logic)
      return terms.every(term => searchableText.includes(term));
    });
  }, [servers, searchQuery]);

  // Function to highlight matching terms
  const highlightText = (text: string, searchTerms: string[]): React.ReactNode => {
    if (!searchTerms.length || !searchQuery.trim()) return text;

    const terms = searchTerms.filter(Boolean);
    if (terms.length === 0) return text;

    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    let result: React.ReactNode[] = [];
    let remainingText = text;
    let keyIndex = 0;

    while (remainingText.length > 0) {
      let matchFound = false;
      let earliestMatchIndex = remainingText.length;
      let matchedTerm = '';
      let matchedLength = 0;

      // Find the earliest match among all terms
      for (const term of sortedTerms) {
        if (!term) continue;
        const lowerText = remainingText.toLowerCase();
        const lowerTerm = term.toLowerCase();
        const matchIndex = lowerText.indexOf(lowerTerm);

        if (matchIndex !== -1 && matchIndex < earliestMatchIndex) {
          earliestMatchIndex = matchIndex;
          matchedTerm = remainingText.substr(matchIndex, term.length);
          matchedLength = term.length;
          matchFound = true;
        }
      }

      if (matchFound) {
        // Add text before the match
        if (earliestMatchIndex > 0) {
          result.push(remainingText.substring(0, earliestMatchIndex));
        }

        // Add the highlighted match
        result.push(
          <mark key={keyIndex++} className="bg-yellow-300 text-black rounded px-0.5">
            {matchedTerm}
          </mark>
        );

        // Update remaining text
        remainingText = remainingText.substring(earliestMatchIndex + matchedLength);
      } else {
        // No more matches, add remaining text
        result.push(remainingText);
        break;
      }
    }

    return result.length > 1 ? result : text;
  };

  const handleServerSelect = (server: RegistryServer) => {
    setSelectedServer(server);
    setSelectedServerDetails(null);
    fetchServerDetails(server);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'deprecated':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'deleted':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="h-full w-full bg-background">
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-semibold">MCP Official Registry</h1>
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
              {filteredServers.length} servers {servers.length !== filteredServers.length && `(${servers.length} total)`}
            </Badge>
            {servers.length === 30 && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                Partial data - registry pagination issues
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRegistryServers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 w-full">
          {/* Server List */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50} className="min-w-0">
            <div className="h-full w-full bg-card/30 flex flex-col">
              {/* Search box at top of list */}
              <div className="p-3 border-b border-border/40 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-2 min-h-full">
                  {loading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 border border-border/40 rounded-lg">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </>
                  ) : error ? (
                    <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg text-center">
                      <p className="text-red-400 text-sm">{error}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={fetchRegistryServers}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : filteredServers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No servers found</p>
                    </div>
                  ) : (
                    filteredServers.map((server, index) => {
                      const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
                      return (
                        <div
                          key={server.name}
                          className={`p-4 border border-border/40 rounded-lg cursor-pointer transition-all hover:border-orange-500/30 hover:bg-orange-500/5 ${
                            selectedServer?.name === server.name ? 'border-orange-500/50 bg-orange-500/10' : ''
                          }`}
                          onClick={() => handleServerSelect(server)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-orange-500" />
                              <h3 className="font-medium text-sm truncate">
                                {highlightText(server.name, searchTerms)}
                              </h3>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(server.status)}`}
                            >
                              {server.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                            {highlightText(server.description, searchTerms)}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {server.version && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                v{server.version}
                              </span>
                            )}
                            {server.packages && server.packages.length > 0 && (
                              <span>{server.packages.length} package{server.packages.length !== 1 ? 's' : ''}</span>
                            )}
                            {server.remotes && server.remotes.length > 0 && (
                              <span>{server.remotes.length} remote{server.remotes.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
          
          <ResizableHandle className="w-1 bg-border/40 hover:bg-border" />

          {/* Server Details */}
          <ResizablePanel defaultSize={70} minSize={50} className="min-w-0">
            <div className="h-full w-full flex flex-col bg-background">
              {selectedServer ? (
              <>
                {/* Server Header */}
                <div className="p-6 border-b border-border/40 bg-card/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Server className="h-6 w-6 text-orange-500" />
                        <h2 className="text-xl font-semibold">{selectedServer.name}</h2>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(selectedServer.status)}
                        >
                          {selectedServer.status}
                        </Badge>
                      </div>
                      <p className="text-gray-300">{selectedServer.description}</p>
                    </div>
                    <Button
                      onClick={() => handleInstall(selectedServer)}
                      disabled={installingServer === selectedServer.name}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {installingServer === selectedServer.name ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    {selectedServer.version && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Package className="h-4 w-4" />
                        Version {selectedServer.version}
                      </div>
                    )}
                    {selectedServer.meta?.official?.updatedAt && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="h-4 w-4" />
                        Updated {new Date(selectedServer.meta.official.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedServer.packages && selectedServer.packages.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Package className="h-4 w-4" />
                        {selectedServer.packages.length} packages
                      </div>
                    )}
                  </div>
                </div>

                {/* Server Content */}
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="packages">Configuration</TabsTrigger>
                        <TabsTrigger value="details">Raw Data</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="mt-6 space-y-4">
                        {selectedServer.repository && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <GitBranch className="h-4 w-4" />
                                Repository Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {selectedServer.repository.url && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Repository:</span>
                                  <a
                                    href={selectedServer.repository.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                                  >
                                    {selectedServer.repository.url.replace('https://github.com/', '')}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                              {selectedServer.repository.subfolder && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Subfolder:</span>
                                  <span className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                                    {selectedServer.repository.subfolder}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {selectedServer.remotes && selectedServer.remotes.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                Remote Connections
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {selectedServer.remotes.map((remote, index) => (
                                  <div key={index} className="p-3 border border-border/40 rounded-lg">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">{remote.type || 'Remote'}</span>
                                      {remote.url && (
                                        <span className="text-sm text-muted-foreground font-mono">
                                          {remote.url}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="packages" className="mt-6">
                        {selectedServer.packages && selectedServer.packages.length > 0 ? (
                          <div className="space-y-4">
                            {selectedServer.packages.map((pkg, index) => (
                              <Card key={index}>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {pkg.identifier || `Package ${index + 1}`}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {pkg.registryType && (
                                      <div>
                                        <span className="text-muted-foreground">Type:</span>
                                        <div className="font-mono bg-muted/50 px-2 py-1 rounded mt-1">
                                          {pkg.registryType}
                                        </div>
                                      </div>
                                    )}
                                    {pkg.runTimeHint && (
                                      <div>
                                        <span className="text-muted-foreground">Runtime:</span>
                                        <div className="font-mono bg-muted/50 px-2 py-1 rounded mt-1">
                                          {pkg.runTimeHint}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {pkg.transport && (
                                    <div className="border border-border/40 rounded-lg p-4">
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Server className="h-4 w-4" />
                                        Transport Configuration
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        {pkg.transport.type && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Type:</span>
                                            <span className="font-mono">{pkg.transport.type}</span>
                                          </div>
                                        )}
                                        {pkg.transport.url && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">URL:</span>
                                            <span className="font-mono text-xs">{pkg.transport.url}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {pkg.environmentVariables && pkg.environmentVariables.length > 0 && (
                                    <div className="border border-border/40 rounded-lg p-4">
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Code2 className="h-4 w-4" />
                                        Environment Variables
                                      </h4>
                                      <div className="space-y-2">
                                        {pkg.environmentVariables.map((env, envIndex) => (
                                          <div key={envIndex} className="flex justify-between py-1 border-b border-border/20 last:border-0">
                                            <span className="font-mono text-sm text-muted-foreground">{env.key}</span>
                                            <span className="font-mono text-sm">
                                              {env.value || (
                                                <Badge variant="secondary" className="text-xs">required</Badge>
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No package configuration available</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="details" className="mt-6">
                        {selectedServerDetails ? (
                          <div className="space-y-4">
                            {/* Metadata Information */}
                            {selectedServerDetails.meta?.official && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Official Registry Metadata
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {selectedServerDetails.meta.official.id && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-400">Registry ID:</span>
                                      <span className="text-sm font-mono text-gray-200">{selectedServerDetails.meta.official.id}</span>
                                    </div>
                                  )}
                                  {selectedServerDetails.meta.official.publishedAt && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-400">Published:</span>
                                      <span className="text-sm text-gray-200">{new Date(selectedServerDetails.meta.official.publishedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {selectedServerDetails.meta.official.updatedAt && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-400">Last Updated:</span>
                                      <span className="text-sm text-gray-200">{new Date(selectedServerDetails.meta.official.updatedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {selectedServerDetails.meta.official.isLatest !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-400">Latest Version:</span>
                                      <Badge variant={selectedServerDetails.meta.official.isLatest ? "default" : "secondary"} className="text-xs">
                                        {selectedServerDetails.meta.official.isLatest ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                            
                            {/* Additional Package Details */}
                            {selectedServerDetails.packages?.map((pkg: any, index: number) => (
                              pkg.runtimeArguments || pkg.packageArguments ? (
                                <Card key={index}>
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Code2 className="h-4 w-4" />
                                      {pkg.identifier || `Package ${index + 1}`} Arguments
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {pkg.runtimeArguments && pkg.runtimeArguments.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-medium mb-2 text-gray-200">Runtime Arguments</h4>
                                        <div className="space-y-2">
                                          {pkg.runtimeArguments.map((arg: any, i: number) => (
                                            <div key={i} className="p-2 bg-muted/30 rounded-md">
                                              <div className="flex justify-between items-start">
                                                <code className="text-sm font-mono text-gray-200">{arg.name}</code>
                                                {arg.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                              </div>
                                              {arg.description && <p className="text-xs text-gray-400 mt-1">{arg.description}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {pkg.packageArguments && pkg.packageArguments.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-2 text-gray-200">Package Arguments</h4>
                                        <div className="space-y-2">
                                          {pkg.packageArguments.map((arg: any, i: number) => (
                                            <div key={i} className="p-2 bg-muted/30 rounded-md">
                                              <div className="flex justify-between items-start">
                                                <code className="text-sm font-mono text-gray-200">{arg.name}</code>
                                                {arg.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                              </div>
                                              {arg.description && <p className="text-xs text-gray-400 mt-1">{arg.description}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ) : null
                            ))}
                            
                            {/* Publisher Provided Metadata */}
                            {selectedServerDetails.meta?.publisherProvided && Object.keys(selectedServerDetails.meta.publisherProvided).length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Publisher Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {Object.entries(selectedServerDetails.meta.publisherProvided).map(([key, value]: [string, any]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="text-sm text-gray-200">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                            
                            {/* Raw JSON Data for debugging */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Code2 className="h-4 w-4" />
                                  Raw Server Data (JSON)
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <pre className="p-4 bg-muted/30 rounded-lg text-xs overflow-auto max-h-96 border border-border/40 text-gray-300">
                                  {JSON.stringify(selectedServerDetails, null, 2)}
                                </pre>
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                              <p className="text-sm text-gray-400">
                                Loading server details...
                              </p>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Select a Server</h3>
                  <p className="text-sm">Choose a server from the list to view its details and configuration</p>
                </div>
              </div>
            )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Install Dialog */}
      <MCPInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
        server={serverToInstall}
        onInstall={handleInstallServer}
      />
    </div>
  );
}