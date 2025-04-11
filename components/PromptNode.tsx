import React, { useState, useEffect, useRef } from 'react';
import { WrapText, List, GripVertical, X, Plus } from "lucide-react";
import MonacoPromptEditor from './MonacoPromptEditor';
import OperationCombobox from './OperationCombobox';
import OperationControls from './OperationControls';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface PromptNodeProps {
  node: Node;
  wordWrap: boolean;
  lineNumbers: boolean;
  id: number;
  title: string;
  type: 'default' | 'operation';
  promptText: string;
  selectedOperation?: string;
  operationValues?: Record<string, any>;
  focusMode: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onOperationChange?: (operation: string) => void;
  onOperationValuesChange?: (values: Record<string, any>) => void;
  isDragging: boolean;
  dragHandleProps: any;
  onDelete: () => void;
  addNode: (type: 'default' | 'operation', afterId: number) => void;
  onSettingsChange?: {
    wordWrap: (value: boolean) => void;
    lineNumbers: (value: boolean) => void;
  };
}

const PromptNode: React.FC<PromptNodeProps> = ({
  node,
  wordWrap,
  lineNumbers,
  id,
  title,
  type,
  promptText,
  selectedOperation = '@import',
  operationValues = {},
  focusMode,
  onTitleChange,
  onContentChange,
  onOperationChange,
  onOperationValuesChange,
  isDragging,
  dragHandleProps,
  onDelete,
  addNode,
  onSettingsChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const [lastStableTitle, setLastStableTitle] = useState(title);
  const hoverTimeoutRef = useRef<number | null>(null);
  const contentEditableRef = useRef<HTMLSpanElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Track local overrides
  const [localSettings, setLocalSettings] = useState<{
    wordWrap?: boolean;
    lineNumbers?: boolean;
  }>({});

  // Use local settings if set, otherwise use global
  const effectiveWordWrap = localSettings.wordWrap ?? wordWrap;
  const effectiveLineNumbers = localSettings.lineNumbers ?? lineNumbers;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (!isTransitioning) {
      setIsHovering(true);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovering(false);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 200);
    }, 100);
  };

  useEffect(() => {
    if (!isEditing) {
      setLastStableTitle(title);
    }
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && contentEditableRef.current) {
      contentEditableRef.current.textContent = lastStableTitle;
      setEditingTitle(lastStableTitle);
      
      const observer = new MutationObserver(() => {
        if (contentEditableRef.current) {
          const newText = contentEditableRef.current.textContent || '';
          setEditingTitle(newText);
        }
      });

      observer.observe(contentEditableRef.current, {
        characterData: true,
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    }
  }, [isEditing, lastStableTitle]);

  const handleBlur = () => {
    if (contentEditableRef.current) {
      const newText = contentEditableRef.current.textContent || '';
      const finalText = newText.startsWith('#') ? newText : '# ' + newText;
      onTitleChange(finalText);
    }
    setIsEditing(false);
  };

  function toKebabCase(str: string) {
    return str
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  function parseTitle(title: string) {
    const match = title.match(/^(#{1,6})\s+(.+?)(?:\s+{id=([^}]+)})?$/);
    if (!match) {
      // Provide default level & text, generate an ID
      return { level: 1, text: title, id: toKebabCase(title), raw: title };
    }
    const headingText = match[2];
    const foundId = match[3] || toKebabCase(headingText);
    return {
      level: match[1].length,
      text: headingText,
      id: foundId,
      raw: title
    };
  }

  const getHeadingClass = (level: number) => {
    const sizes = {
      1: 'text-2xl font-bold',
      2: 'text-xl font-bold',
      3: 'text-lg font-bold',
      4: 'text-base font-bold',
      5: 'text-sm font-bold',
      6: 'text-xs font-bold'
    } as const;
    return sizes[level as keyof typeof sizes] || sizes[1];
  };

  const getIndentationClass = (level: number) => {
    const indents = {
      1: 'ml-0',
      2: 'ml-4',
      3: 'ml-8',
      4: 'ml-12',
      5: 'ml-16',
      6: 'ml-20'
    };
    return indents[level as keyof typeof indents] || indents[1];
  };

  const titleData = parseTitle(isEditing ? editingTitle : lastStableTitle);

  const onOperationValuesChangeHandler = (newValues: Record<string, any>) => {
    onOperationValuesChange?.(newValues);
  };

  const handleAddNode = (nodeType: 'default' | 'operation') => {
    addNode(nodeType, id);
  };

  const handleWordWrapClick = () => {
    setLocalSettings(prev => ({
      ...prev,
      wordWrap: !effectiveWordWrap
    }));
  };

  const handleLineNumbersClick = () => {
    setLocalSettings(prev => ({
      ...prev,
      lineNumbers: !effectiveLineNumbers
    }));
  };

  // Clear local overrides when global settings change
  useEffect(() => {
    setLocalSettings({});
  }, [wordWrap, lineNumbers]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        'notebook-node relative group',
        focusMode && 'focus-mode',
        isDragging && 'dragging',
        type === 'default' && getIndentationClass(titleData.level)
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Node Header */}
      <div className="node-header mb-2">
        <div className="flex items-center justify-between">
          {/* Title section */}
          <div className="flex-1">
            {type === 'default' ? (
              isEditing ? (
                <span
                  ref={contentEditableRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLElement).blur();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`outline-none ${getHeadingClass(titleData.level)}`}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span 
                    className={`cursor-text ${getHeadingClass(titleData.level)} min-w-[100px]`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditing) {
                        setIsEditing(true);
                      }
                    }}
                    title={titleData.id}
                  >
                    {titleData.text}
                  </span>
                  {/* Always show ID badge */}
                  <span className="px-2 py-0.5 text-xs bg-gray-800 text-gray-300 rounded-md">
                    {titleData.id}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">Operation</span>
                <OperationCombobox
                  value={selectedOperation}
                  onChange={onOperationChange || (() => {})}
                />
              </div>
            )}
          </div>
          
          {/* Node Controls - Update this section */}
          <div className="node-controls flex items-center gap-1 opacity-0 transition-opacity duration-200">
            <Button
              onClick={handleWordWrapClick}
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-transparent"
              title={effectiveWordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              <WrapText 
                className={`w-3.5 h-3.5 ${effectiveWordWrap ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </Button>
            <Button
              onClick={handleLineNumbersClick}
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-transparent"
              title={effectiveLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
            >
              <List 
                className={`w-3.5 h-3.5 ${effectiveLineNumbers ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </Button>
            <div {...dragHandleProps} className="cursor-move p-1.5">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <Button
              onClick={onDelete}
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-destructive"
              title="Delete Node"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Node Content */}
      <div className="node-content">
        {type === 'default' ? (
          <MonacoPromptEditor
            value={promptText}
            onChange={onContentChange}
            placeholder="Enter your prompt..."
            showLineNumbers={effectiveLineNumbers}
            wordWrap={effectiveWordWrap}
          />
        ) : (
          <OperationControls
            operation={selectedOperation}
            values={operationValues}
            onChange={(field, value) => {
              onOperationValuesChangeHandler({
                [field]: value
              });
            }}
            wordWrap={effectiveWordWrap}
            showLineNumbers={effectiveLineNumbers}
            onSettingsChange={onSettingsChange}
          />
        )}
      </div>

      {/* Node Action Buttons - Centered and overlapping */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleAddNode('default');
          }}
          variant="ghost"
          size="sm"
          className="node-action-button h-7 px-3 text-sm text-white shadow-sm border border-[rgba(255,255,255,0.15)]"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Node
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleAddNode('operation');
          }}
          variant="ghost"
          size="sm"
          className="node-action-button h-7 px-3 text-sm text-white shadow-sm border border-[rgba(255,255,255,0.15)]"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Operation
        </Button>
      </div>
    </div>
  );
};

export default PromptNode;