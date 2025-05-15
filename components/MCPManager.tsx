import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
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
  stdout: any[];
  stderr: any[];
  last_output_renewal: number | null;
}

interface MCPManagerProps {
  className?: string;
}

interface ServerTools {
  tools: { name: string; description?: string }[];
  error?: string;
}

/* instrumentation — keep only while debugging */
let mountCounter = 0;

// Hoisted getStateColor
const getStateColor = (state: string) => {
  switch (state) {
    case 'running': return 'bg-green-500';
    case 'stopped': return 'bg-gray-500';
    case 'errored': return 'bg-red-500';
    case 'retrying': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

// Hoisted Uptime
const Uptime = React.memo(function Uptime({ value }: { value: number | null }) {
  return <span className="font-mono text-lg">{value ? `${Math.round(value)}s` : 'N/A'}</span>;
});

// Explicit props interface for ServerDetailsPanel
interface ServerDetailsPanelProps {
  server: MCPServer | null;
  tools: ServerTools | null;
  toolsLoading: boolean;
  toolCardState: Record<string, any>;
  onToolExpand: (tool: string, expanded: boolean) => void;
  onParamChange: (tool: string, param: string, value: any) => void;
  getStateColor: (s: string) => string;
  onAction: (action: 'start' | 'stop', name: string) => void;
  onRestart: (name: string) => void;
  fetchStatus: () => void;
  loading: boolean;
  actionLoading: string | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollPos: number;
  setScrollPos: (pos: number) => void;
}

const ServerDetailsPanel = React.memo(function ServerDetailsPanel({
  server,
  tools,
  toolsLoading,
  toolCardState,
  onToolExpand,
  onParamChange,
  getStateColor,
  onAction,
  onRestart,
  fetchStatus,
  loading,
  actionLoading,
  scrollRef,
  scrollPos,
  setScrollPos,
}: ServerDetailsPanelProps) {
  React.useEffect(() => {
    const id = ++mountCounter;
    console.log("🔵 ServerDetailsPanel mount", id, server?.name);
    return () => console.log("🔴 ServerDetailsPanel UNMOUNT", id, server?.name);
  }, []); // empty deps → runs exactly once per mount
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && typeof scrollPos === 'number') {
      el.scrollTop = scrollPos;
    }
  }, [server?.name, scrollRef, scrollPos]);
  if (!server) {
    return <div className="text-gray-400 p-8 text-lg">Select a server to view details.</div>;
  }
  return (
    <div ref={scrollRef} onScroll={() => {
      const el = scrollRef.current;
      if (el) setScrollPos(el.scrollTop);
    }} className="h-full w-full flex flex-col justify-center items-center p-0 overflow-y-auto">
      <Card className="w-full h-full shadow-xl rounded-xl bg-[#20212b] border-0 flex flex-col">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 pb-4 border-b border-[#23232b]">
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-4">
              <span>{server.name}</span>
              <Badge className={getStateColor(server.state) + ' text-base px-3 py-1 rounded-full capitalize'}>
                {server.state}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2 text-gray-400 text-base">
              {server.healthy ? (
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
              onClick={() => onAction('start', server.name)}
              disabled={server.state === 'running' || !!actionLoading}
            >
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('stop', server.name)}
              disabled={server.state === 'stopped' || !!actionLoading}
            >
              <Square className="h-4 w-4 mr-1" /> Stop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestart(server.name)}
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
              <span className="font-mono text-lg">{server.transport}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">PID</span>
              <span className="font-mono text-lg">{server.pid || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">Uptime</span>
              <Uptime value={server.uptime} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">Retries</span>
              <span className="font-mono text-lg">{server.retries}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">Restarts</span>
              <span className="font-mono text-lg">{server.restarts}</span>
            </div>
          </div>
          {server.last_error && (
            <div className="text-sm text-red-500 mt-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {server.last_error}
            </div>
          )}

          {/* Terminal Output Section (Collapsible) */}
          <Accordion type="single" collapsible className="mb-4">
            <AccordionItem value="terminal-output">
              <AccordionTrigger className="font-semibold text-lg">Terminal Output</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2">
                  <div className="bg-black rounded p-2 max-h-40 overflow-auto border border-gray-700">
                    {(() => {
                      // Combine stdout and stderr, sort by timestamp (descending)
                      const lines: { timestamp: string, line: string, source: string }[] = [];
                      if (Array.isArray(server.stdout)) {
                        for (const entry of server.stdout) {
                          if (typeof entry === 'string') {
                            lines.push({ timestamp: '', line: entry, source: 'stdout' });
                          } else if (entry && entry.timestamp && entry.line) {
                            lines.push({ ...entry, source: 'stdout' });
                          }
                        }
                      }
                      if (Array.isArray(server.stderr)) {
                        for (const entry of server.stderr) {
                          if (typeof entry === 'string') {
                            lines.push({ timestamp: '', line: entry, source: 'stderr' });
                          } else if (entry && entry.timestamp && entry.line) {
                            lines.push({ ...entry, source: 'stderr' });
                          }
                        }
                      }
                      lines.sort((a, b) => {
                        if (!a.timestamp && !b.timestamp) return 0;
                        if (!a.timestamp) return 1;
                        if (!b.timestamp) return -1;
                        return b.timestamp.localeCompare(a.timestamp); // most recent first
                      });
                      return lines.length > 0 ? (
                        lines.map((entry, idx) => (
                          <div key={idx} className={entry.source === 'stderr' ? 'text-red-300' : 'text-gray-200'}>
                            {entry.timestamp && (
                              <span className="text-xs text-gray-500 mr-2">[{entry.timestamp}]</span>
                            )}
                            <span>{entry.line}</span>
                            {entry.source === 'stderr' && <span className="ml-2 text-xs text-red-400">(stderr)</span>}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 italic">No terminal output</div>
                      );
                    })()}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    <span className="font-semibold">Last Output Update:</span>{' '}
                    {server.last_output_renewal ? new Date(server.last_output_renewal).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mb-2">
            <div className="font-semibold mb-3 text-lg">Available Tools</div>
            {toolsLoading ? (
              <div className="text-gray-400">Loading tools...</div>
            ) : tools && tools.tools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tools.tools.map((tool: any, idx: number) => (
                  <ToolCard
                    key={tool.name + idx}
                    tool={tool}
                    expanded={!!toolCardState[tool.name]?.expanded}
                    onExpand={(expanded: boolean) => onToolExpand(tool.name, expanded)}
                    paramValues={toolCardState[tool.name]?.paramValues || {}}
                    onParamChange={(param: string, value: any) => onParamChange(tool.name, param, value)}
                  />
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
  );
}, (prev, next) => {
  if (prev.toolCardState !== next.toolCardState) return false;      // expanded / params changed
  if (prev.server?.name !== next.server?.name) return false;        // server switched
  const p = prev.tools?.tools ?? [], n = next.tools?.tools ?? [];
  if (p.length !== n.length) return false;
  return p.every((t, i) => t.name === n[i]?.name);
});

const ToolCard = React.memo(function ToolCard({ tool, expanded, onExpand, paramValues, onParamChange }: {
  tool: any;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  paramValues: Record<string, any>;
  onParamChange: (param: string, value: any) => void;
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
  const preview = tool.description
    ? tool.description.split('. ')[0].slice(0, 100) + (tool.description.length > 100 ? '...' : '')
    : 'No description available.';

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('http://127.0.0.1:5859/call_tool', {
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

  const renderInput = (param: any) => {
    const value = paramValues[param.name] ?? '';
    if (param.type === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onParamChange(param.name, e.target.checked)}
          className="ml-2"
        />
      );
    }
    if (param.type === 'number' || param.type === 'integer') {
      return (
        <input
          type="number"
          value={value}
          onChange={e => onParamChange(param.name, e.target.valueAsNumber)}
          className="ml-2 px-2 py-1 rounded bg-[#23232b] border border-gray-700 text-white w-full max-w-xs"
        />
      );
    }
    return (
      <input
        type="text"
        value={value}
        onChange={e => onParamChange(param.name, e.target.value)}
        className="ml-2 px-2 py-1 rounded bg-[#23232b] border border-gray-700 text-white w-full max-w-xs"
      />
    );
  };

  return (
    <div
      className={`rounded-2xl shadow-lg bg-[#23232b] border border-[#23232b] p-6 flex flex-col transition-all duration-200 mb-4 hover:shadow-xl ${expanded ? 'ring-2 ring-primary scale-[1.01] z-10' : ''}`}
      style={{ minHeight: 180 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-xl font-bold text-primary tracking-tight">{tool.name}</div>
        <Button variant="ghost" size="sm" onClick={() => onExpand(!expanded)} className="text-xs font-semibold">
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>
      <div className="text-gray-300 text-base mb-3 min-h-[32px]">{preview}</div>
      {expanded && (
        <>
          <div className="mb-4">
            <div className="mb-1 font-semibold text-gray-200">Description</div>
            <div className="mb-2 whitespace-pre-line text-gray-400 text-sm">{tool.description || 'No description available.'}</div>
          </div>
          <div className="mb-4">
            <div className="mb-1 font-semibold text-gray-200">Parameters</div>
            {params.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {params.map((p) => (
                  <li key={p.name} className="flex flex-col gap-1 bg-[#23232b] rounded p-2 border border-[#29293a]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary font-bold">{p.name}</span>
                      <span className="text-xs text-gray-400">({p.type})</span>
                    </div>
                    {p.description && <div className="text-xs text-gray-400 mb-1">{p.description}</div>}
                    <div className="w-full flex items-center">{renderInput(p)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-gray-500">No parameters</span>
            )}
          </div>
          {params.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 self-start"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test'}
            </Button>
          )}
          {testResult && (
            <div className="mt-3 p-2 bg-[#18181b] rounded text-xs text-gray-200 max-h-40 overflow-auto w-full">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default function MCPManager({ className }: MCPManagerProps) {
  const [servers, setServers] = useState<Record<string, MCPServer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<ServerTools | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toolCardState, setToolCardState] = useState<Record<string, { expanded: boolean; paramValues: Record<string, any> }>>({});
  const scrollPositions = useRef<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ref to always have the latest selectedServer value
  const selectedServerRef = useRef<string | null>(selectedServer);
  useEffect(() => {
    selectedServerRef.current = selectedServer;
  }, [selectedServer]);

  // Store previous servers/tools for comparison
  const prevServersRef = useRef<Record<string, MCPServer>>({});
  const prevToolsRef = useRef<any>({});

  const updateServers = useCallback((newServers: Record<string, MCPServer>) => {
    setServers(prevServers => {
      // Only update fields that changed
      const updated: Record<string, MCPServer> = { ...prevServers };
      for (const key of Object.keys(newServers)) {
        if (!prevServers[key]) {
          updated[key] = newServers[key];
        } else {
          // Only update changed fields
          const prev = prevServers[key];
          const next = newServers[key];
          if (
            prev.state !== next.state ||
            prev.uptime !== next.uptime ||
            prev.healthy !== next.healthy ||
            prev.retries !== next.retries ||
            prev.restarts !== next.restarts ||
            prev.last_error !== next.last_error ||
            prev.pid !== next.pid
          ) {
            updated[key] = { ...prev, ...next };
          }
        }
      }
      // Remove servers that no longer exist
      for (const key of Object.keys(updated)) {
        if (!newServers[key]) delete updated[key];
      }
      prevServersRef.current = updated;
      return updated;
    });
  }, []);

  const updateTools = useCallback((newTools: any, serverName: string) => {
    setTools(prevTools => {
      if (!newTools || !newTools[serverName]) return { tools: [], error: `No tools found for server: ${serverName}` };
      // Only update if tool list changed (by name/length)
      const prevList = prevTools?.tools || [];
      const nextList = newTools[serverName].tools || [];
      if (
        prevList.length !== nextList.length ||
        prevList.some((t: any, i: number) => t.name !== nextList[i]?.name)
      ) {
        prevToolsRef.current = newTools[serverName];
        return newTools[serverName];
      }
      // Otherwise, keep previous
      return prevTools;
    });
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5859/status');
      if (!response.ok) throw new Error('Failed to fetch MCP status');
      const data = await response.json();
      updateServers(data);
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
      console.log('Fetched tools:', data);
      updateTools(data, serverName);
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
    if (selectedServer && servers[selectedServer]) {
      fetchTools(selectedServer);
    }
  }, [selectedServer, servers]);

  useEffect(() => {
    if (!tools || !tools.tools) return;
    setToolCardState(prev => {
      const prevKeys = new Set(Object.keys(prev));
      const toolNames = new Set(tools.tools.map(t => t.name));
      // Only update if the set of tool names has changed
      if (
        prevKeys.size === toolNames.size &&
        Array.from(prevKeys).every(k => toolNames.has(k))
      ) {
        return prev; // No change
      }
      const next: typeof prev = {};
      for (const tool of tools.tools) {
        next[tool.name] = prev[tool.name] || { expanded: false, paramValues: {} };
      }
      return next;
    });
  }, [tools]);

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
      <div className="flex-1 h-full p-0 bg-gradient-to-br from-[#18181b] to-[#23232b]">
        <ServerDetailsPanel
          server={selectedServer ? servers[selectedServer] : null}
          tools={tools}
          toolsLoading={toolsLoading}
          toolCardState={toolCardState}
          onToolExpand={(tool: string, expanded: boolean) => setToolCardState(prev => ({
            ...prev,
            [tool]: {
              ...prev[tool],
              expanded,
            },
          }))}
          onParamChange={(tool: string, param: string, value: any) => setToolCardState(prev => ({
            ...prev,
            [tool]: {
              ...prev[tool],
              paramValues: {
                ...((prev[tool] && prev[tool].paramValues) || {}),
                [param]: value,
              },
            },
          }))}
          getStateColor={getStateColor}
          onAction={handleAction}
          onRestart={handleRestart}
          fetchStatus={fetchStatus}
          loading={loading}
          actionLoading={actionLoading}
          scrollRef={scrollRef}
          scrollPos={selectedServer ? scrollPositions.current[selectedServer] ?? 0 : 0}
          setScrollPos={(pos: number) => {
            if (selectedServer) scrollPositions.current[selectedServer] = pos;
          }}
        />
      </div>
    </div>
  );
} 