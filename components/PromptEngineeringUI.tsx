import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import DraggableList from './DraggableList';
import PromptNode from './PromptNode';
import { exportToMarkdown, importFromMarkdown } from '../utils/fileOperations';
import type { Node, DefaultNode, OperationNode } from '@/types/node';

interface PromptEngineeringUIProps {
  value: string;
  onChange: (value: string) => void;
  wordWrap: boolean;
  lineNumbers: boolean;
  onSettingsChange: {
    wordWrap: (checked: boolean) => void;
    lineNumbers: (checked: boolean) => void;
  };
}

export default function PromptEngineeringUI({
  value,
  onChange,
  wordWrap,
  lineNumbers,
  onSettingsChange,
}: PromptEngineeringUIProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const nextNodeIdRef = useRef(3);
  const initialized = useRef(false);
  const lastValueRef = useRef(value);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Add a type guard
  const isOperationNode = (node: any): node is OperationNode => {
    return node.type === 'operation';
  };

  // Modify the map function to handle both node types correctly
  const mapNode = (node: any): Node => {
    const baseNode = {
      ...node,
      wordWrap,
      showLineNumbers: lineNumbers
    };

    if (isOperationNode(node)) {
      return {
        ...baseNode,
        type: 'operation' as const,
        selectedOperation: node.selectedOperation || '@import',
        operationValues: node.operationValues || {}
      };
    }

    return {
      ...baseNode,
      type: 'default' as const
    };
  };

  // Initial load
  useEffect(() => {
    if (!initialized.current) {
      try {
        const parsedNodes = importFromMarkdown(value);
        const newNodes = parsedNodes.map(node => mapNode(node));
        setNodes(newNodes);
        lastValueRef.current = value;
        initialized.current = true;
      } catch (error) {
        console.error("Failed to parse markdown:", error);
      }
    }
  }, []); // Run only once on mount

  // Handle external value changes
  useEffect(() => {
    if (initialized.current && value !== lastValueRef.current) {
      try {
        const parsedNodes = importFromMarkdown(value);
        const newNodes = parsedNodes.map(node => mapNode(node));
        setNodes(newNodes);
        lastValueRef.current = value;
      } catch (error) {
        console.error("Failed to parse markdown:", error);
      }
    }
  }, [value]); // Only depend on value changes

  // Debounced node updates
  useEffect(() => {
    if (initialized.current) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        const updatedContent = exportToMarkdown(nodes);
        if (updatedContent !== lastValueRef.current) {
          onChange(updatedContent);
          lastValueRef.current = updatedContent;
        }
      }, 300);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [nodes, onChange]);

  const updateNode = useCallback((nodeId: number, updates: Partial<Node>) => {
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === nodeId) {
        if (node.type === 'default') {
          return { ...node, ...updates } as DefaultNode;
        } else if (node.type === 'operation') {
          return {
            ...node,
            ...updates,
            operationValues: {
              ...node.operationValues,
              ...(updates as OperationNode).operationValues
            }
          } as OperationNode;
        }
      }
      return node;
    }));
  }, []);

  const addNode = useCallback((type: 'default' | 'operation', afterId?: number) => {
    setNodes(prevNodes => {
      const newNode: Node = type === 'default'
        ? {
            id: nextNodeIdRef.current,
            title: `# New node ${String(prevNodes.length + 1).padStart(2, '0')}`,
            type: 'default',
            promptText: '',
            wordWrap,
            showLineNumbers: lineNumbers
          }
        : {
            id: nextNodeIdRef.current,
            title: 'Operation',
            type: 'operation',
            promptText: '',
            selectedOperation: '@import',
            operationValues: {},
            wordWrap,
            showLineNumbers: lineNumbers
          };

      const index = afterId ? prevNodes.findIndex(n => n.id === afterId) : prevNodes.length - 1;
      const newNodes = [...prevNodes];
      newNodes.splice(index + 1, 0, newNode);
      nextNodeIdRef.current += 1;
      return newNodes;
    });
  }, [wordWrap, lineNumbers]);

  const handleNodeTextChange = useCallback((nodeId: number, text: string) => {
    setNodes(prevNodes =>
      prevNodes.map(node => node.id === nodeId ? { ...node, promptText: text } : node)
    );
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className={`flex-1 overflow-auto p-4 pb-16 ${nodes.length === 0 ? 'flex justify-center items-center' : 'block'}`}>
        {nodes.length === 0 ? (
          <div className="space-x-4">
            <Button size="lg" onClick={() => addNode('default')}>
              + Node
            </Button>
            <Button size="lg" onClick={() => addNode('operation')}>
              + Operation
            </Button>
          </div>
        ) : (
          <DraggableList
            items={nodes}
            onReorder={(newNodes: Node[]) => {
              setNodes(newNodes);
            }}
            renderItem={(node, { isDragging, dragHandleProps }) => (
              <PromptNode
                key={node.id}
                {...node}
                focusMode={false}
                onTitleChange={(newTitle) => updateNode(node.id, { title: newTitle })}
                onContentChange={(newContent) => handleNodeTextChange(node.id, newContent)}
                onOperationChange={
                  node.type === 'operation'
                    ? (operation) => updateNode(node.id, { selectedOperation: operation })
                    : undefined
                }
                onOperationValuesChange={
                  node.type === 'operation'
                    ? (values) => updateNode(node.id, { operationValues: values })
                    : undefined
                }
                isDragging={isDragging}
                dragHandleProps={dragHandleProps}
                onDelete={() => setNodes(nodes.filter(n => n.id !== node.id))}
                addNode={addNode}
                wordWrap={wordWrap}
                lineNumbers={lineNumbers}
                onSettingsChange={onSettingsChange}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
