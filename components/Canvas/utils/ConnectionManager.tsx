import { TraceNodeData, TraceTreeNode, ProcessedTraceGroup } from '../types';

export enum ConnectionType {
  IDENTITY = 'identity',     // Blue lines - same nodes in different groups
  HIERARCHICAL = 'hierarchical',  // Purple lines - parent-child group relationships
  CREATED_BY = 'created_by'  // Green lines - created_by relationships
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceGroupId: string;
  targetGroupId: string;
  type: ConnectionType;
}

export interface PositionedNode {
  id: string;
  key: string;
  groupId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy?: string | null;
}

export class ConnectionManager {
  private connections: Connection[] = [];
  
  // Calculate connections based purely on the trace data
  public calculateConnections(traceGroups: any[]): Connection[] {
    this.connections = [];
    
    // Calculate identity connections (same node across different groups)
    this.calculateIdentityConnections(traceGroups);
    
    // Calculate created_by connections
    this.calculateCreatedByConnections(traceGroups);
    
    return this.connections;
  }
  
  // Get renderable connections with positions
  public getRenderableConnections(
    nodePositions: Map<string, PositionedNode>,
    transform: { x: number, y: number, scale: number },
    containerRect: DOMRect
  ) {
    const results = [];
    
    for (const connection of this.connections) {
      const sourceKey = `${connection.sourceGroupId}|${connection.sourceId}`;
      const targetKey = `${connection.targetGroupId}|${connection.targetId}`;
      
      const sourceNode = nodePositions.get(sourceKey);
      const targetNode = nodePositions.get(targetKey);
      
      if (!sourceNode || !targetNode) continue;
      
      // Calculate optimal connection points
      const { startX, startY, endX, endY } = this.calculateConnectionPoints(sourceNode, targetNode);
      
      // Transform coordinates
      const start = this.transformToCanvasCoordinates(startX, startY, transform, containerRect);
      const end = this.transformToCanvasCoordinates(endX, endY, transform, containerRect);
      
      results.push({
        id: connection.id,
        type: connection.type,
        start,
        end
      });
    }
    
    return results;
  }
  
  private calculateIdentityConnections(traceGroups: any[]): void {
    // Group nodes by their key across different groups
    const nodesByKey: Map<string, Array<{id: string, groupId: string}>> = new Map();
    
    traceGroups.forEach(group => {
      group.data.forEach((node: TraceNodeData) => {
        const existing = nodesByKey.get(node.key) || [];
        nodesByKey.set(node.key, [...existing, { id: node.key, groupId: group.id }]);
      });
    });
    
    // Create connections for nodes that appear in multiple groups
    nodesByKey.forEach((nodes, nodeKey) => {
      if (nodes.length > 1) {
        // Sort by group level for proper order
        nodes.sort((a, b) => this.getGroupLevel(a.groupId) - this.getGroupLevel(b.groupId));
        
        for (let i = 0; i < nodes.length - 1; i++) {
          this.connections.push({
            id: `identity-${nodeKey}-${i}`,
            sourceId: nodeKey,
            targetId: nodeKey,
            sourceGroupId: nodes[i].groupId,
            targetGroupId: nodes[i + 1].groupId,
            type: ConnectionType.IDENTITY
          });
        }
      }
    });
  }
  
  private calculateCreatedByConnections(traceGroups: any[]): void {
    // First, index all nodes by their key
    const allNodesMap: Map<string, {node: TraceNodeData, groupId: string}> = new Map();
    
    traceGroups.forEach(group => {
      group.data.forEach((node: TraceNodeData) => {
        allNodesMap.set(node.key, { node, groupId: group.id });
      });
    });
    
    // Then process created_by relationships
    traceGroups.forEach(group => {
      group.data.forEach((node: TraceNodeData) => {
        if (node.created_by) {
          // Find creator node
          const creator = allNodesMap.get(node.created_by);
          
          if (creator && creator.groupId !== group.id) {
            this.connections.push({
              id: `created-by-${node.key}-${node.created_by}`,
              sourceId: node.key,
              targetId: node.created_by,
              sourceGroupId: group.id,
              targetGroupId: creator.groupId,
              type: ConnectionType.CREATED_BY
            });
          }
        }
      });
    });
  }
  
  private getGroupLevel(groupId: string): number {
    return (groupId.match(/-/g) || []).length + 1;
  }
  
  private calculateConnectionPoints(
    source: PositionedNode, 
    target: PositionedNode
  ): { startX: number, startY: number, endX: number, endY: number } {
    // Calculate the center points
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };
    
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };
    
    // Determine the best connection points (similar to previous implementation)
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    
    let startX, startY, endX, endY;
    
    // Horizontal connection (connecting from sides)
    if (Math.abs(dx) > Math.abs(dy)) {
      startY = sourceCenter.y;
      endY = targetCenter.y;
      
      if (dx > 0) {
        // Target is to the right
        startX = source.x + source.width;
        endX = target.x;
      } else {
        // Target is to the left
        startX = source.x;
        endX = target.x + target.width;
      }
    } 
    // Vertical connection (connecting from top/bottom)
    else {
      startX = sourceCenter.x;
      endX = targetCenter.x;
      
      if (dy > 0) {
        // Target is below
        startY = source.y + source.height;
        endY = target.y;
      } else {
        // Target is above
        startY = source.y;
        endY = target.y + target.height;
      }
    }
    
    return { startX, startY, endX, endY };
  }
  
  private transformToCanvasCoordinates(
    x: number, 
    y: number, 
    transform: { x: number, y: number, scale: number },
    containerRect: DOMRect
  ): { x: number, y: number } {
    // Convert from screen coordinates to canvas coordinates
    return {
      x: (x - containerRect.left - transform.x) / transform.scale,
      y: (y - containerRect.top - transform.y) / transform.scale
    };
  }
}

export const connectionManager = new ConnectionManager();