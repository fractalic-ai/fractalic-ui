import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, ZoomIn, ZoomOut, Minimize, Maximize, Eye, EyeOff } from 'lucide-react';
import { NodeConnections } from './NodeConnections';
import { TraceTreeNode } from '../types';
import { ConnectionType } from '../utils/ConnectionManager';
import { resizeObserverManager } from '../utils/ResizeObserverManager';

interface CanvasProps {
  children: React.ReactNode;
  onZoomToFit?: (callback: (element: HTMLElement) => void) => void;
  nodePositions?: Map<string, { groupId: string; element: HTMLElement }[]>;
  onTransformChange?: (transform: Transform) => void;
  traceTree?: TraceTreeNode;
  onCollapseAll?: () => void;
  areAllNodesCollapsed?: boolean;
  nodeRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  traceGroups?: any[];
  connections?: any[];
  onConnectionSegmentsUpdate?: (segments: any[]) => void;
  collectNodePositions?: () => void; // Add this prop
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const Canvas: React.FC<CanvasProps> = ({ 
  children, 
  onZoomToFit, 
  nodePositions,
  onTransformChange,
  traceTree,
  onCollapseAll,
  areAllNodesCollapsed = false,
  nodeRefs,
  traceGroups,
  connections,
  onConnectionSegmentsUpdate,
  collectNodePositions, // Add this to the props destructuring
}) => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  
  // Add connection visibility state
  const [showIdentityConnections, setShowIdentityConnections] = useState(true);
  const [showCreatedByConnections, setShowCreatedByConnections] = useState(true);

  const updateTransform = useCallback((newTransform: Transform) => {
    setTransform(newTransform);
    
    // Cancel any pending transform updates
    if (transformTimeoutRef.current) {
      window.clearTimeout(transformTimeoutRef.current);
    }
    
    // Immediately notify of transform change
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [onTransformChange]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey) {
      const delta = e.deltaY;
      const scaleChange = delta > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(transform.scale * scaleChange, 0.1), 3);
    
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        // Use the same approach as panning
        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
        // Update transform without triggering path recalculation
        updateTransform({ x: newX, y: newY, scale: newScale });
        
        // We only need to collect node positions, not recalculate paths
        // This prevents paths from changing shape during zoom
        if (collectNodePositions) {
          collectNodePositions();
        }
      }
    } else {
      updateTransform({
        ...transform,
        x: transform.x - e.deltaX,
        y: transform.y - e.deltaY,
      });
    }
  }, [transform, updateTransform, collectNodePositions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      updateTransform({ ...transform, x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const scaleChange = direction === 'in' ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(transform.scale * scaleChange, 0.1), 3);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newX = centerX - (centerX - transform.x) * (newScale / transform.scale);
      const newY = centerY - (centerY - transform.y) * (newScale / transform.scale);

      updateTransform({ x: newX, y: newY, scale: newScale });
      
      // Update positions without changing paths
      if (collectNodePositions) {
        collectNodePositions();
      }
    }
  };

  const zoomToFit = useCallback((element: HTMLElement) => {
    if (!containerRef.current || !contentRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const padding = 40;
    const targetWidth = containerRect.width - (padding * 2);
    const scale = targetWidth / elementRect.width;
    const newScale = Math.min(Math.max(scale, 0.1), 3);

    const contentRect = contentRef.current.getBoundingClientRect();
    const relativeLeft = (elementRect.left - contentRect.left) / transform.scale;
    const relativeTop = (elementRect.top - contentRect.top) / transform.scale;

    const newX = (containerRect.width - (elementRect.width * newScale)) / 2;
    const newY = (containerRect.height - (elementRect.height * newScale)) / 2;

    updateTransform({
      x: newX - (relativeLeft * newScale),
      y: newY - (relativeTop * newScale),
      scale: newScale
    });
  }, [transform.scale, updateTransform]);

  useEffect(() => {
    if (onZoomToFit) {
      onZoomToFit(zoomToFit);
    }
  }, [onZoomToFit, zoomToFit]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const toggleConnectionVisibility = (type: 'identity' | 'created-by') => {
    // When toggling visibility, force a path update to ensure connections render correctly
    const fireUpdate = () => {
      const event = new CustomEvent('force-connections-update');
      window.dispatchEvent(event);
    };
    
    if (type === 'identity') {
      setShowIdentityConnections(!showIdentityConnections);
      setTimeout(fireUpdate, 50);
    } else {
      setShowCreatedByConnections(!showCreatedByConnections);
      setTimeout(fireUpdate, 50);
    }
  };

  // Add listener for node resize events to trigger layout updates
  useEffect(() => {
    const handleNodeResize = () => {
      // Trigger a connection update when node sizes change
      const event = new CustomEvent('force-connections-update');
      window.dispatchEvent(event);
    };
    
    window.addEventListener('node-resize', handleNodeResize);
    
    return () => {
      window.removeEventListener('node-resize', handleNodeResize);
    };
  }, []);
  
  // Set up ResizeObservers for group containers
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find all group containers and observe them
    const groupElements = containerRef.current.querySelectorAll('[data-trace-id]');
    groupElements.forEach(element => {
      const groupId = element.getAttribute('data-trace-id');
      if (groupId) {
        resizeObserverManager.observeGroup(groupId, element as HTMLElement);
      }
    });
    
    return () => {
      // Clean up observers
      if (containerRef.current) {
        const groupElements = containerRef.current.querySelectorAll('[data-trace-id]');
        groupElements.forEach(element => {
          const groupId = element.getAttribute('data-trace-id');
          if (groupId) {
            resizeObserverManager.unobserveGroup(groupId);
          }
        });
      }
    };
  }, [traceTree, traceGroups]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 rounded-lg">
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {/* Connection visibility toggle buttons */}
        <div className="flex mr-4">
          <button
            onClick={() => toggleConnectionVisibility('identity')}
            className={`p-2 flex items-center ${showIdentityConnections ? 'bg-blue-600' : 'bg-gray-800'} text-gray-300 rounded-l-md hover:bg-gray-700 transition-colors`}
            title={showIdentityConnections ? "Hide blue Identity connections" : "Show blue Identity connections"}
          >
            {showIdentityConnections ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <div className="w-3 h-3 bg-blue-400 rounded-full ml-2" />
          </button>
          <button
            onClick={() => toggleConnectionVisibility('created-by')}
            className={`p-2 flex items-center ${showCreatedByConnections ? 'bg-blue-600' : 'bg-gray-800'} text-gray-300 rounded-r-md hover:bg-gray-700 transition-colors`}
            title={showCreatedByConnections ? "Hide green Created-by connections" : "Show green Created-by connections"}
          >
            {showCreatedByConnections ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <div className="w-3 h-3 bg-green-400 rounded-full ml-2" />
          </button>
        </div>

        <button
          onClick={() => onCollapseAll ? onCollapseAll() : null}
          className={`p-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors ${areAllNodesCollapsed ? 'bg-gray-700' : ''}`}
          title={areAllNodesCollapsed ? "Expand all nodes" : "Collapse all nodes"}
        >
          {areAllNodesCollapsed ? <Maximize className="w-5 h-5" /> : <Minimize className="w-5 h-5" />}
        </button>
        <button
          onClick={() => handleZoom('in')}
          className="p-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        {isDragging && (
          <div className="p-2 bg-gray-800 text-gray-300 rounded-md flex items-center gap-2">
            <Move className="w-5 h-5" />
            <span>Dragging</span>
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: 'none', // Remove transition to fix zoom issue
            position: 'relative' // Ensure proper positioning context
          }}
        >
          {/* Put the NodeConnections component BEFORE the children so it sits behind them */}
          {nodePositions && (
            <NodeConnections
              nodePositions={nodePositions}
              transform={transform}
              containerRef={containerRef}
              isDragging={isDragging}
              traceTree={traceTree}
              nodeRefs={nodeRefs}
              traceGroups={traceGroups}
              onConnectionSegmentsUpdate={onConnectionSegmentsUpdate}
              showIdentityConnections={showIdentityConnections}
              showCreatedByConnections={showCreatedByConnections}
              collectNodePositions={collectNodePositions || (() => {})} // Pass the function with a fallback
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
};