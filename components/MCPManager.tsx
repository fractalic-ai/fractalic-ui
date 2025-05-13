import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, AlertCircle, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
}

interface MCPManagerProps {
  className?: string;
}

interface ServerTools {
  tools: { name: string; description?: string }[];
  error?: string;
}

export default function MCPManager({ className }: MCPManagerProps) {
  const [servers, setServers] = useState<Record<string, MCPServer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<ServerTools | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Ref to always have the latest selectedServer value
  const selectedServerRef = useRef<string | null>(selectedServer);
  useEffect(() => {
    selectedServerRef.current = selectedServer;
  }, [selectedServer]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5859/status');
      if (!response.ok) throw new Error('Failed to fetch MCP status');
      const data = await response.json();
      setServers(data);
      setError(null);

      // Only update selectedServer if it is not set or no longer exists
      if (
        typeof selectedServerRef.current === 'undefined' ||
        selectedServerRef.current === null ||
        !(selectedServerRef.current in data)
      ) {
        const keys = Object.keys(data);
        setSelectedServer(keys.length > 0 ? keys[0] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP status');
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async (serverName: string) => {
    setToolsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5859/tools');
      if (!response.ok) throw new Error('Failed to fetch tools');
      const data = await response.json();
      setTools(data[serverName] || { tools: [] });
    } catch (err) {
      setTools({ tools: [], error: err instanceof Error ? err.message : 'Failed to fetch tools' });
    } finally {
      setToolsLoading(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop', serverName: string) => {
    setActionLoading(action + serverName);
    try {
      const response = await fetch(`http://127.0.0.1:5859/${action}/${serverName}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} server`);
      await fetchStatus();
      if (selectedServer) fetchTools(selectedServer);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async (serverName: string) => {
    setActionLoading('restart' + serverName);
    try {
      await handleAction('stop', serverName);
      await handleAction('start', serverName);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchTools(selectedServer);
    }
  }, [selectedServer]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'errored': return 'bg-red-500';
      case 'retrying': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex h-full ${className || ''}`}> {/* Two-panel layout */}
      {/* Left: Server List */}
      <div className="w-64 border-r bg-[#181818] flex flex-col overflow-y-auto">
        <div className="p-4 font-bold text-lg border-b">MCP Servers</div>
        {loading ? (
          <div className="p-4">Loading servers...</div>
        ) : error ? (
          <div className="p-4 text-red-500 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-gray-800">
            {Object.entries(servers).map(([name, server]) => (
              <li
                key={name}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-[#232323] ${selectedServer === name ? 'bg-[#232323] font-semibold' : ''}`}
                onClick={() => setSelectedServer(name)}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-3 ${getStateColor(server.state)}`}></span>
                <span className="flex-1">{name}</span>
                <span className="text-xs text-gray-400 ml-2">{server.state}</span>
                {server.healthy ? <CheckCircle className="h-4 w-4 text-green-400 ml-2" /> : <XCircle className="h-4 w-4 text-red-400 ml-2" />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Right: Server Details */}
      <div className="flex-1 h-full p-0 bg-gradient-to-br from-[#18181b] to-[#23232b] overflow-y-auto">
        {!selectedServer || !servers[selectedServer] ? (
          <div className="text-gray-400 p-8 text-lg">Select a server to view details.</div>
        ) : (
          <div className="h-full w-full flex flex-col justify-center items-center p-0">
            <Card className="w-full h-full shadow-xl rounded-xl bg-[#20212b] border-0 flex flex-col">
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 pb-4 border-b border-[#23232b]">
                <div>
                  <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-4">
                    <span>{selectedServer}</span>
                    <Badge className={getStateColor(servers[selectedServer].state) + ' text-base px-3 py-1 rounded-full capitalize'}>
                      {servers[selectedServer].state}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-gray-400 text-base">
                    {servers[selectedServer].healthy ? (
                      <span className="flex items-center gap-2 text-green-400 font-medium"><CheckCircle className="h-5 w-5" /> Healthy</span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-400 font-medium"><XCircle className="h-5 w-5" /> Unhealthy</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('start', selectedServer)}
                    disabled={servers[selectedServer].state === 'running' || !!actionLoading}
                  >
                    <Play className="h-4 w-4 mr-1" /> Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('stop', selectedServer)}
                    disabled={servers[selectedServer].state === 'stopped' || !!actionLoading}
                  >
                    <Square className="h-4 w-4 mr-1" /> Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestart(selectedServer)}
                    disabled={!!actionLoading}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Restart
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStatus}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 text-base">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Transport</span>
                    <span className="font-mono text-lg">{servers[selectedServer].transport}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">PID</span>
                    <span className="font-mono text-lg">{servers[selectedServer].pid || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Uptime</span>
                    <span className="font-mono text-lg">{servers[selectedServer].uptime ? `${Math.round(servers[selectedServer].uptime!)}s` : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Retries</span>
                    <span className="font-mono text-lg">{servers[selectedServer].retries}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Restarts</span>
                    <span className="font-mono text-lg">{servers[selectedServer].restarts}</span>
                  </div>
                </div>
                {servers[selectedServer].last_error && (
                  <div className="text-sm text-red-500 mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {servers[selectedServer].last_error}
                  </div>
                )}
                <div className="mb-2">
                  <div className="font-semibold mb-3 text-lg">Available Tools</div>
                  {toolsLoading ? (
                    <div className="text-gray-400">Loading tools...</div>
                  ) : tools && tools.tools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tools.tools.map((tool, idx) => (
                        <ToolCard key={tool.name + idx} tool={tool} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400">No tools found.</div>
                  )}
                  {tools && tools.error && (
                    <div className="text-xs text-red-500 mt-1">{tools.error}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: any }) {
  const [expanded, setExpanded] = useState(false);
  // Try to extract parameters from tool.inputSchema if available
  let params: { name: string; type: string }[] = [];
  if (tool.inputSchema && tool.inputSchema.properties) {
    params = Object.entries(tool.inputSchema.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'unknown',
    }));
  }
  // Description preview (first sentence or 100 chars)
  const preview = tool.description
    ? tool.description.split('. ')[0].slice(0, 100) + (tool.description.length > 100 ? '...' : '')
    : 'No description available.';
  return (
    <div className={`rounded-lg shadow-md bg-[#23232b] border border-[#23232b] p-5 flex flex-col transition-all duration-200 ${expanded ? 'ring-2 ring-primary' : ''}`}
      style={{ minHeight: 180 }}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-lg font-bold text-primary">{tool.name}</div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Hide' : 'Details'}
        </Button>
      </div>
      <div className="text-gray-400 text-base mt-2 mb-2">
        {preview}
      </div>
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-xs text-gray-500 font-semibold">Parameters:</span>
        {params.length > 0 ? (
          <ul className="ml-2">
            {params.map((p) => (
              <li key={p.name} className="text-sm text-gray-300">
                <span className="font-mono text-xs text-primary">{p.name}</span>
                <span className="text-xs text-gray-400 ml-2">({p.type})</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-gray-500">No parameters</span>
        )}
      </div>
      {expanded && (
        <div className="mt-2 text-gray-300 text-sm">
          <div className="mb-2 font-semibold">Description</div>
          <div className="mb-2 whitespace-pre-line">{tool.description || 'No description available.'}</div>
          {/* Parameter details and test UI can go here */}
        </div>
      )}
    </div>
  );
} 