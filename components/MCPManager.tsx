import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, AlertCircle } from 'lucide-react';
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

export default function MCPManager({ className }: MCPManagerProps) {
  const [servers, setServers] = useState<Record<string, MCPServer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5859/status');
      if (!response.ok) throw new Error('Failed to fetch MCP status');
      const data = await response.json();
      setServers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP status');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop', serverName: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5859/${action}/${serverName}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} server`);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'errored': return 'bg-red-500';
      case 'retrying': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="p-4">Loading MCP servers...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">MCP Servers</h2>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4">
        {Object.entries(servers).map(([name, server]) => (
          <Card key={name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{name}</CardTitle>
              <Badge className={getStateColor(server.state)}>
                {server.state}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <span>Transport:</span>
                  <span>{server.transport}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>PID:</span>
                  <span>{server.pid || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uptime:</span>
                  <span>{server.uptime ? `${Math.round(server.uptime)}s` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Retries:</span>
                  <span>{server.retries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Restarts:</span>
                  <span>{server.restarts}</span>
                </div>
                {server.last_error && (
                  <div className="text-sm text-red-500 mt-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {server.last_error}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('start', name)}
                    disabled={server.state === 'running'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('stop', name)}
                    disabled={server.state === 'stopped'}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 