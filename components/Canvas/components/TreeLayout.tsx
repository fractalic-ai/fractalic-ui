import React, { useEffect, useState, useCallback } from 'react';
import { ProcessedTraceGroup } from '../types';

interface TreeLayoutProps {
  processedGroups: ProcessedTraceGroup[];
  onLayout?: (layoutMap: Map<string, { x: number; y: number; width: number; height: number }>) => void;
  collapsedNodes?: Set<string>;
  expandedDetails?: Set<string>;
  forceUpdate?: number; // Add a counter to force layout updates
}

interface TreeNode {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  children: TreeNode[];
  hasContent: boolean;
  level: number;
}

// Layout constants
const HORIZONTAL_GAP = 200;  // Horizontal gap between columns/levels
const VERTICAL_GAP = 200;     // Vertical gap between sibling groups (reduced)
const NODE_WIDTH = 500;      // Default width for a group
const MIN_HEIGHT = 150;      // Minimum height for an empty group
const PADDING = 50;          // Padding from edges

export const TreeLayout: React.FC<TreeLayoutProps> = ({ 
  processedGroups, 
  onLayout, 
  collapsedNodes, 
  expandedDetails,
  forceUpdate = 0 
}) => {
  const [layoutMap, setLayoutMap] = useState(
    new Map<string, { x: number; y: number; width: number; height: number }>()
  );

  // Convert this to useCallback so it can be called from outside as needed
  const calculateLayout = useCallback(() => {
    if (!processedGroups.length) return;

    // First phase: Render groups with initial positions so they can be measured
    const initialMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    
    let y = PADDING;
    processedGroups.forEach(group => {
      initialMap.set(group.id, {
        x: PADDING,
        y,
        width: NODE_WIDTH,
        height: MIN_HEIGHT
      });
      y += MIN_HEIGHT + VERTICAL_GAP;
    });
    
    setLayoutMap(initialMap);
    
    // Second phase: After DOM is updated, measure actual sizes and calculate layout
    setTimeout(() => {
      // Build tree nodes with actual measured sizes
      const buildTreeNodes = (group: ProcessedTraceGroup, level = 0): TreeNode => {
        const groupElement = document.querySelector(`[data-trace-id="${group.id}"]`) as HTMLElement;
        let height = MIN_HEIGHT;
        let width = NODE_WIDTH;
        
        if (groupElement) {
          const style = window.getComputedStyle(groupElement);
          width = parseInt(style.width) || NODE_WIDTH;
          height = parseInt(style.height) || MIN_HEIGHT;
          width = Math.max(width, NODE_WIDTH);
          height = Math.max(height, MIN_HEIGHT);
        }
        
        return {
          id: group.id,
          width,
          height,
          x: 0, // Will be set during layout
          y: 0, // Will be set during layout
          level,
          hasContent: group.hasContent,
          children: group.children.map(child => buildTreeNodes(child, level + 1)),
        };
      };
      
      const virtualRoot: TreeNode = {
        id: 'root',
        width: 0,
        height: 0,
        x: 3000, // Initial x position for right-to-left layout
        y: PADDING,
        level: -1,
        hasContent: false,
        children: processedGroups.map(group => buildTreeNodes(group))
      };
      
      // Level-based layout approach
      const layoutByLevel = (root: TreeNode): void => {
        // Step 1: Group nodes by level
        const nodesByLevel: Map<number, TreeNode[]> = new Map();
        
        const collectNodesByLevel = (node: TreeNode) => {
          const level = node.level;
          const nodesAtLevel = nodesByLevel.get(level) || [];
          nodesAtLevel.push(node);
          nodesByLevel.set(level, nodesAtLevel);
          
          node.children.forEach(collectNodesByLevel);
        };
        
        root.children.forEach(collectNodesByLevel);
        
        // Step 2: Determine x-position for each level
        const levelXPositions: Map<number, number> = new Map();
        const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
        
        // Start from furthest level (right-to-left layout)
        for (let level = maxLevel; level >= 0; level--) {
          const prevLevelPos = levelXPositions.get(level + 1);
          let levelX;
          
          if (prevLevelPos !== undefined) {
            // Position this level to the right of the previous level
            const widthOfThisLevel = Math.max(
              ...((nodesByLevel.get(level) || []).map(node => node.width))
            );
            levelX = prevLevelPos + HORIZONTAL_GAP + widthOfThisLevel;
          } else {
            // This is the rightmost level
            levelX = PADDING;
          }
          
          levelXPositions.set(level, levelX);
        }
        
        // Step 3: Position nodes using level-based coordinates
        let topY = PADDING;
        
        // Position nodes level by level
        Array.from(nodesByLevel.keys()).sort().forEach(level => {
          const nodes = nodesByLevel.get(level) || [];
          const levelX = levelXPositions.get(level) || PADDING;
          
          // Sort nodes to maintain hierarchical relationships
          nodes.sort((a, b) => {
            // Try to find parent-child relationships
            for (let i = 0; i < level; i++) {
              const potentialParents = nodesByLevel.get(i) || [];
              for (const parent of potentialParents) {
                const aIsChild = parent.children.includes(a);
                const bIsChild = parent.children.includes(b);
                
                if (aIsChild && !bIsChild) return -1;
                if (!aIsChild && bIsChild) return 1;
                if (aIsChild && bIsChild) {
                  // Both are children of the same parent, use index in parent's children
                  return parent.children.indexOf(a) - parent.children.indexOf(b);
                }
              }
            }
            return 0;
          });
          
          // Position each node in this level
          let currentY = topY;
          nodes.forEach(node => {
            node.x = levelX;
            node.y = currentY;
            currentY += node.height + VERTICAL_GAP;
          });
        });
      };
      
      // Apply the level-based layout
      layoutByLevel(virtualRoot);
      
      // Normalize coordinates to ensure we have padding from edges
      const normalizeCoordinates = (root: TreeNode): void => {
        let minX = Infinity, minY = Infinity;
        
        const findMinCoords = (node: TreeNode) => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          node.children.forEach(findMinCoords);
        };
        
        findMinCoords(root);
        
        const shiftX = PADDING - minX;
        const shiftY = PADDING - minY;
        
        const shiftSubtree = (node: TreeNode, dx: number, dy: number) => {
          node.x += dx;
          node.y += dy;
          node.children.forEach(child => shiftSubtree(child, dx, dy));
        };
        
        shiftSubtree(root, shiftX, shiftY);
      };
      
      normalizeCoordinates(virtualRoot);
      
      // Convert to layout map
      const applyLayout = (nodes: TreeNode[]): Map<string, { x: number; y: number; width: number; height: number }> => {
        const map = new Map<string, { x: number; y: number; width: number; height: number }>();
        
        const processNode = (node: TreeNode) => {
          map.set(node.id, {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          });
          
          node.children.forEach(processNode);
        };
        
        nodes.forEach(processNode);
        return map;
      };
      
      const finalMap = applyLayout(virtualRoot.children);
      setLayoutMap(finalMap);
      
      if (onLayout) {
        onLayout(finalMap);
      }
    }, 200);
  }, [processedGroups, onLayout, collapsedNodes, expandedDetails]);

  // Run layout calculation when dependencies change, including collapse state
  useEffect(() => {
    calculateLayout();
  }, [calculateLayout, forceUpdate]);

  // Expose the calculateLayout method for external use through a ref
  useEffect(() => {
    // Register a global event listener for layout recalculation
    const handleForceLayoutUpdate = () => {
      calculateLayout();
    };

    window.addEventListener('force-layout-update', handleForceLayoutUpdate);
    
    return () => {
      window.removeEventListener('force-layout-update', handleForceLayoutUpdate);
    };
  }, [calculateLayout]);

  return null;
};