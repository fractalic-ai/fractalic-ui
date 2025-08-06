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
  Trash2
} from 'lucide-react';

interface MCPServer {
  name: string;
  state: string;
  pid: number | null;
  transport: string;
  retries: number;
  uptime: number | null;
  healthy: boolean;
  restarts: number;
  last_error: string | null;
  stdout: any[];
  stderr: any[];
  last_output_renewal: number | null;
  tool_count?: number;
  token_count?: number;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
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
                  server.state === 'running' ? 'bg-green-500/20 text-green-400' :
                  server.state === 'stopped' ? 'bg-gray-500/20 text-gray-400' :
                  server.state === 'errored' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {server.state.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>PID:</span>
            <span className="font-mono">{server.pid || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime:</span>
            <Uptime value={server.uptime} />
          </div>
          {server.tool_count !== undefined && (
            <div className="flex justify-between">
              <span>Tools:</span>
              <span className="font-mono">{server.tool_count}</span>
            </div>
          )}
          {server.token_count !== undefined && server.token_count > 0 && (
            <div className="flex justify-between">
              <span>Tokens:</span>
              <span className="font-mono text-blue-400">{server.token_count.toLocaleString()}</span>
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
    prevServer.state === nextServer.state &&
    prevServer.pid === nextServer.pid &&
    prevServer.healthy === nextServer.healthy &&
    prevServer.uptime === nextServer.uptime &&
    prevServer.tool_count === nextServer.tool_count &&
    prevServer.retries === nextServer.retries &&
    prevServer.restarts === nextServer.restarts &&
    prevServer.last_error === nextServer.last_error &&
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
  config
}: {
  tool: MCPTool;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  paramValues: Record<string, any>;
  onParamChange: (param: string, value: any) => void;
  config: any;
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
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/call_tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tool.name, arguments: paramValues }),
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
  tools,
  toolsLoading,
  actionLoading,
  toolCardState,
  onAction,
  onRestart,
  onDelete,
  onToolExpand,
  onParamChange,
  initialLoading,
  fetchStatus,
  config
}: {
  server: MCPServer;
  tools: MCPTool[];
  toolsLoading: boolean;
  actionLoading: string | null;
  toolCardState: Record<string, { expanded: boolean; paramValues: Record<string, any> }>;
  onAction: (action: 'start' | 'stop', serverName: string) => void;
  onRestart: (serverName: string) => void;
  onDelete: (serverName: string) => void;
  onToolExpand: (toolName: string, expanded: boolean) => void;
  onParamChange: (toolName: string, paramName: string, value: any) => void;
  initialLoading: boolean;
  fetchStatus: () => void;
  config: any;
}) {
  const [showOutput, setShowOutput] = useState(false);

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
                  {getStateIcon(server.state)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    server.state === 'running' ? 'bg-green-500/20 text-green-400' :
                    server.state === 'stopped' ? 'bg-gray-500/20 text-gray-400' :
                    server.state === 'errored' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {server.state.toUpperCase()}
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
                onClick={() => onAction(server.state === 'running' ? 'stop' : 'start', server.name)}
                disabled={actionLoading === (server.state === 'running' ? 'stop' : 'start') + server.name}
                size="sm"
                variant={server.state === 'running' ? 'destructive' : 'default'}
                className="min-w-[80px]"
              >
                {actionLoading === (server.state === 'running' ? 'stop' : 'start') + server.name ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : server.state === 'running' ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
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
                onClick={fetchStatus}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-[#1e1e1e] shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Server Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Process ID</span>
                <span className="font-mono text-white">{server.pid || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transport</span>
                <span className="font-mono text-white">{server.transport}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Healthy</span>
                <span className={`font-medium ${server.healthy ? 'text-green-400' : 'text-red-400'}`}>
                  {server.healthy ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Retries</span>
                <span className="font-mono text-white">{server.retries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Restarts</span>
                <span className="font-mono text-white">{server.restarts}</span>
              </div>
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
                <span className="text-gray-400">Tool Count</span>
                <span className="font-mono text-white">{server.tool_count ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Token Count</span>
                <span className="font-mono text-white">{server.token_count ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Last Output Renewal</span>
                <span className="font-mono text-white">
                  {server.last_output_renewal && !isNaN(server.last_output_renewal) && server.last_output_renewal > 0
                    ? new Date(server.last_output_renewal * 1000).toLocaleTimeString()
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
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

        {/* Tools Section */}
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Available Tools</h2>
          {toolsLoading && (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {toolsLoading ? (
          <Card className="border-0 bg-[#1e1e1e] shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading tools...</span>
              </div>
            </CardContent>
          </Card>
        ) : !tools || tools.length === 0 ? (
          <Card className="border-0 bg-[#1e1e1e] shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <Code className="h-12 w-12 mb-3 opacity-50" />
                <p>No tools available</p>
                <p className="text-sm mt-1">This server doesn't expose any tools</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tools.map((tool, index) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                expanded={toolCardState[tool.name]?.expanded || false}
                onExpand={(expanded) => onToolExpand(tool.name, expanded)}
                paramValues={toolCardState[tool.name]?.paramValues || {}}
                onParamChange={(param, value) => onParamChange(tool.name, param, value)}
                config={config}
              />
            ))}
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

// Function to fetch markdown content from awesome-mcp-servers with multiple fallbacks
const fetchAwesomeMCPServers = async (): Promise<string> => {
  const urls = [
    'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md',
    'https://api.github.com/repos/punkpeye/awesome-mcp-servers/contents/README.md'
  ];
  
  let lastError: Error | null = null;
  
  for (const url of urls) {
    try {
      console.log(`🌐 Attempting to fetch from: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': url.includes('api.github.com') ? 'application/vnd.github.v3.raw' : 'text/plain',
          'User-Agent': 'MCPMarketplace/1.0',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Response from ${url}:`, response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      if (!text || text.length < 100) {
        throw new Error('Received empty or invalid content');
      }
      
      console.log(`✅ Successfully fetched ${text.length} characters from ${url}`);
      return text;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`❌ Failed to fetch from ${url}:`, lastError.message);
      
      if (lastError.name === 'AbortError') {
        console.warn('⏱️ Request timed out');
      }
      // Continue to next URL
    }
  }
  
  throw lastError || new Error('All fetch attempts failed');
};

// Function to parse markdown and extract MCP server information
const parseMarkdownToMCPLibraries = (markdown: string): MCPLibrary[] => {
  const libraries: MCPLibrary[] = [];
  const lines = markdown.split('\n');
  
  console.log('Starting to parse markdown, total lines:', lines.length);
  
  let currentCategory = 'General';
  let inServerSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, HTML anchor tags, and other non-content lines
    if (!line || 
        line.startsWith('<a name=') || 
        line.startsWith('<a id=') ||
        line.startsWith('<!--') ||
        line.startsWith('[!') ||
        line.includes('🏎️') || 
        line.includes('📇') ||
        line.includes('Back to top')) {
      continue;
    }
    
    // Check if we're in the servers section - look for "Servers" in headers
    if (line.startsWith('## ') && line.toLowerCase().includes('server')) {
      inServerSection = true;
      currentCategory = 'Servers';
      console.log('Found servers section');
      continue;
    }
    
    // Skip table of contents and other sections before servers
    if (!inServerSection) continue;
    
    // Extract category from headers (### or #### level)
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      // Clean category name by removing emojis, HTML, and anchor links
      currentCategory = line
        .replace(/^#+\s*/, '')
        .replace(/[📁🔧⚡🌐🔍💾🛠️📊🎯🔒🎮📝🌍🏎️📇🏠☁️🍎🪟🐧🎨🎵🔗📈📄🌟]/g, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Skip if it looks like an anchor or empty
      if (currentCategory.includes('name=') || !currentCategory || currentCategory.length < 2) {
        continue;
      }
      
      console.log('Updated category to:', currentCategory);
      continue;
    }
    
    // Parse server entries - look for markdown links in list format
    const serverMatch = line.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*[-–—]?\s*(.*)$/);
    
    if (serverMatch) {
      const [, name, url, description] = serverMatch;
      
      // Skip entries that are clearly not MCP servers
      const skipPatterns = [
        /tutorials?/i,
        /quickstart/i,
        /reddit/i,
        /discord/i,
        /community/i,
        /setup.*claude/i,
        /getting.?started/i,
        /how.?to/i,
        /^docs?$/i,
        /^guide$/i
      ];
      
      const shouldSkip = skipPatterns.some(pattern => 
        pattern.test(name) || pattern.test(description)
      );
      
      if (shouldSkip) {
        console.log('Skipping non-server entry:', name);
        continue;
      }
      
      // Enhanced description cleaning
      let cleanDescription = description
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
        .replace(/�\s*/g, '') // Remove replacement characters
        .replace(/&[a-z]+;/gi, '') // Remove HTML entities
        .replace(/^\s*[-–—]\s*/, '') // Remove leading dashes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // If description is empty, unclear, or looks like HTML/anchor, use a default
      if (!cleanDescription || 
          cleanDescription.includes('name=') || 
          cleanDescription.length < 10 ||
          /^[^a-zA-Z]*$/.test(cleanDescription)) {
        cleanDescription = 'No description available';
      }
      
      console.log('Found server:', name, 'in category:', currentCategory);
      
      // Generate ID from name
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Check for duplicates before adding
      const duplicate = libraries.find(existing => 
        existing.name === name.trim() || 
        existing.docs === url ||
        existing.id === id
      );
      
      if (duplicate) {
        console.log('Skipping duplicate:', name.trim(), 'already exists as:', duplicate.name);
        continue;
      }
      
      // Generate install command based on GitHub URL
      let install = '';
      if (url.includes('github.com')) {
        const repoPath = url.replace('https://github.com/', '').replace(/\/$/, '');
        const repoParts = repoPath.split('/');
        if (repoParts.length >= 2) {
          // Use the repository name for npx command
          install = `npx ${repoParts[1]}`;
        }
      } else {
        install = `npm install ${id}`;
      }
      
      // Generate icon URL from GitHub
      let icon = '';
      let author = '';
      let repository = '';
      if (url.includes('github.com')) {
        const repoPath = url.replace('https://github.com/', '').replace(/\/$/, '');
        const repoParts = repoPath.split('/');
        if (repoParts.length >= 2) {
          author = repoParts[0];
          repository = repoParts[1];
          icon = `https://github.com/${repoParts[0]}.png?size=40`;
        }
      }
      
      // Generate sample config JSON
      const config = {
        mcpServers: {
          [id]: {
            command: install.startsWith('npx') ? install.split(' ')[1] : 'node',
            args: install.startsWith('npx') ? [] : [install.split(' ').slice(1).join(' ')],
            env: {}
          }
        }
      };
      
      libraries.push({
        name: name.trim(),
        id,
        description: cleanDescription,
        category: currentCategory,
        install,
        docs: url,
        icon,
        author,
        repository,
        config,
        tags: [currentCategory.toLowerCase()],
        version: "latest",
        license: "Unknown"
      });
      
      console.log('Added library:', name.trim(), 'ID:', id, 'Category:', currentCategory);
    }
  }
  
  console.log('Parsing complete. Found', libraries.length, 'libraries');
  return libraries;
};

// Fallback hardcoded libraries in case fetching fails
const FALLBACK_MCP_LIBRARIES: MCPLibrary[] = [
  {
    name: "Tavily MCP Server",
    id: "tavily-mcp-server",
    description: "Enable real-time web search and data extraction capabilities for LLMs. Integrates Tavily's advanced search API for up-to-date information.",
    category: "Web Search",
    install: "npx @tavily-ai/tavily-mcp@latest",
    docs: "https://github.com/tavily-ai/tavily-mcp",
    icon: "https://github.com/tavily-ai.png?size=40",
    author: "tavily-ai",
    repository: "tavily-mcp",
    tags: ["search", "web", "api"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "tavily-mcp-server": {
          command: "npx",
          args: ["@tavily-ai/tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "your-tavily-api-key-here"
          }
        }
      }
    }
  },
  {
    name: "Exa Search MCP Server",
    id: "exa-mcp-server",
    description: "Fast, intelligent web search and crawling. Exa combines embeddings and traditional search to deliver the best results for LLMs.",
    category: "Web Search",
    install: "npx exa-mcp-server@latest",
    docs: "https://github.com/exa-ai/exa-mcp-server",
    icon: "https://github.com/exa-ai.png?size=40",
    author: "exa-ai",
    repository: "exa-mcp-server",
    tags: ["search", "embeddings", "crawling"],
    version: "latest",
    license: "Apache-2.0",
    config: {
      mcpServers: {
        "exa-mcp-server": {
          command: "npx",
          args: ["exa-mcp-server@latest"],
          env: {
            EXA_API_KEY: "your-exa-api-key-here"
          }
        }
      }
    }
  },
  {
    name: "Filesystem MCP Server",
    id: "filesystem-mcp-server",
    description: "Secure file system operations for LLMs. Read, write, and manage files with built-in safety restrictions.",
    category: "File System",
    install: "@modelcontextprotocol/server-filesystem",
    docs: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    icon: "https://github.com/modelcontextprotocol.png?size=40",
    author: "modelcontextprotocol",
    repository: "servers",
    tags: ["filesystem", "files", "security"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "filesystem": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
          env: {}
        }
      }
    }
  },
  {
    name: "GitHub MCP Server",
    id: "github-mcp-server",
    description: "Integrate with GitHub repositories. Search code, create issues, manage pull requests, and access repository information.",
    category: "Development",
    install: "@modelcontextprotocol/server-github",
    docs: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    icon: "https://github.com/modelcontextprotocol.png?size=40",
    author: "modelcontextprotocol",
    repository: "servers",
    tags: ["github", "git", "development"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "github": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: "your-github-token-here"
          }
        }
      }
    }
  },
  {
    name: "SQLite MCP Server",
    id: "sqlite-mcp-server",
    description: "Execute SQL queries against SQLite databases. Perfect for data analysis and database management tasks.",
    category: "Database",
    install: "@modelcontextprotocol/server-sqlite",
    docs: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite",
    icon: "https://github.com/modelcontextprotocol.png?size=40",
    author: "modelcontextprotocol",
    repository: "servers",
    tags: ["database", "sql", "sqlite"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "sqlite": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
          env: {}
        }
      }
    }
  }
];

const MCPManager: React.FC<MCPManagerProps> = ({ className }) => {
  const { config } = useAppConfig();
  const [servers, setServers] = useState<Record<string, MCPServer>>({});
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
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

  // Memoize server statistics
  const serverStats = useMemo(() => {
    const serversArray = Object.values(servers);
    const runningServers = serversArray.filter(server => server.state === 'running');
    const totalTokens = runningServers.reduce((sum, server) => sum + (server.token_count || 0), 0);
    
    return {
      total: serversArray.length,
      running: runningServers.length,
      totalTokens
    };
  }, [servers]);

  // Memoize filteredServers only (not the rendered JSX)
  const filteredServers = useMemo(() => {
    const serversArray = Object.values(servers);
    if (!searchFilter.trim()) {
      return serversArray;
    }
    const filterLower = searchFilter.toLowerCase();
    return serversArray.filter(server => 
      server.name?.toLowerCase().includes(filterLower) ||
      server.state?.toLowerCase().includes(filterLower)
    );
  }, [servers, searchFilter]);

  // Use refs for periodic loading/error to avoid re-renders
  const loadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  // State for initial load/fatal error
  const [initialLoading, setInitialLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Optimized fetchStatus with change detection
  const fetchStatus = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    loadingRef.current = true;
    errorRef.current = null;
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const serversWithNames = Object.fromEntries(
        Object.entries(data).map(([name, server]: [string, any]) => [
          name,
          { ...server, name }
        ])
      );
      setServers(prevServers => {
        // Quick check: if server count differs, update
        const prevKeys = Object.keys(prevServers);
        const newKeys = Object.keys(serversWithNames);
        if (prevKeys.length !== newKeys.length) {
          return serversWithNames;
        }
        
        // Deep equality check to prevent unnecessary updates
        let hasChanged = false;
        
        for (const key of newKeys) {
          const prev = prevServers[key];
          const current = serversWithNames[key];
          
          if (!prev) {
            hasChanged = true;
            break; // Early exit if we found a change
          } else {
            // Compare only the fields that matter for UI rendering
            const fieldsChanged = 
              prev.state !== current.state ||
              prev.pid !== current.pid ||
              prev.healthy !== current.healthy ||
              prev.uptime !== current.uptime ||
              prev.tool_count !== current.tool_count ||
              prev.retries !== current.retries ||
              prev.restarts !== current.restarts ||
              prev.last_error !== current.last_error;
            
            if (fieldsChanged) {
              hasChanged = true;
              break; // Early exit if we found a change
            }
          }
        }
        
        // If nothing changed, return the exact same reference
        if (!hasChanged) {
          return prevServers;
        }
        
        // Only create new objects if something actually changed
        const updatedServers: Record<string, MCPServer> = {};
        for (const key of newKeys) {
          const prev = prevServers[key];
          const current = serversWithNames[key];

          if (!prev) {
            // Only add new server if it did not exist before
            updatedServers[key] = current;
          } else {
            // Compare again to decide whether to reuse or update
            const fieldsChanged = 
              prev.state !== current.state ||
              prev.pid !== current.pid ||
              prev.healthy !== current.healthy ||
              prev.uptime !== current.uptime ||
              prev.tool_count !== current.tool_count ||
              prev.retries !== current.retries ||
              prev.restarts !== current.restarts ||
              prev.last_error !== current.last_error;

            if (fieldsChanged) {
              updatedServers[key] = { ...prev, ...current };
            } else {
              updatedServers[key] = prev;
            }
          }
        }
        
        return updatedServers;
      });
        
      // Auto-select first server if none selected OR if current selection no longer exists
      setSelectedServerName(prevSelected => {
        const availableServers = Object.keys(data);
        
        // If no server is selected and servers are available, select the first one
        if (!prevSelected && availableServers.length > 0) {
          return availableServers[0];
        }
        
        // If current selection still exists, keep it
        if (prevSelected && availableServers.includes(prevSelected)) {
          return prevSelected;
        }
        
        // If current selection no longer exists, select first available or null
        return availableServers.length > 0 ? availableServers[0] : null;
      });
      loadingRef.current = false;
      errorRef.current = null;
    } catch (e: any) {
      // If MCP Manager is stopped, clear servers list
      if (e.message?.includes('Failed to fetch') || e.message?.includes('Connection refused') || e.message?.includes('ECONNREFUSED')) {
        console.log('MCP Manager appears to be stopped, clearing servers list');
        setServers({});
        setSelectedServerName(null);
        setTools([]);
      }
      
      if (isInitial) {
        setFatalError(e.message || 'Failed to fetch server status');
      }
      loadingRef.current = false;
      errorRef.current = e.message || 'Failed to fetch server status';
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, [config]);

  const fetchTools = useCallback(async (serverName: string) => {
    setToolsLoading(true);
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/tools`);
      if (!response.ok) throw new Error('Failed to fetch tools');
      const data = await response.json();
      setTools(data[serverName]?.tools || []);
    } catch (err) {
      setTools([]);
      console.error('Failed to fetch tools:', err);
    } finally {
      setToolsLoading(false);
    }
  }, [config]);

  const handleAction = useCallback(async (action: 'start' | 'stop', serverName: string) => {
    setActionLoading(action + serverName);
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/${action}/${serverName}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} server`);
      await fetchStatus();
      // Refetch tools for currently selected server
      if (selectedServerName) {
        fetchTools(selectedServerName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setActionLoading(null);
    }
  }, [fetchStatus, fetchTools, selectedServerName, config]);

  const handleRestart = useCallback(async (serverName: string) => {
    setActionLoading('restart' + serverName);
    try {
      const response = await fetch(`${getApiUrl('mcp_manager', config)}/restart/${serverName}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to restart server');
      await fetchStatus();
      // Refetch tools for currently selected server
      if (selectedServerName) {
        fetchTools(selectedServerName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setActionLoading(null);
    }
  }, [fetchStatus, fetchTools, selectedServerName, config]);

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
      await fetchStatus();
      
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
  }, [fetchStatus, config]);

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
        setTools([]);
      }
      
      // Refresh server status to remove the deleted server
      await fetchStatus();
      
    } catch (error) {
      console.error('Failed to delete server:', error);
      
      // Show error message with toast notification
      toast({
        title: "Failed to Delete Server",
        description: `Failed to delete ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [fetchStatus, selectedServerName, toast, config]);

  // Check MCP Manager status via backend API
  const checkMcpManagerStatus = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl('backend', config)}/mcp/status`);
      if (response.ok) {
        const data = await response.json();
        console.log('MCP Manager status:', data);
        
        // Update detailed status
        setMcpManagerStatus({
          status: data.status || 'unknown',
          api_responsive: data.api_responsive || false,
          exit_code: data.exit_code,
          last_pid: data.last_pid
        });
        
        // Set running state based on status and running field
        const isRunning = data.running === true || data.status === 'running' || data.status === 'running_not_responsive';
        setMcpManagerRunning(isRunning);
        
      } else {
        // If status endpoint is not accessible, assume not running
        setMcpManagerRunning(false);
        setMcpManagerStatus({
          status: 'not_started',
          api_responsive: false
        });
      }
    } catch (error) {
      console.log('MCP Manager status check failed:', error);
      // If we can't reach the status endpoint, assume it's not running
      setMcpManagerRunning(false);
      setMcpManagerStatus({
        status: 'not_started',
        api_responsive: false
      });
    }
  }, [config]);

  // Handle MCP Manager start/stop
  const handleMcpManagerAction = useCallback(async (action: 'start' | 'stop') => {
    setMcpManagerLoading(true);
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
        // Immediately clear servers list and selection when stopping
        setServers({});
        setSelectedServerName(null);
        setTools([]);
        // Update status immediately
        setTimeout(() => {
          checkMcpManagerStatus();
        }, 500);
      } else {
        // For start action, refresh status after a delay
        setTimeout(async () => {
          await checkMcpManagerStatus();
          // Also refresh server status after MCP Manager is responsive
          setTimeout(() => {
            fetchStatus();
          }, 2000); // Additional delay for servers to initialize
        }, 1000);
      }
      
    } catch (error) {
      console.error(`Failed to ${action} MCP Manager:`, error);
      
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
  }, [toast, fetchStatus, checkMcpManagerStatus, config]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStatus(true);
    checkMcpManagerStatus();
    // Optionally, set up polling here if desired
  }, [fetchStatus, checkMcpManagerStatus]);

  // Fetch tools when selectedServerName changes
  useEffect(() => {
    if (selectedServerName) {
      fetchTools(selectedServerName);
    } else {
      setTools([]);
    }
  }, [selectedServerName, fetchTools]);

  // Poll server status every 5 seconds to update uptime and status
  useEffect(() => {
    const interval = setInterval(() => {
      // Always check MCP Manager status
      checkMcpManagerStatus();
      
      // Only fetch server status if MCP Manager is running
      if (mcpManagerStatus?.status === 'running' && mcpManagerStatus?.api_responsive) {
        fetchStatus();
      } else if (mcpManagerStatus?.status === 'not_started' || mcpManagerStatus?.status === 'terminated') {
        // Clear servers list if MCP Manager is not running
        setServers(prev => Object.keys(prev).length > 0 ? {} : prev);
        setSelectedServerName(prev => prev ? null : prev);
        setTools(prev => prev.length > 0 ? [] : prev);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, checkMcpManagerStatus, mcpManagerStatus?.status, mcpManagerStatus?.api_responsive]);

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
                                <span className="text-xs text-yellow-400">Starting up...</span>
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
                  tools={tools}
                  toolsLoading={toolsLoading}
                  actionLoading={actionLoading}
                  toolCardState={toolCardState}
                  onAction={handleAction}
                  onRestart={handleRestart}
                  onDelete={handleDeleteServer}
                  onToolExpand={handleToolExpand}
                  onParamChange={handleParamChange}
                  initialLoading={initialLoading}
                  fetchStatus={fetchStatus}
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
