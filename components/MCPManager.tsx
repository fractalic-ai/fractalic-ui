import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAppConfig, getApiUrl } from '@/hooks/use-app-config';
import Uptime from "./Uptime";
import ToolsMarketplace from './ToolsMarketplace';
import { AddServerDialog } from './AddServerDialog';
import { 
  Server, 
  Search, 
  Play, 
  Square, 
  RotateCw, 
  Settings, 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Wrench,
  Filter,
  Code,
  ChevronRight,
  Power,
  PowerOff,
  Info,
  ChevronDown,
  X,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Shield
} from 'lucide-react';

// New Complete Status Response Types
interface CompleteStatusResponse {
  complete_data_included: boolean;
  mcp_version: string;
  oauth_enabled: boolean;
  total_services: number;
  enabled_services: number;
  total_tools: number;
  total_prompts: number;
  total_resources: number;
  total_tokens: number;
  services: Record<string, CompleteServiceDetails>;
}

interface OAuthInfo {
  has_access_token: boolean;
  has_refresh_token: boolean;
  access_token_obtained_at?: number;
  access_token_expires_in?: number;
  access_token_remaining_seconds?: number;
  refresh_token_obtained_at?: number;
  last_refresh_at?: number;
  refresh_needed: boolean;
  client_configured: boolean;
  provider_configured: boolean;
}

interface CompleteServiceDetails {
  status: "connected" | "error" | "disabled" | "oauth_required";
  connected: boolean;
  enabled: boolean;
  transport: "stdio" | "sse" | "http";
  has_oauth: boolean;
  oauth?: OAuthInfo;
  url?: string;
  command?: string;
  tool_count: number;
  tools: MCPTool[];
  prompt_count: number;
  prompts: MCPPrompt[];
  resource_count: number;
  resources: MCPResource[];
  capabilities?: {
    tools?: { list: boolean; call: boolean };
    prompts?: { list: boolean };
    resources?: { list: boolean; read: boolean };
    logging?: { level: string };
    extra?: Record<string, any>;
  };
  token_count: number;
}

// Updated Server interface - removed deprecated fields
interface MCPServer {
  name: string;
  status: "connected" | "error" | "disabled" | "oauth_required";
  connected: boolean;
  enabled: boolean;
  transport: "stdio" | "sse" | "http";
  has_oauth: boolean;
  oauth?: OAuthInfo;
  url?: string;
  command?: string;
  tool_count: number;
  tools: MCPTool[];
  prompt_count: number;
  prompts: MCPPrompt[];
  resource_count: number;
  resources: MCPResource[];
  token_count: number;
  capabilities?: CompleteServiceDetails['capabilities'];
  oauth_configured?: boolean;
  healthy?: boolean;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any[];
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPLibrary {
  name: string;
  id: string;
  description: string;
  category: string;
  install: string;
  docs: string;
  icon?: string;
  author?: string;
  repository?: string;
  config?: any;
  tags?: string[];
  version?: string;
  license?: string;
  lastUpdated?: string;
}

interface MCPManagerProps {
  className?: string;
}

// Service health status interface
interface ServiceHealthStatus {
  status: 'healthy' | 'needs_auth' | 'error' | 'disabled' | 'checking';
  message: string;
  tool_count?: number;
  token_count?: number;
  oauth_required?: boolean;
}

// Helper functions
const getStateColor = (state: string) => {
  switch (state) {
    case 'running': return 'bg-green-500';
    case 'stopped': return 'bg-gray-500';
    case 'errored': return 'bg-red-500';
    case 'retrying': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

const getStateIcon = (state: string) => {
  switch (state) {
    case 'running': return <CheckCircle className="h-4 w-4" />;
    case 'stopped': return <Square className="h-4 w-4" />;
    case 'errored': return <AlertCircle className="h-4 w-4" />;
    case 'retrying': return <RotateCw className="h-4 w-4 animate-spin" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

// Server Card Component - Memoized to prevent unnecessary re-renders
const ServerCard = React.memo(function ServerCard({ 
  server, 
  isSelected, 
  onSelect
}: {
  server: MCPServer;
  isSelected: boolean;
  onSelect: (serverName: string) => void;
}) {
  // Debug logging to track re-renders (can be removed in production)
  // console.log('ServerCard render:', server.name, {
  //   state: server.state,
  //   pid: server.pid,
  //   healthy: server.healthy,
  //   uptime: server.uptime,
  //   tool_count: server.tool_count,
  //   isSelected,
  //   timestamp: new Date().toISOString()
  // });

  const handleClick = useCallback(() => {
    onSelect(server.name);
  }, [onSelect, server.name]);

  return (
    <Card
      className={`cursor-pointer border-0 ${
        isSelected 
          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 shadow-lg' 
          : 'bg-[#1e1e1e] hover:bg-[#252525] hover:shadow-md'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white truncate">{server.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  server.connected && server.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                  server.status === 'disabled' || !server.enabled ? 'bg-gray-500/20 text-gray-400' :
                  server.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  server.status === 'oauth_required' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {server.connected && server.status === 'connected' ? 'CONNECTED' :
                   server.status === 'disabled' || !server.enabled ? 'DISABLED' :
                   server.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Tools:</span>
            <span className="font-mono">{server.tool_count}</span>
          </div>
          <div className="flex justify-between">
            <span>Tokens:</span>
            <span className="font-mono text-blue-400">{server.token_count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Prompts:</span>
            <span className="font-mono">{server.prompt_count}</span>
          </div>
          <div className="flex justify-between">
            <span>Resources:</span>
            <span className="font-mono">{server.resource_count}</span>
          </div>
          {server.has_oauth && (
            <div className="flex justify-between">
              <span>OAuth:</span>
              <div className="flex items-center gap-1">
                {server.oauth?.has_access_token ? (
                  <>
                    <span className="text-xs text-green-400 font-medium">Active</span>
                    {server.oauth.refresh_needed && (
                      <span className="text-xs text-yellow-400">•</span>
                    )}
                  </>
                ) : server.oauth?.client_configured ? (
                  <span className="text-xs text-yellow-400 font-medium">Setup</span>
                ) : (
                  <span className="text-xs text-blue-400 font-medium">Enabled</span>
                )}
              </div>
            </div>
          )}
          {server.url && (
            <div className="flex justify-between">
              <span>URL:</span>
              <span className="text-xs text-gray-300 font-mono truncate max-w-32" title={server.url}>
                {server.url}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  const prevServer = prevProps.server;
  const nextServer = nextProps.server;
  
  return (
    prevServer.name === nextServer.name &&
    prevServer.status === nextServer.status &&
    prevServer.connected === nextServer.connected &&
    prevServer.enabled === nextServer.enabled &&
    prevServer.tool_count === nextServer.tool_count &&
    prevServer.token_count === nextServer.token_count &&
    prevServer.prompt_count === nextServer.prompt_count &&
    prevServer.resource_count === nextServer.resource_count &&
    prevServer.has_oauth === nextServer.has_oauth &&
    prevServer.oauth?.has_access_token === nextServer.oauth?.has_access_token &&
    prevServer.oauth?.refresh_needed === nextServer.oauth?.refresh_needed &&
    prevServer.oauth?.client_configured === nextServer.oauth?.client_configured &&
    prevProps.isSelected === nextProps.isSelected
  );
});

// Tool Card Component
const ToolCard = React.memo(function ToolCard({ 
  tool, 
  expanded, 
  onExpand, 
  paramValues, 
  onParamChange,
  config,
  serviceName
}: {
  tool: MCPTool;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  paramValues: Record<string, any>;
  onParamChange: (param: string, value: any) => void;
  config: any;
  serviceName: string;
}) {
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testing, setTesting] = React.useState(false);

  let params: { name: string; type: string; schema: any; description?: string }[] = [];
  if (tool.inputSchema && tool.inputSchema.properties) {
    params = Object.entries(tool.inputSchema.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'unknown',
      schema: prop,
      description: prop.description || '',
    }));
  }

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/call/${serviceName}/${tool.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arguments: paramValues }),
      });
      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  const renderParamInput = (param: any, value: any) => {
    const onChange = (newValue: any) => onParamChange(param.name, newValue);
    
    switch (param.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          />
        );
      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            className="bg-gray-800 border-gray-600 text-white"
            placeholder="Enter number..."
          />
        );
      case 'array':
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : value || ''}
            onChange={(e) => onChange(e.target.value.split('\n').filter(v => v.trim()))}
            className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
            placeholder="Enter one item per line..."
          />
        );
      case 'object':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            className="bg-gray-800 border-gray-600 text-white min-h-[100px] font-mono text-sm"
            placeholder='Enter JSON object, e.g., {"key": "value"}'
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
            placeholder="Enter text..."
          />
        );
    }
  };

  return (
    <Card
      className={`cursor-pointer border-0 ${
        expanded 
          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 shadow-lg' 
          : 'bg-[#1e1e1e] hover:bg-[#252525] hover:shadow-md'
      }`}
    >
      <CardContent className="p-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-400" />
            {tool.name}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {tool.description || 'No description available.'}
          </p>
          <div className="flex justify-start mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpand(!expanded)}
              className="text-blue-400 hover:text-blue-300"
            >
              {expanded ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-4">
            {/* Parameters */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Parameters</h4>
              {params.length > 0 ? (
                <div className="space-y-3">
                  {params.map((param) => (
                    <div key={param.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-400">{param.name}</span>
                        <span className="text-xs text-gray-500">({param.type})</span>
                      </div>
                      {param.description && (
                        <p className="text-xs text-gray-400">{param.description}</p>
                      )}
                      {renderParamInput(param, paramValues[param.name])}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No parameters required</p>
              )}
            </div>

            {/* Test Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleTest}
                disabled={testing}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {testing ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Tool
                  </>
                )}
              </Button>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Test Results</h4>
                <Card className="border-0 bg-[#0f0f0f] shadow-xl">
                  <CardContent className="p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-60">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});


// Server List Component - Memoized
const ServerList = React.memo(function ServerList({
  servers,
  selectedServerName,
  onSelect
}: {
  servers: MCPServer[];
  selectedServerName: string | null;
  onSelect: (serverName: string) => void;
}) {
  return (
    <div className="space-y-2">
      {servers.map((server) => (
        <ServerCard
          key={server.name}
          server={server}
          isSelected={selectedServerName === server.name}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

// Server Details Panel Component - Memoized
const ServerDetailsPanel = React.memo(function ServerDetailsPanel({
  server,
  actionLoading,
  toolCardState,
  onAction,
  onRestart,
  onDelete,
  onToolExpand,
  onParamChange,
  initialLoading,
  fetchCompleteStatus,
  config
}: {
  server: MCPServer;
  actionLoading: string | null;
  toolCardState: Record<string, { expanded: boolean; paramValues: Record<string, any> }>;
  onAction: (action: 'start' | 'stop', serverName: string) => void;
  onRestart: (serverName: string) => void;
  onDelete: (serverName: string) => void;
  onToolExpand: (toolName: string, expanded: boolean) => void;
  onParamChange: (toolName: string, paramName: string, value: any) => void;
  initialLoading: boolean;
  fetchCompleteStatus: () => void;
  config: any;
}) {
  const [showOutput, setShowOutput] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'prompts' | 'resources'>('tools');

  if (!server) return null;

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
      {/* Header Section */}
      <div className="border-b border-gray-800 bg-[#141414]/80 backdrop-blur-sm">
        <div className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                width="20" 
                height="20" 
                fill="none"
                className="text-white"
              >
                <path 
                  d="M3.49994 11.7501L11.6717 3.57855C12.7762 2.47398 14.5672 2.47398 15.6717 3.57855C16.7762 4.68312 16.7762 6.47398 15.6717 7.57855M15.6717 7.57855L9.49994 13.7501M15.6717 7.57855C16.7762 6.47398 18.5672 6.47398 19.6717 7.57855C20.7762 8.68312 20.7762 10.474 19.6717 11.5785L12.7072 18.543C12.3167 18.9335 12.3167 19.5667 12.7072 19.9572L13.9999 21.2499" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M17.4999 9.74921L11.3282 15.921C10.2237 17.0255 8.43272 17.0255 7.32823 15.921C6.22373 14.8164 6.22373 13.0255 7.32823 11.921L13.4999 5.74939" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{server.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {server.enabled && server.connected ? 
                    <CheckCircle className="h-4 w-4 text-green-400" /> :
                    getStateIcon(server.enabled && server.connected ? 'running' : 
                      server.status === 'error' ? 'errored' : 'stopped')}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    server.enabled && server.connected ? 'bg-green-500/20 text-green-400' :
                    server.status === 'disabled' || !server.enabled ? 'bg-gray-500/20 text-gray-400' :
                    server.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {server.enabled && server.connected ? 'CONNECTED' :
                     server.status === 'disabled' || !server.enabled ? 'DISABLED' :
                     server.status === 'error' ? 'ERROR' :
                     server.status === 'oauth_required' ? 'OAUTH REQUIRED' :
                     server.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Uptime: <Uptime value={server.uptime} /></span>
                </div>
                {server.tool_count !== undefined && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Wrench className="h-4 w-4" />
                    <span>{server.tool_count} tools</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onAction(
                  (server.enabled && server.status === 'enabled') ? 'stop' : 'start', 
                  server.name
                )}
                disabled={actionLoading === ((server.enabled && server.status === 'enabled') ? 'stop' : 'start') + server.name}
                size="sm"
                variant={(server.enabled && server.status === 'enabled') ? 'destructive' : 'default'}
                className="min-w-[80px]"
              >
                {actionLoading === ((server.enabled && server.status === 'enabled') ? 'stop' : 'start') + server.name ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (server.enabled && server.status === 'enabled') ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Disable
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
              </Button>
              <Button
                onClick={() => onRestart(server.name)}
                disabled={actionLoading === 'restart' + server.name}
                size="sm"
                variant="outline"
                className="min-w-[80px]"
              >
                {actionLoading === 'restart' + server.name ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Restart
                  </>
                )}
              </Button>
              <Button
                onClick={fetchCompleteStatus}
                disabled={initialLoading}
                size="sm"
                variant="outline"
              >
                {initialLoading ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/40"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1e1e1e] border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete Server</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Are you sure you want to delete the server "{server.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => onDelete(server.name)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Server Details */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 bg-[#1e1e1e] shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Server Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transport</span>
                <span className="font-mono text-white">{server.transport}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${
                  server.enabled && server.status === 'connected' ? 'text-green-400' : 
                  server.status === 'error' ? 'text-red-400' :
                  server.status === 'oauth_required' ? 'text-yellow-400' :
                  server.enabled ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {server.status === 'connected' ? 'Connected' :
                   server.status === 'error' ? 'Error' :
                   server.status === 'oauth_required' ? 'OAuth Required' :
                   server.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Enabled</span>
                <span className={`font-medium ${server.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {server.enabled ? 'Yes' : 'No'}
                </span>
              </div>
              {server.url && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Endpoint URL</span>
                  <span className="font-mono text-white text-xs truncate max-w-40" title={server.url}>
                    {server.url}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-[#1e1e1e] shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-400" />
                Tool Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tools</span>
                <span className="font-mono text-white">{server.tool_count ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Prompts</span>
                <span className="font-mono text-white">{server.prompt_count ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Resources</span>
                <span className="font-mono text-white">{server.resource_count ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tokens</span>
                <span className="font-mono text-white">{server.token_count ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {server.has_oauth && (
            <Card className="border-0 bg-[#1e1e1e] shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  OAuth Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    {server.oauth?.has_access_token ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-400">Active</span>
                        {server.oauth.refresh_needed && (
                          <span className="text-xs text-yellow-400 bg-yellow-400/20 px-1 rounded">
                            Refresh Needed
                          </span>
                        )}
                      </div>
                    ) : server.oauth?.client_configured ? (
                      <span className="font-medium text-yellow-400">Setup Required</span>
                    ) : (
                      <span className="font-medium text-blue-400">Available</span>
                    )}
                    {!server.oauth?.has_access_token && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => handleOAuthStart(server.name)}
                      >
                        Setup
                      </Button>
                    )}
                  </div>
                </div>
                
                {server.oauth?.has_access_token && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Token Expires</span>
                    <span className={`font-mono text-sm ${server.oauth.refresh_needed ? 'text-yellow-400' : 'text-white'}`}>
                      {server.oauth.access_token_remaining_seconds !== undefined 
                        ? formatTimeRemaining(server.oauth.access_token_remaining_seconds)
                        : 'Unknown'}
                    </span>
                  </div>
                )}
                
                {server.oauth?.access_token_obtained_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Token Obtained</span>
                    <span className="font-mono text-white text-xs">
                      {formatTimestamp(server.oauth.access_token_obtained_at)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Client Config</span>
                  <span className={`font-medium ${server.oauth?.client_configured ? 'text-green-400' : 'text-red-400'}`}>
                    {server.oauth?.client_configured ? 'Configured' : 'Missing'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Provider Config</span>
                  <span className={`font-medium ${server.oauth?.provider_configured ? 'text-green-400' : 'text-red-400'}`}>
                    {server.oauth?.provider_configured ? 'Configured' : 'Missing'}
                  </span>
                </div>
                
                {server.oauth?.has_refresh_token && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Refresh Token</span>
                    <span className="font-medium text-green-400">Available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Terminal Output Section (in details panel) */}
        <div className="mb-8">
          <Button
            variant={showOutput ? "default" : "outline"}
            size="sm"
            className={`mb-2 flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow transition-colors border-0 ${
              showOutput
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-800 text-blue-400 hover:bg-blue-700 hover:text-white'
            }`}
            onClick={() => setShowOutput((v: boolean) => !v)}
            aria-pressed={showOutput}
          >
            {showOutput ? (
              <>
                <Code className="h-4 w-4 mr-1" />
                Hide Terminal Output
              </>
            ) : (
              <>
                <Code className="h-4 w-4 mr-1" />
                Show Terminal Output
              </>
            )}
          </Button>
          {showOutput && (
            <Card className="border-0 bg-[#181818] shadow-inner mt-2">
              <CardContent className="p-4">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-60">
                  {(() => {
                    const stdout = Array.isArray(server.stdout) ? server.stdout : [];
                    const stderr = Array.isArray(server.stderr) ? server.stderr : [];
                    // Defensive: filter for entries with line or text and timestamp
                    const combined = [
                      ...stdout.map(e => ({...e, _stream: 'stdout'})),
                      ...stderr.map(e => ({...e, _stream: 'stderr'})),
                    ].filter(e => (typeof e.line === 'string' || typeof e.text === 'string') && e.timestamp !== undefined);
                    // Sort by timestamp (number or string)
                    combined.sort((a, b) => {
                      if (typeof a.timestamp === 'number' && typeof b.timestamp === 'number') {
                        return a.timestamp - b.timestamp;
                      } else {
                        return String(a.timestamp).localeCompare(String(b.timestamp));
                      }
                    });
                    const output = combined.map(e => e.line ?? e.text ?? '').join('\n');
                    return output || 'No output available.';
                  })()}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Error Display */}
        {server.last_error && (
          <Card className="border-0 bg-red-500/10 border-red-500/20 shadow-xl mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Last Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-red-300 whitespace-pre-wrap overflow-auto max-h-32">
                {server.last_error}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Capabilities Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Server Capabilities</h2>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tools'
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tools ({server.tools?.length || 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'prompts'
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Prompts ({server.prompts?.length || 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resources ({server.resources?.length || 0})
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tools' && (
          <div>
            {!server.tools || server.tools.length === 0 ? (
              <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Wrench className="h-12 w-12 mb-3 opacity-50" />
                    <p>No tools available</p>
                    <p className="text-sm mt-1">This server doesn't expose any tools</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {server.tools.map((tool, index) => (
                  <ToolCard
                    key={tool.name}
                    tool={tool}
                    expanded={toolCardState[tool.name]?.expanded || false}
                    onExpand={(expanded) => onToolExpand(tool.name, expanded)}
                    paramValues={toolCardState[tool.name]?.paramValues || {}}
                    onParamChange={(param, value) => onParamChange(tool.name, param, value)}
                    config={config}
                    serviceName={server.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div>
            {!server.prompts || server.prompts.length === 0 ? (
              <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                    <p>No prompts available</p>
                    <p className="text-sm mt-1">This server doesn't expose any prompts</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {server.prompts.map((prompt, index) => (
                  <Card key={prompt.name} className="border-0 bg-[#1e1e1e] shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                        {prompt.name}
                      </CardTitle>
                      {prompt.description && (
                        <p className="text-sm text-gray-400">{prompt.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Arguments:</h4>
                          <div className="space-y-2">
                            {prompt.arguments.map((arg: any, i: number) => (
                              <div key={i} className="text-sm text-gray-400">
                                <code className="bg-gray-800 px-2 py-1 rounded">{arg.name}</code>
                                {arg.description && <span className="ml-2">{arg.description}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {/* TODO: Implement prompt execution */}}
                      >
                        Use Prompt
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            {!server.resources || server.resources.length === 0 ? (
              <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <FileText className="h-12 w-12 mb-3 opacity-50" />
                    <p>No resources available</p>
                    <p className="text-sm mt-1">This server doesn't expose any resources</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {server.resources.map((resource, index) => (
                  <Card key={resource.uri} className="border-0 bg-[#1e1e1e] shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-400" />
                        {resource.name}
                      </CardTitle>
                      {resource.description && (
                        <p className="text-sm text-gray-400">{resource.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="text-sm">
                          <span className="text-gray-400">URI:</span>
                          <code className="ml-2 bg-gray-800 px-2 py-1 rounded text-xs">{resource.uri}</code>
                        </div>
                        {resource.mimeType && (
                          <div className="text-sm">
                            <span className="text-gray-400">Type:</span>
                            <Badge variant="outline" className="ml-2">{resource.mimeType}</Badge>
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {/* TODO: Implement resource reading */}}
                      >
                        Read Resource
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// --- MCP Marketplace Section ---

// Function to fetch MCP libraries from our API endpoint
const fetchMCPLibrariesFromAPI = async (): Promise<MCPLibrary[]> => {
  try {
    console.log('🌐 Fetching MCP libraries from API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('/api/mcp-libraries', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned error status');
    }
    
    console.log(`✅ Successfully fetched ${data.count} libraries from API`);
    return data.libraries;
    
  } catch (error) {
    console.error('❌ Failed to fetch from API:', error);
    throw error;
  }
};

// --- MCP Marketplace Section REMOVED ---
// MCPManager should not contain any marketplace logic
// Use ToolsMarketplace component for fractalic-tools
// Use MCPMarketplace component for awesome-mcp-servers if needed

const MCPManager: React.FC<MCPManagerProps> = ({ className }) => {
  const { config } = useAppConfig();
  const [servers, setServers] = useState<Record<string, MCPServer>>({});
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<{
    total_services: number;
    enabled_services: number;
    total_tools: number;
    total_prompts: number;
    total_resources: number;
    total_tokens: number;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [toolCardState, setToolCardState] = useState<Record<string, { expanded: boolean; paramValues: Record<string, any> }>>({});
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // MCP Manager state
  const [mcpManagerRunning, setMcpManagerRunning] = useState<boolean | null>(null);
  const [mcpManagerLoading, setMcpManagerLoading] = useState(false);
  const [mcpManagerStatus, setMcpManagerStatus] = useState<{
    status: string;
    api_responsive: boolean;
    exit_code?: number;
    last_pid?: number;
  } | null>(null);
  
  const { toast } = useToast();

  // Debug logging to track re-renders (can be removed in production)
  // console.log('MCPManager render:', {
  //   serverCount: Object.keys(servers).length,
  //   selectedServer: selectedServerName,
  //   loading,
  //   timestamp: new Date().toISOString()
  // });

  const selectedServer = useMemo(() => {
    return selectedServerName ? servers[selectedServerName] : null;
  }, [selectedServerName, servers]);

  // Memoize server statistics - use global stats if available, otherwise calculate
  const serverStats = useMemo(() => {
    if (globalStats) {
      const serversArray = Object.values(servers);
      const connectedServers = serversArray.filter(server => server.connected).length;
      const oauthEnabledServers = serversArray.filter(server => server.has_oauth).length;
      
      return {
        total: globalStats.total_services,
        running: connectedServers,
        totalTokens: globalStats.total_tokens,
        totalTools: globalStats.total_tools,
        totalPrompts: globalStats.total_prompts,
        totalResources: globalStats.total_resources,
        oauthEnabled: oauthEnabledServers
      };
    }
    
    // Fallback calculation if global stats not available
    const serversArray = Object.values(servers);
    const connectedServers = serversArray.filter(server => server.connected);
    const totalTokens = connectedServers.reduce((sum, server) => sum + (server.token_count || 0), 0);
    const totalTools = connectedServers.reduce((sum, server) => sum + (server.tool_count || 0), 0);
    const totalPrompts = connectedServers.reduce((sum, server) => sum + (server.prompt_count || 0), 0);
    const totalResources = connectedServers.reduce((sum, server) => sum + (server.resource_count || 0), 0);
    const oauthEnabledServers = serversArray.filter(server => server.has_oauth).length;
    
    return {
      total: serversArray.length,
      running: connectedServers.length,
      totalTokens,
      totalTools,
      totalPrompts,
      totalResources,
      oauthEnabled: oauthEnabledServers
    };
  }, [servers, globalStats]);

  // Memoize filteredServers only (not the rendered JSX)
  const filteredServers = useMemo(() => {
    const serversArray = Object.values(servers);
    if (!searchFilter.trim()) {
      return serversArray;
    }
    const filterLower = searchFilter.toLowerCase();
    return serversArray.filter(server => 
      server.name?.toLowerCase().includes(filterLower) ||
      server.status?.toLowerCase().includes(filterLower)
    );
  }, [servers, searchFilter]);

  // Use refs for periodic loading/error to avoid re-renders
  const loadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  // State for initial load/fatal error
  const [initialLoading, setInitialLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  // Track if MCP Manager is in startup phase
  const [isStartingUp, setIsStartingUp] = useState(false);

  // Helper function to check if response is SDK V2 format
  const isSDKV2Response = (data: any): data is StatusResponseV2 => {
    return data && typeof data === 'object' && 'services' in data;
  };

  // Helper function to convert SDK V2 service to legacy MCPServer format
  const convertServiceToServer = (name: string, service: ServiceDetails, existingServer?: MCPServer): MCPServer => {
    // Provide defaults for all fields to ensure robustness
    const serviceWithDefaults = {
      enabled: service.enabled ?? false,
      transport: service.transport || 'stdio',
      oauth_required: service.oauth_required ?? false,
      oauth_configured: service.oauth_configured ?? false,
      tools_count: service.tools_count ?? 0,
      ...service
    };
    
    // If we have an existing server and only counts/non-critical fields would change, return the existing object
    if (existingServer) {
      const wouldStateChange = 
        existingServer.status !== (serviceWithDefaults.enabled ? 'connected' : 'disabled') ||
        existingServer.enabled !== serviceWithDefaults.enabled ||
        existingServer.healthy !== serviceWithDefaults.enabled ||
        existingServer.transport !== serviceWithDefaults.transport ||
        existingServer.has_oauth !== (serviceWithDefaults.oauth_required || serviceWithDefaults.oauth_configured || false) ||
        existingServer.oauth_configured !== serviceWithDefaults.oauth_configured;
      
      if (!wouldStateChange) {
        // Return the existing object to maintain referential equality
        return existingServer;
      }
    }

    return {
      name,
      // Map SDK V2 fields to MCPServer format
      status: serviceWithDefaults.enabled ? 'connected' : 'disabled',
      connected: false, // Per-session architecture
      enabled: serviceWithDefaults.enabled,
      transport: serviceWithDefaults.transport,
      has_oauth: serviceWithDefaults.oauth_required || serviceWithDefaults.oauth_configured || false,
      oauth_configured: serviceWithDefaults.oauth_configured,
      url: null,
      command: null,
      // Preserve existing counts if available, otherwise use defaults
      tool_count: existingServer?.tool_count ?? serviceWithDefaults.tools_count ?? 0,
      token_count: existingServer?.token_count ?? serviceWithDefaults.token_count ?? 0,
      tools: [],
      prompt_count: 0,
      prompts: [],
      resource_count: 0,
      resources: [],
      healthy: serviceWithDefaults.enabled,
    };
  };


  // Convert complete service to MCPServer format
  const convertCompleteServiceToServer = (name: string, service: CompleteServiceDetails): MCPServer => {
    return {
      name,
      status: service.status,
      connected: service.connected,
      enabled: service.enabled,
      transport: service.transport,
      has_oauth: service.has_oauth,
      oauth: service.oauth,
      url: service.url,
      command: service.command,
      tool_count: service.tool_count,
      tools: service.tools || [],
      prompt_count: service.prompt_count,
      prompts: service.prompts || [],
      resource_count: service.resource_count,
      resources: service.resources || [],
      token_count: service.token_count,
      capabilities: service.capabilities,
      oauth_configured: service.oauth?.client_configured && service.oauth?.provider_configured,
      healthy: service.connected && service.status === 'connected',
    };
  };

  // Fetch complete status with all data in one request
  const fetchCompleteStatus = useCallback(async (isInitial = false) => {
    // Don't attempt to fetch if MCP Manager API is not responsive
    if (!isInitial && mcpManagerStatus?.status === 'running_not_responsive') {
      return;
    }
    
    if (isInitial) setInitialLoading(true);
    loadingRef.current = true;
    errorRef.current = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/status/complete`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: CompleteStatusResponse = await response.json();
      
      // Validate response structure
      if (!data.complete_data_included || !data.services || typeof data.services !== 'object') {
        throw new Error('Invalid complete status response');
      }

      // Store global statistics
      setGlobalStats({
        total_services: data.total_services,
        enabled_services: data.enabled_services,
        total_tools: data.total_tools,
        total_prompts: data.total_prompts,
        total_resources: data.total_resources,
        total_tokens: data.total_tokens,
      });

      // Convert services to server format
      const serversWithNames = Object.fromEntries(
        Object.entries(data.services)
          .filter(([name, service]) => {
            // Validate each service entry
            if (!name || typeof service !== 'object') {
              console.warn(`Skipping invalid service entry: ${name}`, service);
              return false;
            }
            return true;
          })
          .map(([name, service]) => [
            name,
            convertCompleteServiceToServer(name, service as CompleteServiceDetails)
          ])
      );
      
      // Update servers with referential equality preservation
      setServers(prevServers => {
        const prevKeys = Object.keys(prevServers);
        const newKeys = Object.keys(serversWithNames);
        
        // If server count differs, we need to handle additions/removals
        const serverListChanged = prevKeys.length !== newKeys.length || 
          !newKeys.every(key => key in prevServers);
        
        if (!serverListChanged) {
          // Deep equality check to prevent unnecessary updates
          let hasChanged = false;
          
          for (const key of newKeys) {
            const prev = prevServers[key];
            const current = serversWithNames[key];
            
            // Compare critical fields for changes
            const fieldsChanged = 
              prev.status !== current.status ||
              prev.connected !== current.connected ||
              prev.enabled !== current.enabled ||
              prev.tool_count !== current.tool_count ||
              prev.token_count !== current.token_count ||
              prev.prompt_count !== current.prompt_count ||
              prev.resource_count !== current.resource_count ||
              prev.has_oauth !== current.has_oauth ||
              prev.oauth?.has_access_token !== current.oauth?.has_access_token ||
              prev.oauth?.has_refresh_token !== current.oauth?.has_refresh_token ||
              prev.oauth?.access_token_remaining_seconds !== current.oauth?.access_token_remaining_seconds ||
              prev.oauth?.refresh_needed !== current.oauth?.refresh_needed ||
              prev.oauth?.client_configured !== current.oauth?.client_configured ||
              prev.oauth?.provider_configured !== current.oauth?.provider_configured;
            
            if (fieldsChanged) {
              hasChanged = true;
              break;
            }
          }
          
          if (!hasChanged) {
            return prevServers;
          }
        }
        
        return serversWithNames;
      });
        
      // Auto-select first server if none selected OR if current selection no longer exists
      setSelectedServerName(prevSelected => {
        const availableServers = Object.keys(serversWithNames);
        
        if (!prevSelected && availableServers.length > 0) {
          return availableServers[0];
        }
        
        if (prevSelected && !availableServers.includes(prevSelected)) {
          return availableServers.length > 0 ? availableServers[0] : null;
        }
        
        return prevSelected;
      });
      
      loadingRef.current = false;
      errorRef.current = null;
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch') || e.message?.includes('Connection refused') || e.message?.includes('ECONNREFUSED')) {
        console.log('MCP Manager appears to be stopped, clearing servers list');
        setServers({});
        setSelectedServerName(null);
        setGlobalStats(null);
      }
      
      if (isInitial) {
        setFatalError(e.message || 'Failed to fetch server status');
      }
      loadingRef.current = false;
      errorRef.current = e.message || 'Failed to fetch server status';
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, [config, mcpManagerStatus?.status]);

  // No individual fetch functions needed - all data comes from fetchCompleteStatus

  const handleAction = useCallback(async (action: 'start' | 'stop', serverName: string) => {
    setActionLoading(action + serverName);
    try {
      // Use toggle endpoint for enabling/disabling servers
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/toggle/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: action === 'start' })
      });
      if (!response.ok) throw new Error(`Failed to ${action} server`);
      await fetchCompleteStatus();
      // Refetch tools for currently selected server
      // No need to fetch tools separately, fetchCompleteStatus gets everything
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setActionLoading(null);
    }
  }, [fetchCompleteStatus, selectedServerName, config]);

  const handleRestart = useCallback(async (serverName: string) => {
    setActionLoading('restart' + serverName);
    try {
      // Restart by toggling off then on
      const responseOff = await fetch(`${getApiUrl('mcp_manager', config)}/toggle/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false })
      });
      if (!responseOff.ok) throw new Error('Failed to stop server for restart');
      
      // Small delay before restarting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const responseOn = await fetch(`${getApiUrl('mcp_manager', config)}/toggle/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true })
      });
      if (!responseOn.ok) throw new Error('Failed to start server for restart');
      await fetchCompleteStatus();
      // No need to fetch tools separately, fetchCompleteStatus gets everything
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setActionLoading(null);
    }
  }, [fetchCompleteStatus, selectedServerName, config]);

  const handleToolExpand = useCallback((toolName: string, expanded: boolean) => {
    setToolCardState(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        expanded,
      },
    }));
  }, []);

  const handleParamChange = useCallback((toolName: string, paramName: string, value: any) => {
    setToolCardState(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        paramValues: {
          ...((prev[toolName] && prev[toolName].paramValues) || {}),
          [paramName]: value,
        },
      },
    }));
  }, []);

  // Memoize the server selection handler to prevent unnecessary re-renders
  const handleServerSelect = useCallback((serverName: string) => {
    setSelectedServerName(serverName);
  }, []);

  // Memoize the search filter handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  }, []);

  // Handle OAuth setup for a server
  const handleOAuthStart = useCallback(async (serverName: string) => {
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/oauth/start/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.auth_url) {
        // Open OAuth URL in a new window
        window.open(result.auth_url, 'oauth', 'width=600,height=700');
        
        toast({
          title: "OAuth Setup Started",
          description: `Please complete authentication for ${serverName} in the popup window.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      
      toast({
        title: "OAuth Setup Failed",
        description: `Failed to start OAuth for ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [config, toast]);

  // Handle adding a new server
  const handleAddServer = useCallback(async (serverConfig: any) => {
    console.log('Adding new MCP server:', serverConfig);
    
    try {
      // Prepare the request payload
      let requestPayload;
      
      if (serverConfig.type === 'json') {
        // JSON configuration - send as-is to backend
        requestPayload = {
          jsonConfig: serverConfig.jsonConfig,
          type: 'json'
        };
      } else {
        // Manual/URL-based server configuration
        requestPayload = {
          name: serverConfig.name,
          url: serverConfig.url || serverConfig.serverUrl,
          config: {
            type: serverConfig.type || 'manual',
            transport: serverConfig.transport || 'http',
            auth: serverConfig.auth || null,
            capabilities: serverConfig.capabilities || ['tools', 'resources']
          }
        };
      }
      
      // Send server configuration to backend
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/add_server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Server added successfully:', result);
      
      // Show success message with toast notification
      const serverName = serverConfig.name || 'server';
      toast({
        title: "Server Added Successfully",
        description: `Server "${serverName}" has been successfully added to Fractalic!`,
        variant: "default",
      });
      
      // Refresh server status to show the new server
      await fetchCompleteStatus();
      
    } catch (error) {
      console.error('Failed to add server:', error);
      
      // Show error message with toast notification
      const serverName = serverConfig.name || 'server';
      toast({
        title: "Failed to Add Server",
        description: `Failed to add ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [fetchCompleteStatus, config]);

  // Handle deleting a server
  const handleDeleteServer = useCallback(async (serverName: string) => {
    console.log('Deleting MCP server:', serverName);
    
    try {
      // Send delete request to backend
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/delete_server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: serverName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Server deleted successfully:', result);
      
      // Show success message with toast notification
      toast({
        title: "Server Deleted Successfully",
        description: `Server "${serverName}" has been successfully deleted from Fractalic!`,
        variant: "default",
      });
      
      // If the deleted server was selected, clear the selection
      if (selectedServerName === serverName) {
        setSelectedServerName(null);
      }
      
      // Refresh server status to remove the deleted server
      await fetchCompleteStatus();
      
    } catch (error) {
      console.error('Failed to delete server:', error);
      
      // Show error message with toast notification
      toast({
        title: "Failed to Delete Server",
        description: `Failed to delete ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [fetchCompleteStatus, selectedServerName, toast, config]);

  // Add ref to track if status check is in progress
  const statusCheckInProgress = useRef(false);

  // Check MCP Manager status by trying to reach it on port 5859 (source of truth)
  const checkMcpManagerStatus = useCallback(async () => {
    // Prevent concurrent status checks
    if (statusCheckInProgress.current) {
      console.log('Status check already in progress, skipping...');
      return;
    }
    
    statusCheckInProgress.current = true;
    
    try {
      // Try to reach MCP manager directly on port 5859 with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Only update if state actually changed to prevent unnecessary re-renders
        if (mcpManagerStatus?.status !== 'running' || !mcpManagerStatus?.api_responsive) {
          console.log('MCP Manager is running and responsive');
          setMcpManagerRunning(true);
          setMcpManagerStatus({
            status: 'running',
            api_responsive: true,
            exit_code: undefined,
            last_pid: undefined
          });
        }
      } else {
        // HTTP error response - MCP Manager is running but API not fully ready
        if (mcpManagerStatus?.status !== 'running_not_responsive') {
          console.log('MCP Manager is running but API not responsive');
          setMcpManagerRunning(true);
          setMcpManagerStatus({
            status: 'running_not_responsive',
            api_responsive: false,
            exit_code: undefined,
            last_pid: undefined
          });
          setMcpManagerRunning(true);
        }
      }
    } catch (error) {
      // Can't reach port 5859 - MCP Manager is not running
      // Only update if state actually changed
      if (mcpManagerStatus?.status !== 'not_started' || mcpManagerStatus?.api_responsive !== false) {
        console.log('MCP Manager is not running (port 5859 unreachable)');
        setMcpManagerRunning(false);
        setMcpManagerStatus({
          status: 'not_started',
          api_responsive: false
        });
      }
    } finally {
      statusCheckInProgress.current = false;
    }
  }, [config, mcpManagerStatus?.status, mcpManagerStatus?.api_responsive]);

  // Handle MCP Manager start/stop
  const handleMcpManagerAction = useCallback(async (action: 'start' | 'stop') => {
    setMcpManagerLoading(true);
    if (action === 'start') {
      setIsStartingUp(true);
    }
    
    try {
      const response = await fetch(`${getApiUrl('backend', config)}/mcp/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} MCP Manager: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`MCP Manager ${action} result:`, result);
      
      // Show success message
      toast({
        title: `MCP Manager ${action === 'start' ? 'Started' : 'Stopped'}`,
        description: `MCP Manager has been successfully ${action === 'start' ? 'started' : 'stopped'}.`,
        variant: "default",
      });
      
      // Handle different actions
      if (action === 'stop') {
        // Clear startup state immediately on stop
        setIsStartingUp(false);
        // Immediately clear servers list and selection when stopping
        setServers({});
        setSelectedServerName(null);
        // Update status immediately
        setTimeout(() => {
          checkMcpManagerStatus();
        }, 500);
      } else {
        // For start action, wait longer and use retry logic
        setTimeout(async () => {
          // Retry status check up to 5 times with increasing delays
          let retryCount = 0;
          const maxRetries = 5;
          const checkWithRetry = async (): Promise<void> => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              
              const response = await fetch(`${getApiUrl('mcp_manager', config)}/status`, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                // Success! Now do the normal status check
                console.log('MCP Manager is ready, completing startup sequence');
                setIsStartingUp(false);
                await checkMcpManagerStatus();
                setTimeout(() => {
                  fetchCompleteStatus();
                }, 1000);
                return;
              }
              throw new Error(`HTTP ${response.status}`);
              
            } catch (error) {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`MCP Manager not ready yet, retry ${retryCount}/${maxRetries} in ${retryCount * 1000}ms...`);
                setTimeout(checkWithRetry, retryCount * 1000); // Increasing delay: 1s, 2s, 3s, 4s
              } else {
                console.log('MCP Manager failed to start after max retries, doing final status check');
                setIsStartingUp(false);
                await checkMcpManagerStatus();
              }
            }
          };
          
          await checkWithRetry();
        }, 2000); // Start checking after 2 seconds instead of 1
      }
      
    } catch (error) {
      console.error(`Failed to ${action} MCP Manager:`, error);
      
      // Clear startup state on error
      if (action === 'start') {
        setIsStartingUp(false);
      }
      
      toast({
        title: `Failed to ${action === 'start' ? 'Start' : 'Stop'} MCP Manager`,
        description: error instanceof Error ? error.message : `Unknown error occurred while trying to ${action} MCP Manager`,
        variant: "destructive",
      });
      
      // Still refresh status to get current state
      setTimeout(() => {
        checkMcpManagerStatus();
      }, 1000);
    } finally {
      setMcpManagerLoading(false);
    }
  }, [toast, fetchCompleteStatus, checkMcpManagerStatus, config]);

  // Initial fetch on mount - check MCP manager first
  useEffect(() => {
    checkMcpManagerStatus();
  }, [checkMcpManagerStatus]);

  // Watch for MCP manager status changes and fetch servers accordingly
  useEffect(() => {
    if (mcpManagerStatus?.status === 'running' && mcpManagerStatus?.api_responsive) {
      // MCP manager is running and responsive, fetch server status
      fetchCompleteStatus(true);
    } else if (mcpManagerStatus?.status === 'not_started') {
      // MCP manager is not running, stop initial loading
      setInitialLoading(false);
    }
  }, [mcpManagerStatus?.status, mcpManagerStatus?.api_responsive, fetchCompleteStatus]);

  // No need to fetch additional data - all data is embedded in server objects
  // Tools, prompts, and resources are available directly from selectedServer

  // Use refs to maintain stable references for polling functions
  const fetchCompleteStatusRef = useRef(fetchCompleteStatus);
  const checkMcpManagerStatusRef = useRef(checkMcpManagerStatus);
  
  // Update refs when functions change
  useEffect(() => {
    fetchCompleteStatusRef.current = fetchCompleteStatus;
  }, [fetchCompleteStatus]);
  
  useEffect(() => {
    checkMcpManagerStatusRef.current = checkMcpManagerStatus;
  }, [checkMcpManagerStatus]);

  // Poll server status with intelligent intervals based on MCP Manager state
  useEffect(() => {
    const getPollingInterval = () => {
      if (mcpManagerStatus?.status === 'running_not_responsive') {
        // During startup, poll more frequently to catch when API becomes responsive
        return 5000; // 5 seconds (was 3)
      } else if (mcpManagerStatus?.status === 'running' && mcpManagerStatus?.api_responsive) {
        // Slower polling when everything is working to reduce load
        return 15000; // 15 seconds (was 8)
      } else {
        // Slower polling for stopped/terminated states
        return 30000; // 30 seconds (was 15)
      }
    };

    const poll = () => {
      // Skip polling during startup phase to avoid conflicts
      if (isStartingUp) {
        console.log('Skipping poll during startup phase');
        return;
      }
      
      // Always check MCP Manager status, but reduce logging noise
      checkMcpManagerStatusRef.current();
      
      // Only fetch server status if MCP Manager is API responsive
      if (mcpManagerStatus?.status === 'running' && mcpManagerStatus?.api_responsive) {
        fetchCompleteStatusRef.current();
      } else if (mcpManagerStatus?.status === 'not_started' || mcpManagerStatus?.status === 'terminated') {
        // Clear servers list if MCP Manager is not running
        setServers(prev => Object.keys(prev).length > 0 ? {} : prev);
        setSelectedServerName(prev => prev ? null : prev);
      }
      // For 'running_not_responsive', just wait - don't try to fetch server status
    };

    // Don't poll immediately - wait for the interval
    // This prevents double-fetching when status changes
    const intervalTime = getPollingInterval();
    const interval = setInterval(poll, intervalTime);
    
    return () => clearInterval(interval);
  }, [mcpManagerStatus?.status, mcpManagerStatus?.api_responsive, isStartingUp]);

  // If marketplace is active, render it with full space and its own header
  if (showMarketplace) {
    return (
      <div className={`h-full w-full bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] ${className || ''}`}>
        <div className="h-full">
          {/* Marketplace Header */}
          <div className="p-6 border-b border-gray-800 bg-[#141414]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-xl text-white">MCP Manager - Marketplace</h1>
                <p className="text-sm text-gray-400">Discover and install new MCP servers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMarketplace(false)}
              >
                Back to Servers
              </Button>
            </div>
          </div>
          {/* Marketplace Content */}
          <div className="h-[calc(100%-120px)]">
            <ToolsMarketplace />
          </div>
        </div>
      </div>
    );
  }

  // Normal server management interface
  return (
    <div className={`h-full w-full bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] ${className || ''}`}>
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Left: Server List */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
          <div className="h-full bg-[#141414] border-r border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Server className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="font-bold text-xl text-white">MCP Manager</h1>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-400">
                        {serverStats.running} of {serverStats.total} servers running
                      </p>
                      {serverStats.totalTools > 0 && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-xs text-gray-400">
                            {serverStats.totalTools} tools
                          </span>
                        </>
                      )}
                      {serverStats.oauthEnabled > 0 && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-xs text-blue-400">
                            {serverStats.oauthEnabled} OAuth
                          </span>
                        </>
                      )}
                      {mcpManagerStatus && (
                        <>
                          <span className="text-gray-500">•</span>
                          <div className="flex items-center gap-1">
                            {mcpManagerStatus.status === 'running' && mcpManagerStatus.api_responsive && (
                              <>
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-xs text-green-400">Running</span>
                              </>
                            )}
                            {mcpManagerStatus.status === 'running_not_responsive' && (
                              <>
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-yellow-400">Starting API...</span>
                              </>
                            )}
                            {mcpManagerStatus.status === 'terminated' && (
                              <>
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                <span className="text-xs text-red-400">
                                  Crashed {mcpManagerStatus.exit_code && `(exit ${mcpManagerStatus.exit_code})`}
                                </span>
                              </>
                            )}
                            {mcpManagerStatus.status === 'not_started' && (
                              <>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-400">Not started</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {serverStats.totalTokens > 0 && (
                      <p className="text-xs text-gray-400">
                        {serverStats.totalTokens.toLocaleString()} schema tokens
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Show start button when not running or terminated */}
                  {(mcpManagerStatus?.status === 'not_started' || mcpManagerStatus?.status === 'terminated' || mcpManagerRunning === false) && (
                    <Button
                      onClick={() => handleMcpManagerAction('start')}
                      disabled={mcpManagerLoading}
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {mcpManagerLoading ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-1" />
                          Start Manager
                        </>
                      )}
                    </Button>
                  )}
                  {/* Show stop button when running (regardless of API responsiveness) */}
                  {(mcpManagerStatus?.status === 'running' || mcpManagerStatus?.status === 'running_not_responsive' || mcpManagerRunning === true) && (
                    <Button
                      onClick={() => handleMcpManagerAction('stop')}
                      disabled={mcpManagerLoading}
                      size="sm"
                      variant="destructive"
                    >
                      {mcpManagerLoading ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <PowerOff className="h-4 w-4 mr-1" />
                          Stop Manager
                        </>
                      )}
                    </Button>
                  )}
                  {/* Show restart button for crashed processes */}
                  {mcpManagerStatus?.status === 'terminated' && mcpManagerStatus.exit_code && (
                    <Button
                      onClick={() => handleMcpManagerAction('start')}
                      disabled={mcpManagerLoading}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      {mcpManagerLoading ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCw className="h-4 w-4 mr-1" />
                          Restart
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {/* Add Server Button */}
              <Button
                variant="default"
                size="sm"
                className="w-full bg-gradient-to-r from-green-800 to-emerald-800 hover:from-green-700 hover:to-emerald-700 text-white flex items-center gap-2 shadow-lg"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Server
              </Button>
              {/* Marketplace Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowMarketplace(true)}
              >
                Browse Marketplace
              </Button>
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search servers..."
                  value={searchFilter}
                  onChange={handleSearchChange}
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <ServerList
                  servers={filteredServers}
                  selectedServerName={selectedServerName}
                  onSelect={handleServerSelect}
                />
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700 transition-colors" />
        
        {/* Right: Server Details */}
        <ResizablePanel defaultSize={70} minSize={55}>
          <div className="h-full">
            {selectedServer ? (
              <ScrollArea className="h-full">
                <ServerDetailsPanel
                  server={selectedServer}
                  actionLoading={actionLoading}
                  toolCardState={toolCardState}
                  onAction={handleAction}
                  onRestart={handleRestart}
                  onDelete={handleDeleteServer}
                  onToolExpand={handleToolExpand}
                  onParamChange={handleParamChange}
                  initialLoading={initialLoading}
                  fetchCompleteStatus={fetchCompleteStatus}
                  config={config}
                />
              </ScrollArea>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-fit">
                    <Server className="h-16 w-16 text-gray-500 mx-auto" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-300 mb-2">Select a Server</h3>
                    <p className="text-gray-500">Choose a server from the left panel to view its details and tools</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Add Server Dialog */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddServer={handleAddServer}
      />
    </div>
  );
};

export default MCPManager;
