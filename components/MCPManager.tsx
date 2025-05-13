import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, AlertCircle, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedServer || !servers[selectedServer] ? (
          <div className="text-gray-400">Select a server to view details.</div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  {selectedServer}
                  <Badge className={getStateColor(servers[selectedServer].state)}>
                    {servers[selectedServer].state}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
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
              <CardContent>
                <div className="grid gap-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Transport:</span>
                    <span>{servers[selectedServer].transport}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>PID:</span>
                    <span>{servers[selectedServer].pid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Uptime:</span>
                    <span>{servers[selectedServer].uptime ? `${Math.round(servers[selectedServer].uptime!)}s` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Retries:</span>
                    <span>{servers[selectedServer].retries}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Restarts:</span>
                    <span>{servers[selectedServer].restarts}</span>
                  </div>
                  {servers[selectedServer].last_error && (
                    <div className="text-sm text-red-500 mt-2">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {servers[selectedServer].last_error}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <div className="font-semibold mb-1">Available Tools</div>
                  {toolsLoading ? (
                    <div className="text-gray-400">Loading tools...</div>
                  ) : tools && tools.tools.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {tools.tools.map((tool, idx) => (
                        <li key={tool.name + idx} className="mb-1">
                          <span className="font-mono text-sm">{tool.name}</span>
                          {tool.description && <span className="text-xs text-gray-400 ml-2">{tool.description}</span>}
                        </li>
                      ))}
                    </ul>
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