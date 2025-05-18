import React, { useRef, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, X, Filter, Eye, Table } from 'lucide-react';
import { getNodeIcon } from '../utils/icons';
import { TextField } from './TextField';
import { TraceNodeData } from '../types';
import styles from '../styles/TraceNode.module.css';

interface TraceNodeProps {
  node: TraceNodeData;
  hoveredCreator?: string | null;
  setHoveredCreator?: (val: string | null) => void;
  isDetailsExpanded: boolean;
  isCollapsed: boolean;
  onToggleDetails: () => void;
  onToggleCollapse: () => void;
  onFilterByCreator: (key: string) => void;
  filterByCreator: string | null;
  onZoomToFit?: (element: HTMLElement) => void;
  highlightSource?: boolean;
}

export const TraceNode: React.FC<TraceNodeProps> = ({
  node,
  hoveredCreator,
  setHoveredCreator,
  isDetailsExpanded,
  isCollapsed,
  onToggleDetails,
  onToggleCollapse,
  onFilterByCreator,
  filterByCreator,
  onZoomToFit,
  highlightSource = false
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Determine if this node should be highlighted
  const shouldHighlight = highlightSource && !!node.created_by;

  // Global view mode for all tool/tool response messages
  const [globalToolViewMode, setGlobalToolViewMode] = React.useState<'raw' | 'formatted'>('raw');
  // Per-message view mode state (index -> 'raw' | 'formatted' | undefined)
  const [toolViewModes, setToolViewModes] = React.useState<Record<number, 'raw' | 'formatted'>>({});
  const handleToggleViewMode = (idx: number) => {
    setToolViewModes(prev => ({
      ...prev,
      [idx]: prev[idx] === 'formatted' ? 'raw' : 'formatted',
    }));
  };
  const handleGlobalToggle = () => {
    setGlobalToolViewMode(prev => prev === 'raw' ? 'formatted' : 'raw');
    setToolViewModes({}); // Reset per-message overrides on global toggle
  };

  // Helper to render formatted JSON as field/value pairs, recursively parsing JSON strings
  function renderFormattedFields(obj: any, parentKey = '') {
    // If it's a string, try to parse as JSON
    if (typeof obj === 'string') {
      try {
        const parsed = JSON.parse(obj);
        return renderFormattedFields(parsed, parentKey);
      } catch {
        // Not JSON, render as plain text
        return (
          <div className="mb-2">
            {parentKey && <div className="px-2 py-1 rounded-full font-mono text-gray-400 text-[10px] font-semibold inline-block mb-1" style={{letterSpacing: 1, background: 'transparent'}}>{parentKey.toUpperCase()}</div>}
            <div className="px-2 py-1 rounded text-gray-100 text-sm break-all" style={{background: 'rgba(0,0,0,0.33)'}}>{obj}</div>
          </div>
        );
      }
    }
    if (typeof obj !== 'object' || obj === null) {
      return (
        <div className="mb-2">
          {parentKey && <div className="px-2 py-1 rounded-full font-mono text-gray-400 text-[10px] font-semibold inline-block mb-1" style={{letterSpacing: 1, background: 'transparent'}}>{parentKey.toUpperCase()}</div>}
          <div className="px-2 py-1 rounded text-gray-100 text-sm break-all" style={{background: 'rgba(0,0,0,0.33)'}}>{String(obj)}</div>
        </div>
      );
    }
    return Object.entries(obj).map(([key, value]) => (
      <div key={parentKey + key} className="mb-2">
        <div className="px-2 py-1 rounded-full font-mono text-gray-400 text-[10px] font-semibold inline-block mb-1" style={{letterSpacing: 1, background: 'transparent'}}>{key.toUpperCase()}</div>
        {typeof value === 'object' && value !== null
          ? <div className="ml-4">{renderFormattedFields(value, key + '.')}</div>
          : renderFormattedFields(value, '')}
      </div>
    ));
  }

  // Add ResizeObserver to track size changes
  useEffect(() => {
    if (!nodeRef.current) return;

    // Create a ResizeObserver to detect when this node's size changes
    const resizeObserver = new ResizeObserver(() => {
      // Dispatch event for layout recalculation with debounce
      const parentElement = nodeRef.current?.closest('[data-trace-id]');
      if (parentElement) {
        // Use a custom event to notify parent components about the size change
        const event = new CustomEvent('node-resize', {
          detail: {
            nodeKey: `${node.trace_node_id || node.id || node.key}`,
            groupId: parentElement.getAttribute('data-trace-id')
          }
        });
        window.dispatchEvent(event);
      }
    });

    // Start observing
    resizeObserver.observe(nodeRef.current);

    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  }, [node.id, node.key, node.trace_node_id]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeRef.current && onZoomToFit) {
      onZoomToFit(nodeRef.current);
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Dispatch an event to notify about the transition
    const event = new CustomEvent('node-transition', {
      detail: {
        nodeKey: node.key,
        action: isCollapsed ? 'expand' : 'collapse',
        element: nodeRef.current
      }
    });
    window.dispatchEvent(event);

    // Notify of transition start explicitly
    const transitionEvent = new CustomEvent('transition-started', {
      detail: { nodeKey: node.key, element: nodeRef.current }
    });
    window.dispatchEvent(transitionEvent);

    onToggleCollapse();
  };

  // Add transition start handler
  useEffect(() => {
    const element = nodeRef.current;
    if (!element) return;

    const handleTransitionStart = (e: TransitionEvent) => {
      if (e.propertyName === 'height' || e.propertyName === 'max-height') {
        // Dispatch event to start continuous connection updates
        window.dispatchEvent(new CustomEvent('force-connections-update', {
          detail: { nodeKey: node.key, isAnimating: true }
        }));
      }
    };

    element.addEventListener('transitionstart', handleTransitionStart);
    return () => element.removeEventListener('transitionstart', handleTransitionStart);
  }, [node.key]);

  // Improve the transitionEnd handler to ensure connections update after transitions
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'height' || e.propertyName === 'max-height' || e.propertyName === 'opacity') {
      // Dispatch a more specific event that includes node information
      const event = new CustomEvent('node-transition-complete', {
        detail: {
          nodeKey: node.key,
          element: nodeRef.current
        }
      });
      window.dispatchEvent(event);

      // Also dispatch the regular update event for backward compatibility
      const updateEvent = new CustomEvent('force-connections-update');
      window.dispatchEvent(updateEvent);
    }
  };

  // Memoize all formatted contents for all messages at once
  const formattedContents = useMemo(() => {
    return (node.response_messages || []).map((msg, idx) => {
      const viewMode = toolViewModes[idx] || globalToolViewMode;
      if (viewMode !== 'formatted') return { formattedContent: null, formattedToolCalls: null };
      let formattedContent;
      if (typeof msg.content === 'string') {
        try {
          const parsed = JSON.parse(msg.content);
          formattedContent = renderFormattedFields(parsed);
        } catch {
          formattedContent = renderFormattedFields(msg.content);
        }
      } else {
        formattedContent = renderFormattedFields(msg.content);
      }
      const formattedToolCalls = msg.tool_calls ? renderFormattedFields(msg.tool_calls) : null;
      return { formattedContent, formattedToolCalls };
    });
  }, [node.response_messages, toolViewModes, globalToolViewMode]);

  return (
    <div 
      ref={nodeRef}
      data-trace-id={node.trace_node_id || node.id || node.key}
      data-trace-node-id={node.key}
      data-created-by={node.created_by || null}
      data-created-by-file={node.created_by_file || null}
      data-node-expanded={isDetailsExpanded ? "true" : "false"}
      data-node-collapsed={isCollapsed ? "true" : "false"}
      onDoubleClick={handleDoubleClick}
      onTransitionEnd={handleTransitionEnd}
      className={styles.traceNodeContainer}
    >
      <div 
        className={styles.traceNode}
      >
        <div className={`p-3 cursor-pointer ${shouldHighlight ? 'bg-[#1c392a]' : 'bg-gray-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center" onClick={handleToggleCollapse} style={{ cursor: 'pointer' }}>
              {getNodeIcon(node.type)}
              <span className="ml-2 font-medium text-gray-200 text-lg">{node.name || node.type}</span>
              <span className="ml-2 text-sm text-gray-400">[{node.type}]</span>
              <span className="ml-2 text-sm text-gray-400">Key: {node.key}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Global view mode toggle button for all tool/tool response messages */}
              {Array.isArray(node.response_messages) && node.response_messages.some(msg => msg.role === 'tool' || msg.tool_call_id || msg.tool_calls || msg.name) && (
                <button
                  className="p-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                  onClick={e => { e.stopPropagation(); handleGlobalToggle(); }}
                  title={globalToolViewMode === 'raw' ? 'Show all as formatted view' : 'Show all as raw JSON'}
                >
                  {globalToolViewMode === 'raw' ? <Table className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              {/* Existing Childs button */}
              <button
                className="text-sm px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredCreator?.(node.key);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  setHoveredCreator?.(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterByCreator(node.key);
                }}
                title="Show child nodes only"
              >
                childs
              </button>
            </div>
          </div>
          
          {!isCollapsed && (
            <div className={styles.traceNodeContent}>
              {node.content && (
                <div className="mt-2">
                  <TextField content={node.content} hideButton={true} dataId="node-content" />
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDetails();
                }}
                className="flex items-center text-gray-300 hover:text-gray-200 mt-3"
              >
                {isDetailsExpanded ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                <span>Additional Details</span>
              </button>
            </div>
          )}
        </div>
        
        {isDetailsExpanded && !isCollapsed && (
          <div className={`border-t border-gray-700 p-4 transition-all duration-300 ease-in-out ${styles.traceNodeContent}`} style={{ backgroundColor: '#1A202C' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300 w-1/3">Type:</td>
                      <td className="py-2 text-gray-400">{node.type}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">Role:</td>
                      <td className="py-2 text-gray-400">{node.role}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">Level:</td>
                      <td className="py-2 text-gray-400">{node.level}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">Indent:</td>
                      <td className="py-2 text-gray-400">{node.indent}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300 w-1/3">Previous Node:</td>
                      <td className="py-2 text-gray-400">{node.prev || 'None'}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">Next Node:</td>
                      <td className="py-2 text-gray-400">{node.next || 'None'}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">Enabled:</td>
                      <td className="py-2 text-gray-400">{node.enabled ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-300">ID:</td>
                      <td className="py-2 text-gray-400">{node.id || 'None'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {(node.created_by || node.created_by_file) && (
              <div className="mt-6 p-3 bg-gray-800 rounded-md flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  {node.created_by && (
                    <div>
                      <span className="font-medium text-gray-300">Created By:</span>
                      <span className="ml-2 text-gray-400">{node.created_by}</span>
                    </div>
                  )}
                  {node.created_by_file && (
                    <div>
                      <span className="font-medium text-gray-300">Source File:</span>
                      <span className="ml-2 text-gray-400">{node.created_by_file}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterByCreator(node.key);
                  }}
                  className={`p-1.5 rounded-md transition-colors duration-200 ${
                    filterByCreator === node.key
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  title={filterByCreator === node.key ? "Show all nodes" : "Show only this node and its creator"}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            )}

            {(node.source_path || node.source_block_id || node.target_path || node.target_block_id) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {node.source_path && (
                    <div className="mb-4">
                      <span className="font-medium text-gray-300">Source Path:</span>
                      <span className="ml-2 text-gray-400">{node.source_path}</span>
                    </div>
                  )}
                  {node.source_block_id && (
                    <div>
                      <span className="font-medium text-gray-300">Source Block ID:</span>
                      <span className="ml-2 text-gray-400">{node.source_block_id}</span>
                    </div>
                  )}
                </div>
                <div>
                  {node.target_path && (
                    <div className="mb-4">
                      <span className="font-medium text-gray-300">Target Path:</span>
                      <span className="ml-2 text-gray-400">{node.target_path}</span>
                    </div>
                  )}
                  {node.target_block_id && (
                    <div>
                      <span className="font-medium text-gray-300">Target Block ID:</span>
                      <span className="ml-2 text-gray-400">{node.target_block_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {node.params && (
              <div className="mt-6">
                <TextField content={JSON.stringify(node.params, null, 2)} title="Parameters" />
              </div>
            )}

            {/* Render response_messages if present and has more than one message */}
            {Array.isArray(node.response_messages) && node.response_messages.length > 1 ? (
              <div className="mt-6">
                <h3 className="font-medium text-gray-300 mb-2">LLM/Tool Conversation Trace</h3>
                <div className="bg-gray-900 border border-gray-700 rounded p-3 text-gray-300 space-y-3">
                  {node.response_messages.map((msg, idx) => {
                    const isTool = msg.role === 'tool' || msg.tool_calls || msg.tool_call_id || msg.name;
                    // Determine which view mode to use: per-message override or global
                    const viewMode = toolViewModes[idx] || globalToolViewMode;
                    // Get memoized formatted content for this message
                    const { formattedContent, formattedToolCalls } = formattedContents[idx] || {};
                    return isTool ? (
                      <div key={idx} className={`rounded ${'bg-[rgb(34,43,65)]'} p-3 text-xs text-blue-200 font-mono`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase text-blue-300">{msg.role}</span>
                            {msg.name && (
                              <span className="ml-2 text-xs text-blue-400">{msg.name}</span>
                            )}
                            {msg.tool_call_id && (
                              <span className="ml-2 text-xs text-emerald-400">Tool Call ID: {msg.tool_call_id}</span>
                            )}
                          </div>
                          {/* Per-message view mode toggle button */}
                          <button
                            className="ml-2 p-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                            onClick={e => { e.stopPropagation(); handleToggleViewMode(idx); }}
                            title={viewMode === 'formatted' ? 'Show raw JSON' : 'Show formatted view'}
                          >
                            {viewMode === 'formatted' ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="whitespace-pre-wrap break-words">
                          {viewMode === 'formatted' ? formattedContent : (
                            typeof msg.content === 'string' ? (
                              <pre className="p-2 rounded text-blue-100 overflow-x-auto" style={{background: 'rgba(0,0,0,0.33)'}}>{msg.content}</pre>
                            ) : (
                              <pre className="p-2 rounded text-blue-100 overflow-x-auto" style={{background: 'rgba(0,0,0,0.33)'}}>{JSON.stringify(msg.content, null, 2)}</pre>
                            )
                          )}
                        </div>
                        {msg.tool_calls && (
                          <div className="mt-2 text-xs text-blue-300">
                            <span className="font-semibold">Tool Calls:</span>
                            {viewMode === 'formatted' ? formattedToolCalls : (
                              <pre className="p-2 rounded text-blue-100 overflow-x-auto" style={{background: 'rgba(0,0,0,0.33)'}}>{JSON.stringify(msg.tool_calls, null, 2)}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={idx} className="px-2 py-1 text-gray-100 text-sm">
                        <span className="font-semibold text-blue-200 mr-2">{msg.role === 'assistant' ? 'Agent' : msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}:</span>
                        {typeof msg.content === 'string' ? msg.content : (
                          <pre className="p-2 rounded text-blue-100 overflow-x-auto" style={{background: 'rgba(0,0,0,0.33)'}}>{JSON.stringify(msg.content, null, 2)}</pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Fallback: Render response_content if present and not using response_messages */}
            {(!Array.isArray(node.response_messages) || node.response_messages.length <= 1) && node.response_content && (
              <div className="mt-6">
                <TextField content={node.response_content} title="Response Content" />
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDetails();
                }}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 hover:text-gray-200 
                  transition-all duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 
                  focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-850"
              >
                <X className="w-4 h-4" />
                <span>Collapse Details</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};