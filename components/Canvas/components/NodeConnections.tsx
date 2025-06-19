import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { TraceTreeNode } from '../types'; // Assuming this import path is correct
import { ConnectionType } from '../utils/ConnectionManager'; // Assuming this import path is correct

// --- Helper Types ---
interface Point {
  x: number;
  y: number;
}

interface SvgRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface NodeInfo {
  id: string;
  key: string; // e.g., "groupId|nodeId"
  groupId: string;
  svgRect: SvgRect; // Rectangle in SVG coordinate space
  domRect: DOMRect; // Keep DOM rect for offset calculations relative to screen
  createdBy?: string; // Keep original data properties needed
}

// --- Debugging Helper ---
const parsePathToSegments = (path: string | null | undefined) => {
  if (!path) return [];
  const segments = [];
  const commands = path.trim().split(/(?=[MLCQmlcq])/).filter(cmd => cmd.trim());

  for (let cmd of commands) {
    cmd = cmd.trim();
    const command = cmd[0].toUpperCase();
    const points = cmd.substring(1).trim().split(/[\s,]+/).map(Number);

    let description = '';
    switch(command) {
      case 'M': description = 'Move to'; break;
      case 'L': description = 'Line to'; break;
      case 'C': description = 'Curve'; break; // Keep for parsing, though not generated
      case 'Q': description = 'Quadratic curve'; break; // Keep for parsing
      default: description = 'Unknown command';
    }

    segments.push({ command, points, description });
  }
  return segments;
};


// --- Component Props ---
interface NodeConnectionsProps {
  transform: {
    x: number;
    y: number;
    scale: number;
  };
  containerRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  traceTree?: TraceTreeNode; // Keep if used elsewhere
  nodeRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>; // Make non-optional as it's crucial
  traceGroups: any[]; // Keep, used to find node data like 'createdBy'
  onConnectionSegmentsUpdate?: (segments: any[]) => void;
  showIdentityConnections?: boolean;
  showCreatedByConnections?: boolean;
  showReturnNodesAttributionConnections?: boolean;
  collectNodePositions: () => void; // Make non-optional
}

// --- Path Overlap Avoidance Registry (Refined Version) ---
const PATH_REGISTRY = {
  // Store PRECISE coordinate values (x for vertical, y for horizontal) in the Sets
  horizontalSegments: new Map<string, Set<number>>(), // Key: y-band string, Value: Set<precise y-coord>
  verticalSegments: new Map<string, Set<number>>(),   // Key: x-band string, Value: Set<precise x-coord>

  // Find an offset coordinate trying to avoid existing registered PRECISE coordinates
  getUniqueOffset: function(isHorizontal: boolean, key: string, baseValue: number, attemptCount = 0): number {
    const registry = isHorizontal ? this.horizontalSegments : this.verticalSegments;
    const offsetsInSet = registry.get(key) || new Set<number>(); // Set of precise numbers

    const offsetStep = 15; // How far to jump when looking for a new slot (>= MIN_SEPARATION)
    const MIN_SEPARATION = 10; // Minimum distance between parallel line coordinates
    const maxAttempts = 15; // Increase attempts slightly

    // Function to check for collision with existing precise offsets
    const checkCollision = (testCoord: number): boolean => {
        for (const existingCoord of offsetsInSet) {
            if (Math.abs(testCoord - existingCoord) < MIN_SEPARATION) {
                // console.log(`Collision detected for key ${key}: test=${testCoord.toFixed(1)} too close to existing=${existingCoord.toFixed(1)}`);
                return true; // Collision found
            }
        }
        return false; // No collision
    };

    // Attempt 0: Try the base value itself first
    if (!checkCollision(baseValue)) {
        offsetsInSet.add(baseValue);
        registry.set(key, offsetsInSet);
        // console.log(`Offset success for ${key}: base=${baseValue.toFixed(1)} (attempt 0)`);
        return baseValue;
    }

    // Attempts 1+: Search outwards using offsetStep
    for (let i = 1; i <= maxAttempts; i++) {
      // Alternate offset direction (+/-) from baseValue
      const direction = (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2);
      const testOffset = baseValue + direction * offsetStep;

      if (!checkCollision(testOffset)) {
          offsetsInSet.add(testOffset); // Add the precise offset
          registry.set(key, offsetsInSet);
          // console.log(`Offset success for ${key}: base=${baseValue.toFixed(1)}, offset=${testOffset.toFixed(1)} (attempt ${i})`);
          return testOffset; // Return the precise offset
      }
    }

    // Fallback if no free slot found nearby after maxAttempts
    console.warn(`PathRegistry: Could not find unique offset for key ${key}, baseValue ${baseValue.toFixed(1)}. Using fallback.`);
    // Simple fallback, slightly offset from base based on attempt count, ensure it's added
    const fallbackOffset = baseValue + ((attemptCount % 5) + 1) * (isHorizontal ? 5 : -5) * (attemptCount % 2 === 0 ? 1 : -1);
    // Check collision even for fallback, though unlikely to help much here
    if (!checkCollision(fallbackOffset)) {
         offsetsInSet.add(fallbackOffset);
         registry.set(key, offsetsInSet);
    } else {
        // If even fallback collides, just add baseValue (it will overlap, but prevents infinite loops)
         offsetsInSet.add(baseValue);
         registry.set(key, offsetsInSet);
         console.warn(`PathRegistry: Fallback offset collision for key ${key}, using base value.`);
         return baseValue;
    }

    return fallbackOffset;
  },

  // Register the PRECISE horizontal and vertical coordinates from a calculated path
  registerPath: function(path: string | null | undefined, isStable = true) {
    if (!isStable || !path) return;

    const segments = parsePathToSegments(path);
    let lastPoint: Point | null = null;

    const registerSegment = (p1: Point, p2: Point) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const tolerance = 1;

        if (Math.abs(dy) < tolerance) { // Horizontal line
            const yCoord = p1.y; // Use precise coordinate
            // Key based only on y-band
            const key = `h-band-${Math.round(yCoord / 20) * 20}`;
            const segSet = this.horizontalSegments.get(key) || new Set<number>();
            segSet.add(yCoord); // Add precise coordinate
            this.horizontalSegments.set(key, segSet);

        } else if (Math.abs(dx) < tolerance) { // Vertical line
             const xCoord = p1.x; // Use precise coordinate
             // Key based only on x-band
             const key = `v-band-${Math.round(xCoord / 20) * 20}`;
             const segSet = this.verticalSegments.get(key) || new Set<number>();
             segSet.add(xCoord); // Add precise coordinate
             this.verticalSegments.set(key, segSet);
        }
    };

    segments.forEach(seg => {
        let currentPoint: Point | null = null;
        if (seg.command === 'M') {
            currentPoint = { x: seg.points[0], y: seg.points[1] };
        } else if (seg.command === 'L' && lastPoint) {
            currentPoint = { x: seg.points[0], y: seg.points[1] };
            // Register the segment using its precise start/end points
            registerSegment(lastPoint, currentPoint);
        }
        if (currentPoint) {
            lastPoint = currentPoint;
        }
    });
  },

  // Reset registries
  reset: function() {
    this.horizontalSegments.clear();
    this.verticalSegments.clear();
    // console.log("PathRegistry reset.");
  }
};

// --- Connection Path Memory ---
const CONNECTION_MEMORY = new Map<string, {
  path: string;
  lastUpdated: number;
}>();

// --- Constants for Path Calculation ---
const MIN_EXIT_PADDING = 10; // Minimal horizontal distance from node edge before turning vertically
const NODE_COLLISION_TOLERANCE = 2; // Tolerance for robust collision checks


// --- Main Component ---
export const NodeConnections: React.FC<NodeConnectionsProps> = ({
  transform,
  containerRef,
  isDragging,
  // traceTree, // Keep if used
  nodeRefs, // Now required
  traceGroups = [],
  onConnectionSegmentsUpdate,
  showIdentityConnections = true,
  showCreatedByConnections = true,
  showReturnNodesAttributionConnections = true,
  collectNodePositions, // Now required
}) => {
  const [renderConnections, setRenderConnections] = useState<Array<{
    id: string;
    start: Point;
    end: Point;
    type: ConnectionType;
    path: string;
    sourceNodeKey: string;
    targetNodeKey: string;
  }>>([]);

  // Add a hover state to track which connection is being hovered
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutIdRef = useRef<string>('');
  const nodeConnectionsRef = useRef<{ // Tracks connections per side for offset calculations
    [nodeKey: string]: {
      left: number, right: number, top: number, bottom: number,
      connections: { [side: string]: Array<{type: ConnectionType, id: string}> }
    }
  }>({});

  // --- Animation & Update Tracking Refs ---
  const updateTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number | null>(null);
  const [isAnyNodeAnimating, setIsAnyNodeAnimating] = useState(false);
  const [isBulkOperation, setIsBulkOperation] = useState(false);


  // --- Layout ID Generation ---
  const generateLayoutId = useMemo(() => {
    return () => {
      if (!nodeRefs.current || Object.keys(nodeRefs.current).length === 0) return '';
      const positions = Object.entries(nodeRefs.current)
        .filter(([_, element]) => element)
        .map(([key, element]) => {
          if (!element) return '';
          const rect = element.getBoundingClientRect();
          return `${key}:${Math.round(rect.left/20)}:${Math.round(rect.top/20)}`;
        })
        .sort()
        .join('|');
      return `${positions}-scale:${transform.scale.toFixed(2)}`;
    };
  }, [nodeRefs, transform.scale]);


  // --- Core Path Calculation Logic (Refined Version) ---
  const calculateEnhancedPath = useCallback((
    startPt: Point,
    endPt: Point,
    sourceNodeInfo: NodeInfo,
    targetNodeInfo: NodeInfo,
    connectionType: ConnectionType,
    isRightToLeft: boolean
  ): string => {

    // --- Collision Check for 3-Segment Path ---
    let use3SegmentPath = true;
    const midX = (startPt.x + endPt.x) / 2;
    const yMin = Math.min(startPt.y, endPt.y);
    const yMax = Math.max(startPt.y, endPt.y);

    // Check collision with Source Node Body (using SVG Rect)
    if (
      midX > sourceNodeInfo.svgRect.left + NODE_COLLISION_TOLERANCE &&
      midX < sourceNodeInfo.svgRect.right - NODE_COLLISION_TOLERANCE &&
      yMax > sourceNodeInfo.svgRect.top + NODE_COLLISION_TOLERANCE &&
      yMin < sourceNodeInfo.svgRect.bottom - NODE_COLLISION_TOLERANCE
    ) {
      use3SegmentPath = false;
    }

    // Check collision with Target Node Body (using SVG Rect)
    if (
      use3SegmentPath &&
      midX > targetNodeInfo.svgRect.left + NODE_COLLISION_TOLERANCE &&
      midX < targetNodeInfo.svgRect.right - NODE_COLLISION_TOLERANCE &&
      yMax > targetNodeInfo.svgRect.top + NODE_COLLISION_TOLERANCE &&
      yMin < targetNodeInfo.svgRect.bottom - NODE_COLLISION_TOLERANCE
    ) {
      use3SegmentPath = false;
    }

    // --- Generate Path String ---

    // Option 1: 3-Segment Path (H-V-H) - If no collision
    if (use3SegmentPath) {
      // Find a potentially less congested vertical position using the registry
      // Use SIMPLIFIED KEY based only on the target x-band
      const vSegmentKey = `v-band-${Math.round(midX / 20) * 20}`;
      const optimizedMidX = PATH_REGISTRY.getUniqueOffset(false, vSegmentKey, midX);

      // Path: M start -> L vertical turn-point -> L horizontal turn-point -> L end
      return `M ${startPt.x},${startPt.y} L ${optimizedMidX},${startPt.y} L ${optimizedMidX},${endPt.y} L ${endPt.x},${endPt.y}`;
    }
    // Option 2: 5-Segment Path (H-V-H-V-H) - If collision occurred
    else {
       const typeOffset = connectionType === ConnectionType.CREATED_BY ? 10 : 0;

       const startExitX = startPt.x + (isRightToLeft ? -MIN_EXIT_PADDING : MIN_EXIT_PADDING);
       const endEntryX = endPt.x - (isRightToLeft ? -MIN_EXIT_PADDING : MIN_EXIT_PADDING);

      // Key for the middle horizontal segment registry
      // Use SIMPLIFIED KEY based only on the target y-band
      const hSegmentKey = `h-band-${Math.round(((startPt.y + endPt.y) / 2) / 20) * 20}`;

      const baseY = (startPt.y + endPt.y) / 2 + (Math.abs(startPt.x - endPt.x) % 30) + typeOffset;
      const midY = PATH_REGISTRY.getUniqueOffset(true, hSegmentKey, baseY);

      // Path: M start -> L horizontal exit -> L vertical to midY -> L horizontal across -> L vertical to end Entry -> L end
      return `M ${startPt.x},${startPt.y} L ${startExitX},${startPt.y} L ${startExitX},${midY} L ${endEntryX},${midY} L ${endEntryX},${endPt.y} L ${endPt.x},${endPt.y}`;
    }
  }, []); // No external dependencies except constants and PATH_REGISTRY


  // --- Get Path (with Caching/Memory) ---
  const getEnhancedPath = useCallback((
    startPt: Point,
    endPt: Point,
    sourceNodeInfo: NodeInfo,
    targetNodeInfo: NodeInfo,
    connectionType: ConnectionType,
    connectionKey: string,
    layoutChanged: boolean,
    isRightToLeft: boolean
  ) => {
    const memorized = CONNECTION_MEMORY.get(connectionKey);
    const now = Date.now();

    if (memorized && !layoutChanged && now - memorized.lastUpdated < 3000) {
      // IMPORTANT: Re-register even cached paths if not dragging,
      // as other paths might need to avoid this one now.
      if (!isDragging) {
         PATH_REGISTRY.registerPath(memorized.path, true);
      }
      return memorized.path;
    }

    const path = calculateEnhancedPath(
        startPt, endPt, sourceNodeInfo, targetNodeInfo, connectionType, isRightToLeft
    );

    // Register path segments if layout is stable (not dragging)
    PATH_REGISTRY.registerPath(path, !isDragging);

    // Store in memory
    CONNECTION_MEMORY.set(connectionKey, { path, lastUpdated: now });

    return path;
  }, [isDragging, calculateEnhancedPath]);


  // --- Calculate Connection Points on Node Edge (DOM Coordinates) ---
  const calculateConnectionPoints = useCallback((sourceNode: { rect: DOMRect }, targetNode: { rect: DOMRect }) => {
    const sourceRect = sourceNode.rect;
    const targetRect = targetNode.rect;

    const sourceCenter = { x: sourceRect.left + sourceRect.width / 2, y: sourceRect.top + sourceRect.height / 2 };
    const targetCenter = { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 };

    const dx = targetCenter.x - sourceCenter.x;
    const isRightToLeft = dx < 0;

    let startX, startY, endX, endY, startSide, endSide;

    startY = sourceCenter.y;
    endY = targetCenter.y;

    if (isRightToLeft) {
      startX = sourceRect.left;
      startSide = 'left';
      endX = targetRect.right;
      endSide = 'right';
    } else {
      startX = sourceRect.right;
      startSide = 'right';
      endX = targetRect.left;
      endSide = 'left';
    }

    return {
      startX, startY, endX, endY,
      startSide, endSide,
      isRightToLeft,
    };
  }, []);


  // --- Main Update Function ---
  const updateConnectionPositions = useCallback(() => {
    if (!containerRef.current || !nodeRefs.current) {
        return;
    }

    nodeConnectionsRef.current = {};

    const currentLayoutId = generateLayoutId();
    const layoutChanged = currentLayoutId !== layoutIdRef.current && currentLayoutId !== '';

    // Reset registry ONLY if layout has significantly changed
    if (layoutChanged) {
      // console.log("Layout changed detected, resetting registry and memory.", currentLayoutId);
      layoutIdRef.current = currentLayoutId;
      PATH_REGISTRY.reset();
      CONNECTION_MEMORY.clear();
    } else {
        // If layout is stable, clear previous registrations before recalculating
        // to allow paths to move to better slots if available
        PATH_REGISTRY.reset(); // Reset on every update if not a major layout change
        // console.log("Layout stable, resetting registry for re-calculation.", currentLayoutId);
    }


    const positionedNodes = new Map<string, NodeInfo>();
    const containerRect = containerRef.current.getBoundingClientRect();

    const toSvgRect = (domRect: DOMRect): SvgRect => {
        const svgLeft = (domRect.left - containerRect.left - transform.x) / transform.scale;
        const svgTop = (domRect.top - containerRect.top - transform.y) / transform.scale;
        const svgWidth = domRect.width / transform.scale;
        const svgHeight = domRect.height / transform.scale;
        return {
            left: svgLeft, top: svgTop,
            right: svgLeft + svgWidth, bottom: svgTop + svgHeight,
            width: svgWidth, height: svgHeight,
        };
    };

     const toSvgCoords = (x: number, y: number): Point => {
         const relX = x - containerRect.left;
         const relY = y - containerRect.top;
         return {
             x: (relX - transform.x) / transform.scale,
             y: (relY - transform.y) / transform.scale
         };
     };

    // --- Pass 1: Collect Node Info & Initialize Counters ---
    Object.entries(nodeRefs.current).forEach(([nodeKey, element]) => {
        if (!element) return;
        const [groupId, nodeId] = nodeKey.split('|');
        if (!nodeId) return;

        const nodeData = traceGroups.find(g => g.id === groupId)?.data.find(n => n.key === nodeId);
        const domRect = element.getBoundingClientRect();

        positionedNodes.set(nodeKey, {
            id: nodeId, key: nodeKey, groupId: groupId,
            domRect: domRect, svgRect: toSvgRect(domRect),
            createdBy: nodeData?.created_by,
        });

        nodeConnectionsRef.current[nodeKey] = {
            left: 0, right: 0, top: 0, bottom: 0,
            connections: { left: [], right: [], top: [], bottom: [] }
        };
    });


    const allConnections = [];
    let connectionCounter = 0;

    // --- Process Connections (Two Passes per Type) ---

    // --- CREATED_BY Connections ---
    if (showCreatedByConnections) {
        const createdByPass1: any[] = [];

        // Pass 1.1: Find pairs, calculate sides, count connections per side
        for (const [sourceKey, sourceInfo] of positionedNodes.entries()) {
            if (!sourceInfo.createdBy) continue;
            for (const [targetKey, targetInfo] of positionedNodes.entries()) {
                if (targetInfo.id === sourceInfo.createdBy && targetInfo.groupId !== sourceInfo.groupId) {
                    const connDetails = calculateConnectionPoints({ rect: sourceInfo.domRect }, { rect: targetInfo.domRect });
                    nodeConnectionsRef.current[sourceKey][connDetails.startSide]++;
                    nodeConnectionsRef.current[targetKey][connDetails.endSide]++;
                    createdByPass1.push({ sourceInfo, targetInfo, connDetails, connId: `cb-${sourceKey}-${targetKey}-${connectionCounter++}` });
                    break;
                }
            }
        }

        // Pass 1.2: Calculate specific offset points & path
        createdByPass1.forEach(({ sourceInfo, targetInfo, connDetails, connId }) => {
            const sourceSide = connDetails.startSide;
            const targetSide = connDetails.endSide;
            const sourceTotal = nodeConnectionsRef.current[sourceInfo.key][sourceSide];
            const targetTotal = nodeConnectionsRef.current[targetInfo.key][targetSide];
            const sourceIndex = nodeConnectionsRef.current[sourceInfo.key].connections[sourceSide].length;
            const targetIndex = nodeConnectionsRef.current[targetInfo.key].connections[targetSide].length;

            let startX = connDetails.startX;
            let startY = connDetails.startY;
            let endX = connDetails.endX;
            let endY = connDetails.endY;
            const yPadding = 10;
            const nodeHeightSource = sourceInfo.domRect.height - 2 * yPadding;
            const nodeHeightTarget = targetInfo.domRect.height - 2 * yPadding;

             if (nodeHeightSource > 0 && sourceTotal > 0) {
                  const step = nodeHeightSource / (sourceTotal + 1);
                  const offset = (sourceIndex + 1) * step - (nodeHeightSource / 2);
                  startY = sourceInfo.domRect.top + yPadding + (nodeHeightSource / 2) + offset;
              }
             if (nodeHeightTarget > 0 && targetTotal > 0) {
                  const step = nodeHeightTarget / (targetTotal + 1);
                  const offset = (targetIndex + 1) * step - (nodeHeightTarget / 2);
                  endY = targetInfo.domRect.top + yPadding + (nodeHeightTarget / 2) + offset;
              }
             startY = Math.max(sourceInfo.domRect.top + yPadding, Math.min(sourceInfo.domRect.bottom - yPadding, startY));
             endY = Math.max(targetInfo.domRect.top + yPadding, Math.min(targetInfo.domRect.bottom - yPadding, endY));

            const svgStart = toSvgCoords(startX, startY);
            const svgEnd = toSvgCoords(endX, endY);
            const connKey = `${connId}:${Math.round(svgStart.x/10)},${Math.round(svgStart.y/10)}`;

            const path = getEnhancedPath(
                svgStart, svgEnd,
                sourceInfo, targetInfo,
                ConnectionType.CREATED_BY,
                connKey, layoutChanged, connDetails.isRightToLeft
            );

            allConnections.push({
                id: connId, start: svgStart, end: svgEnd, type: ConnectionType.CREATED_BY,
                sourceNodeKey: sourceInfo.key, targetNodeKey: targetInfo.key, path
            });

            nodeConnectionsRef.current[sourceInfo.key].connections[sourceSide].push({ type: ConnectionType.CREATED_BY, id: connId });
            nodeConnectionsRef.current[targetInfo.key].connections[targetSide].push({ type: ConnectionType.CREATED_BY, id: connId });
        });
    }

    // --- IDENTITY Connections ---
     if (showIdentityConnections) {
         const identityPass1: any[] = [];
         const nodesById = new Map<string, NodeInfo[]>();

         positionedNodes.forEach(info => {
             if (!nodesById.has(info.id)) nodesById.set(info.id, []);
             nodesById.get(info.id)!.push(info);
         });

         // Pass 2.1: Find pairs, calculate sides, count connections per side
         nodesById.forEach(nodes => {
             if (nodes.length > 1) {
                 nodes.sort((a, b) => a.groupId.localeCompare(b.groupId));
                 for (let i = 0; i < nodes.length - 1; i++) {
                     const sourceInfo = nodes[i];
                     const targetInfo = nodes[i + 1];
                     const connDetails = calculateConnectionPoints({ rect: sourceInfo.domRect }, { rect: targetInfo.domRect });
                     nodeConnectionsRef.current[sourceInfo.key][connDetails.startSide]++;
                     nodeConnectionsRef.current[targetInfo.key][connDetails.endSide]++;
                     identityPass1.push({ sourceInfo, targetInfo, connDetails, connId: `id-${sourceInfo.key}-${targetInfo.key}-${connectionCounter++}` });
                 }
             }
         });

        // Pass 2.2: Calculate specific offset points & path
         identityPass1.forEach(({ sourceInfo, targetInfo, connDetails, connId }) => {
            const sourceSide = connDetails.startSide;
            const targetSide = connDetails.endSide;
            const sourceTotal = nodeConnectionsRef.current[sourceInfo.key][sourceSide];
            const targetTotal = nodeConnectionsRef.current[targetInfo.key][targetSide];
            const sourceIndex = nodeConnectionsRef.current[sourceInfo.key].connections[sourceSide].length;
            const targetIndex = nodeConnectionsRef.current[targetInfo.key].connections[targetSide].length;

            let startX = connDetails.startX;
            let startY = connDetails.startY;
            let endX = connDetails.endX;
            let endY = connDetails.endY;
            const yPadding = 10;
            const nodeHeightSource = sourceInfo.domRect.height - 2 * yPadding;
            const nodeHeightTarget = targetInfo.domRect.height - 2 * yPadding;

             if (nodeHeightSource > 0 && sourceTotal > 0) {
                  const step = nodeHeightSource / (sourceTotal + 1);
                  const offset = (sourceIndex + 1) * step - (nodeHeightSource / 2);
                  startY = sourceInfo.domRect.top + yPadding + (nodeHeightSource / 2) + offset;
              }
             if (nodeHeightTarget > 0 && targetTotal > 0) {
                  const step = nodeHeightTarget / (targetTotal + 1); // Corrected variable
                  const offset = (targetIndex + 1) * step - (nodeHeightTarget / 2);
                  endY = targetInfo.domRect.top + yPadding + (nodeHeightTarget / 2) + offset;
              }
             startY = Math.max(sourceInfo.domRect.top + yPadding, Math.min(sourceInfo.domRect.bottom - yPadding, startY));
             endY = Math.max(targetInfo.domRect.top + yPadding, Math.min(targetInfo.domRect.bottom - yPadding, endY));

             const svgStart = toSvgCoords(startX, startY);
             const svgEnd = toSvgCoords(endX, endY);
             const connKey = `${connId}:${Math.round(svgStart.x/10)},${Math.round(svgStart.y/10)}`;

             const path = getEnhancedPath(
                 svgStart, svgEnd,
                 sourceInfo, targetInfo,
                 ConnectionType.IDENTITY,
                 connKey, layoutChanged, connDetails.isRightToLeft
             );

             allConnections.push({
                 id: connId, start: svgStart, end: svgEnd, type: ConnectionType.IDENTITY,
                 sourceNodeKey: sourceInfo.key, targetNodeKey: targetInfo.key, path
             });

             nodeConnectionsRef.current[sourceInfo.key].connections[sourceSide].push({ type: ConnectionType.IDENTITY, id: connId });
             nodeConnectionsRef.current[targetInfo.key].connections[targetSide].push({ type: ConnectionType.IDENTITY, id: connId });
         });
     }

    // --- RETURN NODES ATTRIBUTION Connections ---
    if (showReturnNodesAttributionConnections) {
        console.log('[NodeConnections] Processing return nodes attribution connections...');
        const returnAttrPass1: any[] = [];

        // Pass 1.1: Find return nodes attribution pairs
        for (const [sourceKey, sourceInfo] of positionedNodes.entries()) {
            // Find node data to check for return_nodes_attribution
            const nodeData = traceGroups.find(g => g.id === sourceInfo.groupId)?.data.find(n => n.key === sourceInfo.id);
            
            if (nodeData) {
                // Check for return_nodes_attribution in response_messages (primary location)
                let attributionData: any[] = [];
                
                if (nodeData.response_messages && Array.isArray(nodeData.response_messages)) {
                    nodeData.response_messages.forEach((msg: any) => {
                        if (msg.role === 'tool' && msg.content) {
                            try {
                                const toolContent = JSON.parse(msg.content);
                                if (toolContent.return_nodes_attribution && Array.isArray(toolContent.return_nodes_attribution)) {
                                    attributionData.push(...toolContent.return_nodes_attribution);
                                }
                            } catch (e) {
                                // Not JSON, skip
                            }
                        }
                    });
                }
                
                // Also check legacy params location for backward compatibility
                if (nodeData.params && nodeData.params.return_nodes_attribution && Array.isArray(nodeData.params.return_nodes_attribution)) {
                    attributionData.push(...nodeData.params.return_nodes_attribution);
                }
                
                if (attributionData.length > 0) {
                    console.log('[NodeConnections] Found node with return_nodes_attribution:', {
                        sourceKey,
                        attributions: attributionData
                    });
                    
                    attributionData.forEach((attribution: any) => {
                        if (attribution.node_key) {
                            console.log('[NodeConnections] Processing attribution:', attribution);
                            
                            // Find the content node that was returned (not the creator LLM operation)
                            for (const [targetKey, targetInfo] of positionedNodes.entries()) {
                                if (targetInfo.id === attribution.node_key && targetInfo.groupId !== sourceInfo.groupId) {
                                    console.log('[NodeConnections] Found content node:', targetKey, 'for node_key:', attribution.node_key);
                                    
                                    // Create connection from source node (that contains the attribution) to the content node
                                    const connDetails = calculateConnectionPoints({ rect: sourceInfo.domRect }, { rect: targetInfo.domRect });
                                    
                                    if (connDetails) {
                                        const connId = `return-attr-${sourceKey}-${targetKey}`;
                                        returnAttrPass1.push({
                                            id: connId,
                                            source: sourceInfo,
                                            target: targetInfo,
                                            ...connDetails
                                        });
                                        console.log('[NodeConnections] Created return attribution connection:', connId);
                                    }
                                }
                            }
                            
                            // If content node not found (external reference), log it
                            const contentNodeExists = Array.from(positionedNodes.values()).some(info => info.id === attribution.node_key);
                            if (!contentNodeExists) {
                                console.log('[NodeConnections] ⚠️  Referenced content node not found in current trace:', {
                                    sourceNode: sourceKey,
                                    missingContentNode: attribution.node_key,
                                    createdByFile: attribution.created_by_file
                                });
                                console.log('[NodeConnections] This is expected for cross-file references.');
                            }
                        }
                    });
                }
            }
        }
        console.log('[NodeConnections] Return attribution pairs found:', returnAttrPass1.length);

        // Pass 1.2: Calculate specific offset points & path for return attribution
        returnAttrPass1.forEach(({ id, source, target, startX, startY, endX, endY, startSide, endSide, isRightToLeft }) => {
            const sourceSide = startSide;
            const targetSide = endSide;
            const sourceTotal = nodeConnectionsRef.current[source.key][sourceSide];
            const targetTotal = nodeConnectionsRef.current[target.key][targetSide];
            const sourceIndex = nodeConnectionsRef.current[source.key].connections[sourceSide].length;
            const targetIndex = nodeConnectionsRef.current[target.key].connections[targetSide].length;

            const yPadding = 10;
            const nodeHeightSource = source.domRect.height - 2 * yPadding;
            const nodeHeightTarget = target.domRect.height - 2 * yPadding;

            if (nodeHeightSource > 0 && sourceTotal > 0) {
                const step = nodeHeightSource / (sourceTotal + 1);
                const offset = (sourceIndex + 1) * step - (nodeHeightSource / 2);
                startY = source.domRect.top + yPadding + (nodeHeightSource / 2) + offset;
            }
            if (nodeHeightTarget > 0 && targetTotal > 0) {
                const step = nodeHeightTarget / (targetTotal + 1);
                const offset = (targetIndex + 1) * step - (nodeHeightTarget / 2);
                endY = target.domRect.top + yPadding + (nodeHeightTarget / 2) + offset;
            }
            startY = Math.max(source.domRect.top + yPadding, Math.min(source.domRect.bottom - yPadding, startY));
            endY = Math.max(target.domRect.top + yPadding, Math.min(target.domRect.bottom - yPadding, endY));

            const svgStart = toSvgCoords(startX, startY);
            const svgEnd = toSvgCoords(endX, endY);
            const connKey = `${id}:${Math.round(svgStart.x/10)},${Math.round(svgStart.y/10)}`;

            const path = getEnhancedPath(
                svgStart, svgEnd,
                source, target,
                ConnectionType.RETURN_NODES_ATTRIBUTION,
                connKey, layoutChanged, isRightToLeft
            );

            allConnections.push({
                id: id, start: svgStart, end: svgEnd, type: ConnectionType.RETURN_NODES_ATTRIBUTION,
                sourceNodeKey: source.key, targetNodeKey: target.key, path
            });

            nodeConnectionsRef.current[source.key].connections[sourceSide].push({ type: ConnectionType.RETURN_NODES_ATTRIBUTION, id: id });
            nodeConnectionsRef.current[target.key].connections[targetSide].push({ type: ConnectionType.RETURN_NODES_ATTRIBUTION, id: id });
        });
    }

    setRenderConnections(allConnections);

    if (onConnectionSegmentsUpdate && allConnections.length > 0) {
      const segmentData = allConnections.map(conn => ({
        id: conn.id, type: conn.type, path: conn.path,
        segments: parsePathToSegments(conn.path),
        sourceKey: conn.sourceNodeKey, targetKey: conn.targetNodeKey
      }));
      onConnectionSegmentsUpdate(segmentData);
    }
  }, [
      containerRef, nodeRefs, traceGroups, transform,
      showCreatedByConnections, showIdentityConnections, showReturnNodesAttributionConnections,
      isDragging, onConnectionSegmentsUpdate,
      generateLayoutId, calculateConnectionPoints, getEnhancedPath,
      // No collectNodePositions needed here
  ]);


  // --- Continuous Update Logic for Animations ---
  const startContinuousUpdates = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsAnyNodeAnimating(true);

    const updateLoop = () => {
      updateConnectionPositions();
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };
    animationFrameRef.current = requestAnimationFrame(updateLoop);

    setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        updateConnectionPositions(); // Final update after animation
        setIsAnyNodeAnimating(false);
      }
    }, 250);
  }, [updateConnectionPositions]);


  // --- Effect for Initial Load & Manual Updates ---
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
        collectNodePositions();
        updateConnectionPositions();
    }, 50);

    const handleForceUpdate = () => {
        collectNodePositions();
        updateConnectionPositions();
    };
    window.addEventListener('force-connections-update', handleForceUpdate);

    return () => {
        clearTimeout(initialTimeout);
        window.removeEventListener('force-connections-update', handleForceUpdate);
        if (updateTimeoutRef.current) cancelAnimationFrame(updateTimeoutRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [collectNodePositions, updateConnectionPositions]);


  // --- Effect for Transform, Filter Changes, Dragging End ---
   useEffect(() => {
       if (updateTimeoutRef.current) cancelAnimationFrame(updateTimeoutRef.current);

       updateTimeoutRef.current = requestAnimationFrame(() => {
           // No need to collect positions unless dragging just ended,
           // but update is needed for scale changes or filter changes.
           // Registry is reset within updateConnectionPositions if needed.
           updateConnectionPositions();
       });

       return () => {
           if (updateTimeoutRef.current) cancelAnimationFrame(updateTimeoutRef.current);
       };
   }, [transform, showIdentityConnections, showCreatedByConnections, showReturnNodesAttributionConnections, isDragging, updateConnectionPositions]);


  // --- Effect for Handling Node Transitions (Expand/Collapse) ---
  useEffect(() => {
    const handleNodeTransition = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.action === 'expand' || detail?.action === 'collapse') {
            startContinuousUpdates();
        }
    };
    window.addEventListener('node-transition', handleNodeTransition);

    const container = containerRef.current;
    const handleTransitionEnd = (e: TransitionEvent) => {
        if ((e.target as HTMLElement)?.hasAttribute('data-trace-node-id') && (e.propertyName === 'height' || e.propertyName === 'max-height')) {
            setTimeout(() => {
                collectNodePositions(); // Collect potentially changed positions
                updateConnectionPositions(); // Final update after transition settles
            }, 10);
        }
    };
    container?.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      window.removeEventListener('node-transition', handleNodeTransition);
      container?.removeEventListener('transitionend', handleTransitionEnd);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [containerRef, startContinuousUpdates, collectNodePositions, updateConnectionPositions]);


  // --- Effect for Bulk Operations ---
   useEffect(() => {
       const handleBulkOperation = (e: Event) => {
           const detail = (e as CustomEvent).detail;
           if (detail?.action === 'bulk-expand' || detail?.action === 'bulk-collapse') {
               setIsBulkOperation(true);
               startContinuousUpdates();
               setTimeout(() => setIsBulkOperation(false), 400);
           }
       };
       window.addEventListener('bulk-operation', handleBulkOperation);
       return () => {
           window.removeEventListener('bulk-operation', handleBulkOperation);
           if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
       };
   }, [startContinuousUpdates]);


  // --- Connection Styling ---
  const getConnectionStyle = (type: ConnectionType, isHovered: boolean) => {
    // Base width now takes zoom level into account to maintain consistent visual thickness
    const baseWidth = Math.max(1.5, 2 / transform.scale);
    const hoverWidth = baseWidth * 1.8; // Less extreme difference for better visual consistency
    const hitboxWidth = Math.max(10, 12 / transform.scale); // Much wider transparent hitbox for easier hovering
    const opacity = isHovered ? 1 : 0.6;
    
    switch (type) {
      case ConnectionType.CREATED_BY: 
        return { 
          stroke: `rgba(34, 197, 94, ${opacity})`, 
          strokeWidth: isHovered ? hoverWidth : baseWidth, 
          strokeDasharray: isHovered ? "8, 4" : "none",  // Only apply dash pattern on hover
          circleFill: isHovered ? "#22C55E" : "rgba(34, 197, 94, 0.8)",
          circleRadius: isHovered ? 5 : 3,
          hitboxWidth: hitboxWidth
        };
      case ConnectionType.IDENTITY: 
        return { 
          stroke: `rgba(59, 130, 246, ${opacity})`, 
          strokeWidth: isHovered ? hoverWidth : baseWidth, 
          strokeDasharray: isHovered ? "8, 4" : "none",  // Only apply dash pattern on hover
          circleFill: isHovered ? "#3B82F6" : "rgba(59, 130, 246, 0.8)",
          circleRadius: isHovered ? 5 : 3,
          hitboxWidth: hitboxWidth
        };
      case ConnectionType.RETURN_NODES_ATTRIBUTION:
        return { 
          stroke: `rgba(249, 115, 22, ${opacity})`, // Orange color for return nodes attribution
          strokeWidth: isHovered ? hoverWidth : baseWidth, 
          strokeDasharray: isHovered ? "6, 3" : "none",  // Different dash pattern when hovered
          circleFill: isHovered ? "#F97316" : "rgba(249, 115, 22, 0.8)",
          circleRadius: isHovered ? 5 : 3,
          hitboxWidth: hitboxWidth
        };
      default: 
        return { 
          stroke: `rgba(150, 150, 150, ${opacity})`, 
          strokeWidth: isHovered ? hoverWidth - 0.5 : baseWidth - 0.5, 
          strokeDasharray: "3, 3", 
          circleFill: isHovered ? "#999" : "rgba(150, 150, 150, 0.8)",
          circleRadius: isHovered ? 5 : 3,
          hitboxWidth: hitboxWidth
        };
    }
  };

  const getTransitionStyle = (isAnimating: boolean) => {
      const duration = isAnimating ? '100ms' : '250ms';
      return {
          path: isAnimating ? `d ${duration} linear` : 'd 250ms ease-out, stroke-width 250ms ease-out, stroke 250ms ease-out',
          endpoint: isAnimating ? `cx ${duration} linear, cy ${duration} linear` : 'cx 250ms ease-out, cy 250ms ease-out, r 250ms ease-out',
      };
  };

  // --- Render ---
  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0
      }}
    >
      <g>
        {renderConnections.map(({ id, start, end, type, path }) => {
          const isHovered = hoveredConnectionId === id;
          const style = getConnectionStyle(type, isHovered);
          const isAnimating = isAnyNodeAnimating || isBulkOperation;
          const transition = getTransitionStyle(isAnimating);

          return (
            <g key={id} className={`connection-group type-${type} ${isHovered ? 'hovered' : ''}`}>
              {/* Invisible hitbox path - wider and handles mouse events */}
              <path
                d={path}
                stroke="transparent"
                strokeWidth={style.hitboxWidth}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="stroke"
                onMouseEnter={() => setHoveredConnectionId(id)}
                onMouseLeave={() => setHoveredConnectionId(null)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Visible path - thinner and purely visual */}
              <path
                d={path}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={style.strokeDasharray}
                className={`connection-path ${isHovered ? 'connection-path-hover' : ''}`}
                style={{ 
                  transition: transition.path,
                  strokeDashoffset: isHovered ? "0" : "none", // No animation when not hovered
                  pointerEvents: "none" // The visible line doesn't handle mouse events
                }}
              />
              
              {/* Connection endpoints - adjusted for better visibility */}
              <circle
                cx={start.x} cy={start.y} 
                r={isHovered ? style.circleRadius : Math.max(style.circleRadius, 3 / transform.scale)}
                fill={style.circleFill}
                className="connection-endpoint start"
                style={{ 
                  transition: transition.endpoint,
                  pointerEvents: "none"
                }}
              />
              <circle
                cx={end.x} cy={end.y} 
                r={isHovered ? style.circleRadius : Math.max(style.circleRadius, 3 / transform.scale)}
                fill={style.circleFill}
                className="connection-endpoint end"
                style={{ 
                  transition: transition.endpoint,
                  pointerEvents: "none"
                }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};