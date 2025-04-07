import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Network } from 'lucide-react';
import { Canvas } from './components/Canvas';
import { TraceNode } from './components/TraceNode';
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

interface CanvasDisplayProps {
  initialTraceData?: any; // Add prop for initial trace data
}

const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ initialTraceData }) => {
  // State declarations
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [hierarchicalGroups, setHierarchicalGroups] = useState<ProcessedTraceGroup | null>(null);
  const [traceGroups, setTraceGroups] = useState<TraceGroup[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [filterByCreator, setFilterByCreator] = useState<string | null>(null);
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
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'RL'>('LR'); // Default to left-to-right layout
  const [highlightSource, setHighlightSource] = useState(false);
  const [hoveredCreator, setHoveredCreator] = useState<string | null>(null); // Add hoveredCreator state

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

  // Handle initial trace data if provided
  useEffect(() => {
    if (initialTraceData) {
      try {
        console.log("[CanvasDisplay] Processing initialTraceData:", initialTraceData);
        
        // Process the trace tree data differently based on type to support both formats
        // The initialTraceData could be either a string (JSON content) or an object (processed tree)
        let processedRoot;
        
        if (typeof initialTraceData === 'string') {
          // If it's a string, parse it as JSON
          const parsedData = JSON.parse(initialTraceData) as TraceTreeNode;
          processedRoot = processTraceTreeToGroups(parsedData);
        } else if (typeof initialTraceData === 'object') {
          // If it's already an object, process it directly
          // This could be either a TraceNode object from processTraceData
          // or a fully formed TraceTreeNode
          processedRoot = processTraceTreeToGroups(initialTraceData);
        } else {
          throw new Error("Invalid trace data format");
        }
        
        if (!processedRoot) {
          throw new Error("No valid trace content found in the data");
        }
        
        console.log("[CanvasDisplay] Successfully processed tree to groups:", processedRoot);
        
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
        
        // Better approach to ensure connections are properly drawn
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
        console.error("[CanvasDisplay] Error processing initial trace data:", err);
      }
    }
  }, [initialTraceData]);

  return (
    <div className={`${styles.canvasContainer} ${styles.customScrollbar} h-screen flex flex-col bg-gray-900`}>
      <div className="relative flex-1 overflow-hidden">
        {/* Add both controls at the top of canvas area */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {/* Layout direction toggle button */}
          <button
            onClick={() => setLayoutDirection(layoutDirection === 'LR' ? 'RL' : 'LR')}
            className={`p-2 rounded-md transition-colors ${
              layoutDirection === 'LR' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={layoutDirection === 'LR' ? "Switch to Right-to-Left layout" : "Switch to Left-to-Right layout"}
          >
            {layoutDirection === 'LR' ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </button>

          {/* Show as tree toggle button */}
          <button
            onClick={() => setShowAsTree(!showAsTree)}
            className={`p-2 rounded-md transition-colors ${
              showAsTree 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={showAsTree ? "Switch to linear view" : "Switch to tree view"}
          >
            <Network className="w-5 h-5" />
          </button>
        </div>

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
              highlightSource={highlightSource}
              onHighlightSourceChange={(value) => setHighlightSource(value)}
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
                    layoutDirection={layoutDirection}
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
                          // Dim everything else if hoveredCreator is set and these nodes aren't children
                          opacity: hoveredCreator &&
                                   !group.data.some(n => n.key === hoveredCreator || n.created_by === hoveredCreator)
                                    ? 0.5
                                    : 1
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
                                  width: `${baseWidth - 48}px`, // Adjust width to account for padding
                                  // Similar dimming logic per node
                                  opacity: hoveredCreator &&
                                           node.created_by !== hoveredCreator &&
                                           node.key !== hoveredCreator
                                            ? 0.5
                                            : 1
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
                                  highlightSource={highlightSource}
                                  hoveredCreator={hoveredCreator}
                                  setHoveredCreator={setHoveredCreator}
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