import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { NodePosition } from '../types';

interface DebugPanelProps {
  nodePositions: Map<string, NodePosition[]>;
  isOpen: boolean;
  onToggle: () => void;
  transform: { x: number; y: number; scale: number };
  connectionSegments: any[];
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  isOpen, 
  onToggle,
  nodePositions,
  transform,
  connectionSegments = []
}) => {
  // Convert node positions to a serializable format
  const serializedNodePositions = Array.from(nodePositions.entries()).map(([key, positions]) => ({
    key,
    positions: positions.map(pos => ({
      groupId: pos.groupId,
      element: {
        tagName: pos.element.tagName,
        id: pos.element.id,
        className: pos.element.className,
        rect: pos.element.getBoundingClientRect().toJSON()
      }
    }))
  }));

  return (
    <div 
      className={`fixed right-0 top-0 h-screen bg-gray-800 border-l border-gray-700 transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'w-96' : 'w-8'}`}
    >
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-800 text-gray-300 
          p-2 rounded-l-md border border-r-0 border-gray-700 hover:bg-gray-700 transition-colors"
        title={isOpen ? "Close debug panel" : "Open debug panel"}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Transform</h3>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                {JSON.stringify(transform, null, 2)}
              </pre>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Node Positions</h3>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                {JSON.stringify(serializedNodePositions, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Connection Segments</h3>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                {connectionSegments.map((conn, i) => (
                  `${conn.sourceKey} → ${conn.targetKey}\n` +
                  conn.segments.map((seg: { command: string; points: number[] }) => 
                    `${seg.command} ${seg.points.join(', ')}`
                  ).join('\n') + '\n\n'
                )).join('')}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};