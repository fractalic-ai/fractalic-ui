import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { Canvas } from './components/Canvas';
import { TraceNode } from './components/TraceNode';
import { DebugPanel } from './components/DebugPanel';
import { TraceNodeData, TraceTreeNode, ProcessedTraceGroup, TraceGroup, NodePosition } from './types';
import { TreeLayout } from './components/TreeLayout';
import { connectionManager, Connection } from './utils/ConnectionManager';
import styles from './styles/CanvasDisplay.module.css';

// Recursively render groups using hierarchical structure and layout positions.
const RenderGroupsTree: React.FC<{
  groups: ProcessedTraceGroup[];
  groupLayouts: Map<string, { x: number; y: number; width: number; height: number }>;
  nodeRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  expandedDetails: Set<string>;
  filterByCreator: string | null;
  toggleDetails: (nodeKey: string) => void;
  handleFilterByCreator: (key: string) => void;
  zoomToFit?: (element: HTMLElement) => void;
  collapsedNodes: Set<string>;
  toggleNodeCollapse: (nodeKey: string) => void;
}> = ({
  groups,
  groupLayouts,
  nodeRefs,
  expandedDetails,
  filterByCreator,
  toggleDetails,
  handleFilterByCreator,
  zoomToFit,
  collapsedNodes,
  toggleNodeCollapse
}) => {
  return (
    <>
      {groups.map(group => {
        // Get layout info computed in TreeLayout.
        const layout = groupLayouts.get(group.id) || { x: 0, y: 0, width: 800, height: 300 };
        return (
          <div
            key={group.id}
            className="absolute border-2 border-gray-700/30 rounded-lg p-6 pt-8 bg-gray-900"
            style={{
              width: `${layout.width}px`,
              left: `${layout.x}px`,
              top: `${layout.y}px`,
              position: 'absolute'
            }}
            data-trace-id={group.id}
          >
            <div className="absolute -top-3 left-4 px-2 bg-gray-900">
              <span className="text-gray-400 text-sm font-medium">{group.text}</span>
            </div>
            <div className="grid gap-4">
              {group.data.map(node => {
                const nodeKey = `${group.id}|${node.key}`;
                const indentLevel = Math.max(0, node.level - 1);
                return (
                  <div
                    key={nodeKey}
                    ref={el => {
                      nodeRefs.current[nodeKey] = el;
                    }}
                    style={{
                      marginLeft: indentLevel > 0 ? `${indentLevel * 54}px` : undefined
                    }}
                  >
                    <TraceNode
                      node={node}
                      isDetailsExpanded={expandedDetails.has(nodeKey)}
                      isCollapsed={collapsedNodes.has(nodeKey)}
                      onToggleCollapse={() => toggleNodeCollapse(nodeKey)}
                      onToggleDetails={() => toggleDetails(nodeKey)}
                      onFilterByCreator={handleFilterByCreator}
                      filterByCreator={filterByCreator}
                      onZoomToFit={zoomToFit}
                    />
                  </div>
                );
              })}
            </div>
            {/* Recursively render children groups */}
            {group.children.length > 0 && (
              <RenderGroupsTree
                groups={group.children}
                groupLayouts={groupLayouts}
                nodeRefs={nodeRefs}
                expandedDetails={expandedDetails}
                filterByCreator={filterByCreator}
                toggleDetails={toggleDetails}
                handleFilterByCreator={handleFilterByCreator}
                zoomToFit={zoomToFit}
                collapsedNodes={collapsedNodes}
                toggleNodeCollapse={toggleNodeCollapse}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

const CanvasDisplay: React.FC = () => {
  // State declarations
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [hierarchicalGroups, setHierarchicalGroups] = useState<ProcessedTraceGroup | null>(null);
  const [traceGroups, setTraceGroups] = useState<TraceGroup[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterByCreator, setFilterByCreator] = useState<string | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [showAsTree, setShowAsTree] = useState(false);
  const [groupLayouts, setGroupLayouts] = useState(
    new Map<string, { x: number; y: number; width: number; height: number }>()
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition[]>>(new Map());
  const [connectionSegments, setConnectionSegments] = useState<Array<{ path: string; type: string }>>([]);
  const [layoutUpdateCounter, setLayoutUpdateCounter] = useState(0);
  const [areAllNodesCollapsed, setAreAllNodesCollapsed] = useState(false);

  // Refs
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const zoomToFitRef = useRef<(element: HTMLElement) => void>();

  // Callbacks
  const toggleNodeCollapse = useCallback((nodeKey: string) => {
    const newCollapsed = new Set(collapsedNodes);
    if (newCollapsed.has(nodeKey)) {
      newCollapsed.delete(nodeKey);
    } else {
      newCollapsed.add(nodeKey);
    }
    setCollapsedNodes(newCollapsed);
  }, [collapsedNodes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };
  
  // Move the collectNodePositions function here, before it's used
  const collectNodePositions = useCallback(() => {
    const newPositions = new Map<string, NodePosition[]>();
    
    Object.entries(nodeRefs.current).forEach(([nodeKey, element]) => {
      if (!element) return;
      
      const [groupId] = nodeKey.split('|');
      const position: NodePosition = {
        groupId,
        element
      };
      
      const positions = newPositions.get(nodeKey) || [];
      positions.push(position);
      newPositions.set(nodeKey, positions);
    });
    
    setNodePositions(newPositions);
  }, []);

  // Update the processTraceTreeToGroups function to skip nodes with no trace_content
  const processTraceTreeToGroups = (traceTree: TraceTreeNode, parentId?: string): ProcessedTraceGroup | null => {
    const groupId = parentId ? `${parentId}-${traceTree.id}` : traceTree.id;
    
    // Process current node's trace content
    let nodeData: TraceNodeData[] = [];
    let hasContent = false;
    
    if (traceTree.trace_content) {
      try {
        const parsedContent = JSON.parse(traceTree.trace_content);
        if (Array.isArray(parsedContent) && parsedContent.length > 0) {
          nodeData = parsedContent.map(node => ({
            ...node,
            trace_node_id: traceTree.id
          }));
          hasContent = true;
        }
      } catch {
        console.error("Failed to parse trace content for node:", traceTree.id);
      }
    }
    
    // Process children recursively
    const children: ProcessedTraceGroup[] = [];
    if (traceTree.children && traceTree.children.length > 0) {
      traceTree.children.forEach(child => {
        const processedChild = processTraceTreeToGroups(child, groupId);
        if (processedChild) {
          children.push(processedChild);
        }
      });
    }
    
    // Only return a group if it has content or children with content
    if (hasContent || children.length > 0) {
      return {
        id: groupId,
        text: traceTree.text,
        data: nodeData,
        children,
        hasContent
      };
    }
    
    return null;
  };

  // Update the convertToFlatGroups function to handle virtual nodes

const convertToFlatGroups = (processedGroup: ProcessedTraceGroup, parentId?: string): TraceGroup[] => {
  const flatGroups: TraceGroup[] = [];
  
  // Add current group if it has content
  if (processedGroup.hasContent) {
    flatGroups.push({
      id: processedGroup.id,
      text: processedGroup.text,
      data: processedGroup.data,
      parentId: parentId
    });
  }
  
  // Add child groups
  const lastParentId = processedGroup.hasContent ? processedGroup.id : parentId;
  
  processedGroup.children.forEach(child => {
    flatGroups.push(...convertToFlatGroups(child, lastParentId));
  });
  
  return flatGroups;
};

// Update the handleLoadTrace function

const handleLoadTrace = () => {
  try {
    const parsedData = JSON.parse(inputValue) as TraceTreeNode;
    
    // Process the hierarchical tree into a nested structure of groups
    const processedRoot = processTraceTreeToGroups(parsedData);
    
    if (!processedRoot) {
      throw new Error("No valid trace content found in the data");
    }
    
    // Set the hierarchical structure for TreeLayout
    setHierarchicalGroups(processedRoot);
    
    // Convert the tree to a flat array of groups
    const flatGroups = convertToFlatGroups(processedRoot);
    
    if (flatGroups.length === 0) {
      throw new Error("No valid trace groups found in the data");
    }
    
    setTraceGroups(flatGroups);
    setExpandedDetails(new Set());
    setFilterByCreator(null);
    setError(null);
    setInputValue('');

    // Better approach to ensure connections are properly drawn
    // Add a proper initialization flag
    setTimeout(() => {
      const forceUpdate = () => {
        // First force a position update
        collectNodePositions();
        
        // Then make sure connections are recalculated
        const renderEvent = new CustomEvent('force-connections-update');
        window.dispatchEvent(renderEvent);
      };

      // Try multiple times with increasing delays to ensure it's properly done
      forceUpdate();
      setTimeout(forceUpdate, 100);
      setTimeout(forceUpdate, 300);
      setTimeout(forceUpdate, 600);
    }, 100);

  } catch (err) {
    console.error("Error processing trace data:", err);
    setError('Invalid JSON format or no valid trace content found. Please check your input.');
  }
};

  useEffect(() => {
    if (traceGroups.length > 0 && hierarchicalGroups) {
      const newConnections = connectionManager.calculateConnections(traceGroups);
      setConnections(newConnections);
    }
  }, [traceGroups, hierarchicalGroups]);

  const toggleDetails = (nodeKey: string) => {
    const nodeElement = nodeRefs.current[nodeKey];
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const nodeTop = rect.top + scrollTop;

      // Dispatch event for connection manager to start continuous updates
      const actionEvent = new CustomEvent('node-transition', {
        detail: {
          nodeKey: nodeKey,
          action: expandedDetails.has(nodeKey) ? 'collapse' : 'expand'
        }
      });
      window.dispatchEvent(actionEvent);

      const newExpanded = new Set(expandedDetails);
      if (newExpanded.has(nodeKey)) {
        newExpanded.delete(nodeKey);
      } else {
        newExpanded.add(nodeKey);
      }
      setExpandedDetails(newExpanded);

      // Trigger layout update after state change
      setTimeout(() => {
        const event = new CustomEvent('force-layout-update');
        window.dispatchEvent(event);
        setLayoutUpdateCounter(prev => prev + 1);
      }, 100);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: nodeTop,
          behavior: 'instant'
        });
      });
    }
  };

  const handleFilterByCreator = (key: string) => {
    setFilterByCreator(filterByCreator === key ? null : key);
  };

  const getFilteredTraceData = (data: TraceNodeData[]) => {
    if (!filterByCreator) return data;
    return data.filter((node: TraceNodeData) => 
      node.key === filterByCreator || 
      data.find((n: TraceNodeData) => n.key === filterByCreator)?.created_by === node.key
    );
  };

  const handleZoomToFit = useCallback((zoomFn: (element: HTMLElement) => void) => {
    zoomToFitRef.current = zoomFn;
  }, []);

  const getMaxIndentLevel = (data: TraceNodeData[]) => {
    return Math.max(0, ...data.map(node => node.level - 1));
  };

  const getNodePositions = () => {
    const positions = new Map<string, NodePosition[]>();
    
    Object.entries(nodeRefs.current).forEach(([nodeKey, element]) => {
      if (element) {
        const [groupId] = nodeKey.split('|');
        const positions_list = positions.get(nodeKey) || [];
        positions.set(nodeKey, [...positions_list, { groupId, element }]);
      }
    });

    return positions;
  };

  const handleTransformChange = (newTransform: { x: number; y: number; scale: number }) => {
    setTransform(newTransform);
  };

  const handleTreeLayout = useCallback((layoutMap: Map<string, { x: number; y: number; width: number; height: number }>) => {
    setGroupLayouts(layoutMap);
    
    // Force connection recalculation after layout changes
    setTimeout(() => {
      collectNodePositions();
      const event = new CustomEvent('force-connections-update');
      window.dispatchEvent(event);
    }, 50);
  }, [collectNodePositions]);

  const collapseAllNodes = () => {
    // Dispatch a bulk operation event first
    const bulkEvent = new CustomEvent('bulk-operation', {
      detail: { action: 'bulk-collapse' }
    });
    window.dispatchEvent(bulkEvent);
    
    // Then set the state
    const allNodeKeys = Object.keys(nodeRefs.current);
    setCollapsedNodes(new Set(allNodeKeys));
    setAreAllNodesCollapsed(true);
    
    // Trigger continuous connection updates during animation
    const duration = 350; // Match CSS transition duration
    const startTime = performance.now();
    
    const animateConnections = () => {
      collectNodePositions();
      // Directly update connections instead of event dispatching
      const renderEvent = new CustomEvent('force-connections-update', { 
        detail: { isBulkOperation: true }
      });
      window.dispatchEvent(renderEvent);
      
      const elapsed = performance.now() - startTime;
      if (elapsed < duration + 50) { // Add a small buffer time
        requestAnimationFrame(animateConnections);
      } else {
        // Final update after animation completes
        collectNodePositions();
        window.dispatchEvent(new CustomEvent('force-connections-update'));
      }
    };
    
    requestAnimationFrame(animateConnections);
    
    // After animation completes, update layout
    setTimeout(() => {
      const event = new CustomEvent('force-layout-update');
      window.dispatchEvent(event);
      setLayoutUpdateCounter(prev => prev + 1);
    }, duration + 50);
  };

  const expandAllNodes = () => {
    // Dispatch a bulk operation event first
    const bulkEvent = new CustomEvent('bulk-operation', {
      detail: { action: 'bulk-expand' }
    });
    window.dispatchEvent(bulkEvent);
    
    // Then set the state
    setCollapsedNodes(new Set());
    setAreAllNodesCollapsed(false);
    
    // Trigger continuous connection updates during animation
    const duration = 350; // Match CSS transition duration
    const startTime = performance.now();
    
    const animateConnections = () => {
      collectNodePositions();
      // Directly update connections instead of event dispatching
      const renderEvent = new CustomEvent('force-connections-update', { 
        detail: { isBulkOperation: true } 
      });
      window.dispatchEvent(renderEvent);
      
      const elapsed = performance.now() - startTime;
      if (elapsed < duration + 50) { // Add a small buffer time
        requestAnimationFrame(animateConnections);
      } else {
        // Final update after animation completes
        collectNodePositions();
        window.dispatchEvent(new CustomEvent('force-connections-update'));
      }
    };
    
    requestAnimationFrame(animateConnections);
    
    // After animation completes, update layout
    setTimeout(() => {
      const event = new CustomEvent('force-layout-update');
      window.dispatchEvent(event);
      setLayoutUpdateCounter(prev => prev + 1);
    }, duration + 50);
  };

  // Update the effect that calculates connections
  useEffect(() => {
    if (traceGroups.length > 0) {
      // Calculate connections directly from trace data
      const newConnections = connectionManager.calculateConnections(traceGroups);
      setConnections(newConnections);
      
      // Also update node positions
      collectNodePositions();
    }
  }, [traceGroups, collectNodePositions]);

  // Add a ResizeObserver to update node positions when DOM changes
  useEffect(() => {
    if (traceGroups.length === 0) return;
    
    // Create a ResizeObserver to detect size changes of nodes
    const resizeObserver = new ResizeObserver(() => {
      collectNodePositions();
    });
    
    // Observe each node element
    Object.values(nodeRefs.current).forEach(element => {
      if (element) resizeObserver.observe(element);
    });
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [traceGroups, collectNodePositions]);

  const handleConnectionSegmentsUpdate = useCallback((segments: Array<{ path: string; type: string }>) => {
    setConnectionSegments(segments);
  }, []);

  return (
    <div className={`${styles.canvasContainer} ${styles.customScrollbar} h-screen flex flex-col bg-gray-900`}>
      <div className={`flex-none bg-gray-800 border-b border-gray-700 transition-all duration-300 ease-in-out
        ${isPanelExpanded ? 'p-4 md:p-6' : 'p-2'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-100">Trace File Viewer</h1>
              <button
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                title={isPanelExpanded ? "Collapse input panel" : "Expand input panel"}
              >
                {isPanelExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={showAsTree}
                  onChange={(e) => setShowAsTree(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                Show as tree
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={isDebugPanelOpen}
                  onChange={(e) => setIsDebugPanelOpen(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                Show Debug Panel
              </label>
              {filterByCreator && (
                <button
                  onClick={() => setFilterByCreator(null)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear Filter
                </button>
              )}
            </div>
          </div>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden
            ${isPanelExpanded ? 'h-auto opacity-100 mt-4' : 'h-0 opacity-0'}`}>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="traceInput" className="block text-sm font-medium text-gray-300 mb-2">
                  Paste Trace Data (JSON format)
                </label>
                <textarea
                  id="traceInput"
                  className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md shadow-sm text-gray-300 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 custom-scrollbar"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Paste your trace data here..."
                />
              </div>
              <button
                onClick={handleLoadTrace}
                className="px-6 py-2 h-10 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Load Trace Data
              </button>
            </div>
            {error && (
              <p className="mt-2 text-red-400 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {traceGroups.length > 0 ? (
          <>
            <Canvas 
              onZoomToFit={handleZoomToFit}
              nodePositions={nodePositions}
              onTransformChange={handleTransformChange}
              connections={connections}
              traceTree={traceGroups.length > 0 ? traceGroups[0].traceTree : undefined}
              onCollapseAll={areAllNodesCollapsed ? expandAllNodes : collapseAllNodes}
              areAllNodesCollapsed={areAllNodesCollapsed}
              nodeRefs={nodeRefs}
              traceGroups={traceGroups}
              onConnectionSegmentsUpdate={handleConnectionSegmentsUpdate}
              collectNodePositions={collectNodePositions} // Pass the function here
            >
              <div className="relative p-4">
                {/* Pass the hierarchical groups to TreeLayout */}
                {hierarchicalGroups && 
                  <TreeLayout 
                    processedGroups={hierarchicalGroups.children} 
                    onLayout={handleTreeLayout}
                    collapsedNodes={collapsedNodes}
                    expandedDetails={expandedDetails}
                    forceUpdate={layoutUpdateCounter}
                  />
                }
                
                {/* Render groups using the calculated layout */}
                <div className="relative">
                  {traceGroups.map((group) => {
                    const filteredData = getFilteredTraceData(group.data);
                    const maxIndentLevel = showAsTree ? getMaxIndentLevel(filteredData) : 0;
                    const extraWidth = maxIndentLevel * 54;
                    const hasContent = filteredData.length > 0;
                    
                    // Calculate the base width for the group
                    const baseWidth = hasContent ? 800 : 300; // Smaller width for empty groups
                    
                    // Get layout information if available
                    const layout = groupLayouts.get(group.id);
                    
                    return (
                      <div 
                        key={group.id} 
                        className="absolute border-2 border-gray-700/30 rounded-lg p-6 pt-8"
                        style={{
                          width: showAsTree ? `${baseWidth + extraWidth}px` : `${baseWidth}px`,
                          minWidth: '300px',
                          height: 'fit-content',
                          left: layout ? `${layout.x}px` : undefined,
                          top: layout ? `${layout.y}px` : undefined,
                          position: layout ? 'absolute' : 'relative',
                          transition: 'left 0.3s ease-out, top 0.3s ease-out',
                        }}
                        data-trace-id={group.id}
                      >
                        <div className="absolute -top-3 left-4 px-2 bg-gray-900">
                          <span className="text-gray-400 text-sm font-medium">{group.text}</span>
                        </div>
                        <div className="grid gap-4">
                          {filteredData.map(node => {
                            const nodeKey = `${group.id}|${node.key}`;
                            const indentLevel = showAsTree ? Math.max(0, node.level - 1) : 0;
                            return (
                              <div
                                key={nodeKey}
                                ref={el => {
                                  nodeRefs.current[nodeKey] = el;
                                }}
                                style={{
                                  marginLeft: indentLevel > 0 ? `${indentLevel * 54}px` : undefined,
                                  width: `${baseWidth - 48}px` // Adjust width to account for padding
                                }}
                                className="transition-all duration-300 ease-in-out"
                              >
                                <TraceNode
                                  node={node}
                                  isDetailsExpanded={expandedDetails.has(nodeKey)}
                                  isCollapsed={collapsedNodes.has(nodeKey)}
                                  onToggleCollapse={() => toggleNodeCollapse(nodeKey)}
                                  onToggleDetails={() => toggleDetails(nodeKey)}
                                  onFilterByCreator={handleFilterByCreator}
                                  filterByCreator={filterByCreator}
                                  onZoomToFit={zoomToFitRef.current}
                                />
                              </div>
                            );
                          })}
                          {filteredData.length === 0 && (
                            <div className="text-gray-500 italic text-sm py-4 text-center">
                              No content available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Canvas>
            <DebugPanel
              nodePositions={getNodePositions()}
              isOpen={isDebugPanelOpen}
              onToggle={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
              transform={transform}
              connectionSegments={connectionSegments}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <p>No trace data loaded. Paste your trace data above and click &quot;Load Trace Data&quot; to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasDisplay;