import React, { useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, X, Filter } from 'lucide-react';
import { getNodeIcon } from '../utils/icons';
import { TextField } from './TextField';
import { TraceNodeData } from '../types';
import styles from '../styles/TraceNode.module.css';

interface TraceNodeProps {
  node: TraceNodeData;
  isDetailsExpanded: boolean;
  isCollapsed: boolean;
  onToggleDetails: () => void;
  onToggleCollapse: () => void;
  onFilterByCreator: (key: string) => void;
  filterByCreator: string | null;
  onZoomToFit?: (element: HTMLElement) => void;
}

export const TraceNode: React.FC<TraceNodeProps> = ({
  node,
  isDetailsExpanded,
  isCollapsed,
  onToggleDetails,
  onToggleCollapse,
  onFilterByCreator,
  filterByCreator,
  onZoomToFit
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  
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
        onClick={handleToggleCollapse}
      >
        <div className="bg-gray-800 p-3 cursor-pointer" 
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getNodeIcon(node.type)}
              <span className="ml-2 font-medium text-gray-200 text-lg">{node.name || node.type}</span>
              <span className="ml-2 text-sm text-gray-400">[{node.type}]</span>
              <span className="ml-2 text-sm text-gray-400">Key: {node.key}</span>
            </div>
            
            {node.content && !isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const textField = nodeRef.current?.querySelector('[data-text-field-id]');
                  const wrapButton = textField?.querySelector('button');
                  if (wrapButton) wrapButton.click();
                }}
                className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors duration-200"
                title="Toggle word wrap"
              >
                {/* Button content handled by TextField component */}
              </button>
            )}
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
          <div className={`bg-gray-850 border-t border-gray-700 p-4 transition-all duration-300 ease-in-out ${styles.traceNodeContent}`}>
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

            {node.response_content && (
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