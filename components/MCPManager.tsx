import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, AlertCircle, RotateCcw, CheckCircle, XCircle, Power, PowerOff, Settings, Server, Wrench, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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

interface MCPServerListItem {
  name: string;
  state: string;
  healthy: boolean;
  tool_count?: number;
  token_count?: number;
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

const ServerDetailsPanel = function ServerDetailsPanel({
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
  console.log('🔵 ServerDetailsPanel render', server?.name, server?.uptime);
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
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-8 pb-4 border-b border-[#23232b]">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {server.name}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge className={getStateColor(server.state) + ' text-base px-3 py-1 rounded-full capitalize'}>
                {server.state}
              </Badge>
              {server.healthy ? (
                <span className="flex items-center gap-2 text-green-400 font-medium"><CheckCircle className="h-5 w-5" /> Healthy</span>
              ) : (
                <span className="flex items-center gap-2 text-red-400 font-medium"><XCircle className="h-5 w-5" /> Unhealthy</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
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
            <div style={{ minHeight: 200 }} className="relative w-full">
              {toolsLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <svg className="animate-spin h-6 w-6 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span className="text-gray-400">Loading tools...</span>
                </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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

// Add new type for selection
type MCPSelection = 'manager' | 'server' | 'tool';

// Memoized Navigation Panel
interface NavigationPanelProps {
  servers: Record<string, MCPServerListItem>;
  selectedItem: { type: MCPSelection; id: string | null };
  setSelectedItem: React.Dispatch<React.SetStateAction<{ type: MCPSelection; id: string | null }>>;
  loading: boolean;
  error: string | null;
  getStateColor: (state: string) => string;
  scrollPos: number;
  setScrollPos: (pos: number) => void;
}

const NavigationPanel = React.memo(function NavigationPanel({ servers, selectedItem, setSelectedItem, loading, error, getStateColor, scrollPos, setScrollPos }: NavigationPanelProps) {
  console.log('🟢 NavigationPanel render', Object.keys(servers));
  const handleManagerClick = useCallback(() => setSelectedItem({ type: 'manager', id: null }), [setSelectedItem]);
  const handleToolClick = useCallback(() => setSelectedItem({ type: 'tool', id: null }), [setSelectedItem]);
  const handleServerClick = useCallback((name: string) => setSelectedItem({ type: 'server', id: name }), [setSelectedItem]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Restore scroll position after render
  React.useLayoutEffect(() => {
    if (scrollRef.current && typeof scrollPos === 'number') {
      scrollRef.current.scrollTop = scrollPos;
    }
  }, [scrollPos, servers]);

  return (
    <div className="h-full bg-[#181818] flex flex-col">
      <div className="flex-1 overflow-y-auto" ref={scrollRef} onScroll={() => {
        if (scrollRef.current) setScrollPos(scrollRef.current.scrollTop);
      }}>
        {/* MCP Manager Section */}
        <div className="border-b border-[#23232b]">
          <button
            onClick={handleManagerClick}
            className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-[#232323] ${
              selectedItem.type === 'manager' ? 'bg-[#232323] font-semibold' : ''
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-3 bg-green-500"></span>
            <Settings className="h-4 w-4" />
            <span>MCP Manager</span>
            <Badge variant="secondary" className="ml-auto">
              {Object.keys(servers).length}
            </Badge>
          </button>
          <div className="pl-8">
            {loading ? (
              <div className="px-4 py-2 text-gray-400">Loading servers...</div>
            ) : error ? (
              <div className="px-4 py-2 text-red-500 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            ) : (
              <ul className="divide-y divide-gray-800">
                {Object.keys(servers).sort().map(name => {
                  const server = servers[name];
                  return (
                    <li
                      key={name}
                      className={`flex flex-col px-4 py-3 cursor-pointer hover:bg-[#232323] ${
                        selectedItem.type === 'server' && selectedItem.id === name ? 'bg-[#232323] font-semibold' : ''
                      }`}
                      onClick={() => handleServerClick(name)}
                    >
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-3 ${getStateColor(server.state)}`}></span>
                        <span className="flex-1">{name}</span>
                        <span className="text-xs text-gray-400 ml-2">{server.state}</span>
                        {server.healthy ? (
                          <CheckCircle className="h-4 w-4 text-green-400 ml-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 ml-2" />
                        )}
                      </div>
                      {(server.tool_count !== undefined || server.token_count !== undefined) && (
                        <div className="flex gap-3 mt-1 ml-5 text-xs text-gray-500">
                          {server.tool_count !== undefined && <span>Tools: {server.tool_count}</span>}
                          {server.token_count !== undefined && <span>Tokens: {server.token_count.toLocaleString()}</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if servers or selectedItem changed
  const prevServers = prevProps.servers;
  const nextServers = nextProps.servers;
  const prevKeys = Object.keys(prevServers);
  const nextKeys = Object.keys(nextServers);
  if (prevKeys.length !== nextKeys.length) return false;
  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (key !== nextKeys[i]) return false;
    const prevServer = prevServers[key];
    const nextServer = nextServers[key];
    // Compare relevant fields
    if (
      prevServer.state !== nextServer.state ||
      prevServer.healthy !== nextServer.healthy ||
      prevServer.tool_count !== nextServer.tool_count ||
      prevServer.token_count !== nextServer.token_count
    ) {
      return false;
    }
  }
  // Compare selectedItem
  if (
    prevProps.selectedItem.type !== nextProps.selectedItem.type ||
    prevProps.selectedItem.id !== nextProps.selectedItem.id
  ) {
    return false;
  }
  // Compare loading and error
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.error !== nextProps.error) return false;
  return true;
});

// Utility for shallow compare of list fields
function isListItemEqual(a: MCPServerListItem | undefined, b: MCPServerListItem | undefined) {
  return (
    a &&
    b &&
    a.name === b.name &&
    a.state === b.state &&
    a.healthy === b.healthy &&
    a.tool_count === b.tool_count &&
    a.token_count === b.token_count
  );
}

// Utility for deep compare of full server object
function isServerEqual(a: MCPServer | undefined, b: MCPServer | undefined) {
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key as keyof MCPServer] !== b[key as keyof MCPServer]) return false;
  }
  return true;
}

export default function MCPManager({ className }: MCPManagerProps) {
  const [serversList, setServersList] = useState<Record<string, MCPServerListItem>>({});
  const [serversFull, setServersFull] = useState<Record<string, MCPServer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<ServerTools | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toolCardState, setToolCardState] = useState<Record<string, { expanded: boolean; paramValues: Record<string, any> }>>({});
  const scrollPositions = useRef<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mcpActionLoading, setMcpActionLoading] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: MCPSelection; id: string | null }>({ type: 'manager', id: null });

  // Remove the old selectedServerRef since we're using selectedItem now
  const selectedItemRef = useRef<{ type: MCPSelection; id: string | null }>({ type: 'manager', id: null });
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // Store previous servers/tools for comparison
  const prevServersRef = useRef<Record<string, MCPServer>>({});
  const prevToolsRef = useRef<any>({});

  // Helper to extract list fields
  const extractListFields = (server: MCPServer): MCPServerListItem => ({
    name: server.name,
    state: server.state,
    healthy: server.healthy,
    tool_count: server.tool_count,
    token_count: server.token_count,
  });

  // Update serversList only if list fields change
  const updateServersList = useCallback((newServers: Record<string, MCPServer>) => {
    setServersList(prevServers => {
      let changed = false;
      const result: Record<string, MCPServerListItem> = {};
      for (const key of Object.keys(newServers)) {
        const prev = prevServers[key];
        const next = extractListFields(newServers[key]);
        if (!isListItemEqual(prev, next)) {
          changed = true;
          result[key] = next;
        } else {
          result[key] = prev;
        }
      }
      if (!changed && Object.keys(prevServers).length === Object.keys(newServers).length) {
        console.log('[updateServersList] No change, preserving reference');
        return prevServers;
      }
      console.log('[updateServersList] List changed');
      return result;
    });
  }, [extractListFields]);

  // Always update serversFull, but preserve references for unchanged servers
  const updateServersFull = useCallback((newServers: Record<string, MCPServer>) => {
    setServersFull(prevServers => {
      let changed = false;
      const result: Record<string, MCPServer> = {};
      for (const key of Object.keys(newServers)) {
        const prev = prevServers[key];
        const next = newServers[key];
        if (!isServerEqual(prev, next)) {
          changed = true;
          result[key] = next;
        } else {
          result[key] = prev;
        }
      }
      if (!changed && Object.keys(prevServers).length === Object.keys(newServers).length) {
        console.log('[updateServersFull] No change, preserving reference');
        return prevServers;
      }
      console.log('[updateServersFull] Details changed');
      return result;
    });
  }, []);

  // Update fetchStatus to update both
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5859/status');
      if (!response.ok) throw new Error('Failed to fetch MCP status');
      const data = await response.json();
      updateServersList(data);
      updateServersFull(data);
      setError(null);
      // Only update selectedItem if it doesn't exist in the new data
      if (selectedItem.type === 'server' && selectedItem.id && !(selectedItem.id in data)) {
        const keys = Object.keys(data);
        setSelectedItem({ type: 'server', id: keys.length > 0 ? keys[0] : null });
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
      setTools(data[serverName]);
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
      if (selectedItem.type === 'server' && selectedItem.id) fetchTools(selectedItem.id);
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
  }, []);

  // Add a new effect that only fetches tools when selected server changes, or tool_count, restarts, or uptime decrease
  const prevServerRef = useRef<MCPServer | null>(null);
  useEffect(() => {
    if (selectedItem.type === 'server' && typeof selectedItem.id === 'string' && selectedItem.id) {
      const server = serversFull[selectedItem.id];
      const prevServer = prevServerRef.current;
      let shouldFetch = false;
      if (!server) return;
      if (!prevServer || prevServer.name !== server.name) {
        shouldFetch = true;
      } else {
        // Check tool_count, restarts, uptime decrease, or PID change
        if (
          prevServer.tool_count !== server.tool_count ||
          prevServer.restarts !== server.restarts ||
          prevServer.pid !== server.pid ||
          (typeof prevServer.uptime === 'number' && typeof server.uptime === 'number' && server.uptime < prevServer.uptime)
        ) {
          shouldFetch = true;
        }
      }
      if (shouldFetch) {
        fetchTools(selectedItem.id);
      }
      prevServerRef.current = server;
    } else {
      prevServerRef.current = null;
    }
  }, [selectedItem.type, selectedItem.id, typeof selectedItem.id === 'string' && selectedItem.id ? serversFull[selectedItem.id]?.tool_count : undefined, typeof selectedItem.id === 'string' && selectedItem.id ? serversFull[selectedItem.id]?.restarts : undefined, typeof selectedItem.id === 'string' && selectedItem.id ? serversFull[selectedItem.id]?.pid : undefined, typeof selectedItem.id === 'string' && selectedItem.id ? serversFull[selectedItem.id]?.uptime : undefined]);

  useEffect(() => {
    if (!tools || !tools.tools) return;
    setToolCardState(prev => {
      const prevKeys = new Set(Object.keys(prev));
      const toolNames = new Set(tools.tools.map((t: any) => t.name));
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

  // Add new handlers for MCP system actions
  const handleMcpLaunch = async () => {
    setMcpActionLoading('launch');
    try {
      const response = await fetch('http://127.0.0.1:5859/launch', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to launch MCP');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch MCP');
    } finally {
      setMcpActionLoading(null);
    }
  };

  const handleMcpShutdown = async () => {
    setMcpActionLoading('shutdown');
    try {
      const response = await fetch('http://127.0.0.1:5859/shutdown', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to shutdown MCP');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shutdown MCP');
    } finally {
      setMcpActionLoading(null);
    }
  };

  const handleMcpRestart = async () => {
    setMcpActionLoading('restart');
    try {
      await handleMcpShutdown();
      await handleMcpLaunch();
    } finally {
      setMcpActionLoading(null);
    }
  };

  const handleMcpSettings = () => {
    // TODO: Implement settings modal
    console.log('Opening MCP settings');
  };

  return (
    <div className={`h-full ${className || ''}`}>
      <ResizablePanelGroup direction="horizontal">
        {/* Left: Navigation Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <NavigationPanel
            servers={serversList}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            loading={loading}
            error={error}
            getStateColor={getStateColor}
            scrollPos={scrollPositions.current['nav'] ?? 0}
            setScrollPos={pos => { scrollPositions.current['nav'] = pos; }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-[#23232b]" />
        {/* Right: Details Panel */}
        <ResizablePanel defaultSize={75} minSize={60}>
          <div className="h-full p-0 bg-gradient-to-br from-[#18181b] to-[#23232b]">
            {selectedItem.type === 'manager' ? (
              <div className="h-full w-full flex flex-col justify-center items-center p-0 overflow-y-auto">
                <Card className="w-full h-full shadow-xl rounded-xl bg-[#20212b] border-0 flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 p-8 pb-4 border-b border-[#23232b]">
                    <div className="flex flex-col gap-4">
                      <CardTitle className="text-2xl font-extrabold tracking-tight">
                        MCP System Control
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-base px-3 py-1 rounded-full">
                          System
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMcpLaunch}
                        disabled={!!mcpActionLoading}
                      >
                        <Power className="h-4 w-4 mr-1" /> Launch MCP
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMcpShutdown}
                        disabled={!!mcpActionLoading}
                      >
                        <PowerOff className="h-4 w-4 mr-1" /> Shutdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMcpRestart}
                        disabled={!!mcpActionLoading}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Restart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMcpSettings}
                      >
                        <Settings className="h-4 w-4 mr-1" /> Settings
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6 text-base">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-medium">Active Servers</span>
                        <span className="font-mono text-lg">{Object.keys(serversFull).length}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-medium">Total Tools</span>
                        <span className="font-mono text-lg">
                          {Object.values(serversFull).reduce((sum, server) => sum + (server.tool_count || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <ServerDetailsPanel
                server={selectedItem.type === 'server' && selectedItem.id ? serversFull[selectedItem.id] : null}
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
                scrollPos={selectedItem.type === 'server' && selectedItem.id ? scrollPositions.current[selectedItem.id] ?? 0 : 0}
                setScrollPos={(pos: number) => {
                  if (selectedItem.type === 'server' && selectedItem.id) {
                    scrollPositions.current[selectedItem.id] = pos;
                  }
                }}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 