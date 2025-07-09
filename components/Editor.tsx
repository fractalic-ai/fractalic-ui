// Editor.tsx

import React, { useState, useCallback, RefObject, useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { importFromMarkdown, exportToMarkdown } from '@/utils/fileOperations';
import { setupFractalicLanguage } from '@/utils/monaco';
import './gitDiff.css';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownViewer from './MarkdownViewer';
import styles from '@/components/MarkdownViewer.module.css';
import { TraceView } from "./TraceView";
import CanvasDisplay from "./Canvas/CanvasDisplay";
import { useTrace } from '@/contexts/TraceContext';
import { processTraceData } from '@/lib/traceProcessor';
import { useAppConfig, getApiUrl } from '@/hooks/use-app-config';

import { Button } from "@/components/ui/button";
import {
  AlignJustify,
  FileText,
  Type,
  Book,
  Play,
  Eye,
  Sliders,
  Save,
  Loader2,
  ArrowLeftCircle,
  GitCommit,
  Columns,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import PromptEngineeringUI from './PromptEngineeringUI';
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import MCPManager from './MCPManager';

interface EditorProps {
  mode: "edit" | "git" | "mcp";
  selectedView: "sideBySide" | "inline" | "report" | "trace" | "inspector" | "preview";
  setSelectedView: (view: "sideBySide" | "inline" | "report" | "trace" | "inspector" | "preview") => void;
  selectedCommit: any[];
  editMode: "plainText" | "notebook";
  setEditMode: (mode: "plainText" | "notebook") => void;
  lastCommitHash: string | null;
  setLastCommitHash: (hash: string | null) => void;
  handleRun: () => void;
  diffContent: { original: string; modified: string };
  editedContent: string;
  handleContentChange: (value: string | undefined) => void;
  theme: "dark" | "light";
  editorContainerRef: RefObject<HTMLDivElement>;
  repoPath: string;
  handleBreadcrumbClick: (node: any) => void;
  currentFilePath: string;
  branchHash: string | null;
  onBranchHashClick: (hash: string) => void;
  branchNotification: {
    branchId: string;
    fileHash: string;
    filePath: string;
  } | null;
  handleBranchSelect: () => void;
  onSave: () => Promise<void>;
}

// Helper function to determine if file is markdown
const isMarkdownFile = (filePath: string): boolean => {
  if (!filePath) return false;
  const extension = filePath.split('.').pop()?.toLowerCase();
  return ['md', 'mdc', 'ctx', 'markdown'].includes(extension || '');
};

function debounce<Func extends (...args: any[]) => void>(func: Func, wait: number) {
  let timeout: number | undefined;
  return (...args: Parameters<Func>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

// Memoized Editor component to prevent unnecessary re-renders
const EditorComponent = React.memo(function EditorComponent(props: EditorProps) {
  const {
    mode,
    selectedView,
    setSelectedView,
    selectedCommit,
    editMode,
    setEditMode,
    handleRun,
    diffContent,
    editedContent,
    handleContentChange,
    theme,
    currentFilePath,
    branchHash,
    onBranchHashClick,
    branchNotification,
    handleBranchSelect,
  } = props;

  const { traceData } = useTrace();
  const { toast } = useToast();
  const { config } = useAppConfig();
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectorTraceData, setInspectorTraceData] = useState<any>(null);
  const [isInspectorLoading, setIsInspectorLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const savedSettings = {
      wordWrap,
      lineNumbers,
      selectedView,
      editMode,
      showPreview
    };
    localStorage.setItem('editorSettings', JSON.stringify(savedSettings));
  }, [wordWrap, lineNumbers, selectedView, editMode, showPreview]);

  useEffect(() => {
    const savedSettingsStr = localStorage.getItem('editorSettings');
    if (savedSettingsStr) {
      try {
        const savedSettings = JSON.parse(savedSettingsStr);
        setWordWrap(savedSettings.wordWrap ?? true);
        setLineNumbers(savedSettings.lineNumbers ?? true);
        setSelectedView(savedSettings.selectedView || 'sideBySide');
        setEditMode(savedSettings.editMode || 'plainText');
        setShowPreview(savedSettings.showPreview ?? false);
      } catch (error) {
        console.error('Error restoring editor settings:', error);
      }
    }
  }, []);

  const fetchFileContent = useCallback(async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`${getApiUrl('backend', config)}/get_file_content_disk/?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.text();
        return data;
      } else {
        console.error('Error fetching file content:', response.statusText);
        return '';
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      return '';
    }
  }, [config]);

  const handleBranchSelectWithState = () => {
    handleBranchSelect();
  };

  const handleRunWithStateReset = () => {
    console.log('[Editor] Run button clicked');
    handleRun();
  };

  const handleWordWrapChange = (checked: boolean) => {
    setWordWrap(checked);
  };

  const handleLineNumbersChange = (checked: boolean) => {
    setLineNumbers(checked);
  };

  const handleEditModeChange = (mode: "plainText" | "notebook") => {
    try {
      if (editMode === "notebook" && mode === "plainText") {
        const nodes = importFromMarkdown(editedContent);
        const markdownContent = exportToMarkdown(nodes);
        handleContentChange(markdownContent);
      }
      setEditMode(mode);
    } catch (error) {
      console.error("Failed to convert between notebook and plain text:", error);
      return;
    }
  };

  const handleContentChangeWithDirty = (newContent: string | undefined) => {
    if (typeof newContent === 'string' && newContent !== props.editedContent) {
      handleContentChange(newContent);
      setIsDirty(true);
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentFilePath) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No file selected to save"
      });
      return;
    }

    setIsSaving(true);
    try {
      let contentToSave = editedContent;
      
      if (editMode === 'notebook') {
        const nodes = importFromMarkdown(editedContent);
        contentToSave = exportToMarkdown(nodes);
      }

      const response = await fetch(`${getApiUrl('backend', config)}/save_file?path=${encodeURIComponent(currentFilePath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: currentFilePath,
          content: contentToSave,
          mode: editMode
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save file: ${errorText}`);
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        variant: "destructive",
        title: "Error saving file",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsSaving(false);
    }
  }, [config, currentFilePath, editedContent, editMode, toast]);

  // Debug logging - only log when component re-renders (can be removed in production)
  // console.log('[EditorComponent] Re-render triggered:', {
  //   editedContentLength: editedContent?.length,
  //   currentFilePath,
  //   mode,
  //   editMode,
  //   selectedView,
  //   timestamp: new Date().toISOString()
  // });

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const processInspectorTrace = async () => {
      if (props.selectedView !== "inspector" || !props.selectedCommit || props.selectedCommit.length === 0) {
        return;
      }
      
      setIsInspectorLoading(true);
      try {
        const selectedNode = props.selectedCommit[0]; // Use the first element of the array
        
        if (!selectedNode?.trc_file || !selectedNode?.trc_commit_hash) {
          console.log("[Inspector] No trace information available in selected commit");
          setInspectorTraceData(null);
          return;
        }
        
        console.log("[Inspector] Processing trace data for", selectedNode.trc_file);
        
        // Leverage the same processTraceData function that TraceView uses
        const processedTrace = await processTraceData({
          repoPath: props.repoPath,
          callTree: props.selectedCommit,
          traceData
        });
        
        console.log("[Inspector] Processed trace data:", processedTrace);
        
        if (processedTrace) {
          setInspectorTraceData(processedTrace);
        } else {
          console.error("[Inspector] Failed to process trace data");
          setInspectorTraceData(null);
        }
      } catch (error) {
        console.error("[Inspector] Error processing trace data:", error);
        setInspectorTraceData(null);
      } finally {
        setIsInspectorLoading(false);
      }
    };
    
    processInspectorTrace();
  }, [props.selectedView, props.selectedCommit, props.repoPath, traceData]);

  useEffect(() => {
    console.log('[Editor] branchNotification changed:', branchNotification);
  }, [branchNotification]);

  const renderEditor = () => {
    if (mode === 'mcp') {
      return <MCPManager className="h-full" />;
    }
    
    if (mode === 'git') {
      if (selectedView === 'report' && diffContent.modified) {
        return (
          <div className="h-full w-full">
            <ScrollArea className="h-full">
              <MarkdownViewer 
                content={diffContent.modified} 
                className={styles.markdownContent}
              />
            </ScrollArea>
          </div>
        );
      }
      
      if (selectedView === 'trace' && selectedCommit.length > 0) {
        return (
          <div className="h-full w-full flex flex-col flex-grow">
            <TraceView 
              repoPath={repoPath}
              callTree={selectedCommit.length > 0 ? [selectedCommit[0]] : undefined}
              className={styles.markdownContent}
            />
          </div>
        );
      }
  
      if (selectedView === 'inspector') {
        return (
          <div className="h-full w-full flex flex-col flex-grow">
            {isInspectorLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-400">Loading trace data...</span>
              </div>
            ) : inspectorTraceData ? (
              <CanvasDisplay initialTraceData={inspectorTraceData} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p>No trace data available for the selected commit.</p>
                  <p className="text-sm mt-2">Select a commit with trace information to view details.</p>
                </div>
              </div>
            )}
          </div>
        );
      }
  
      return (
        <div className="h-full">
          <DiffEditor
            original={diffContent.original}
            modified={diffContent.modified}
            language="markdown"
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
            options={{
              fontSize: fontSize,
              lineNumbers: lineNumbers ? 'on' : 'off',
              wordWrap: wordWrap ? 'on' : 'off',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              renderSideBySide: selectedView === 'sideBySide',
              readOnly: true,
              domReadOnly: false
            }}
          />
        </div>
      );
    }
    if (mode === "edit") {
      if (showPreview && isMarkdownFile(currentFilePath)) {
        return (
          <div className="h-full w-full">
            <ScrollArea className="h-full">
              <MarkdownViewer 
                content={editedContent} 
                className={styles.markdownContent}
              />
            </ScrollArea>
          </div>
        );
      }
      
      if (editMode === "notebook") {
        return (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto notebook-theme h-[calc(100%-theme(space.16))]">
              <PromptEngineeringUI
                value={editedContent}
                onChange={handleContentChangeWithDirty}
                wordWrap={wordWrap}
                lineNumbers={lineNumbers}
                onSettingsChange={{
                  wordWrap: handleWordWrapChange,
                  lineNumbers: handleLineNumbersChange,
                }}
              />
            </div>
          </div>
        );
      } else {
        return (
          <div className="h-full w-full">
            <Editor
              value={editedContent}
              onChange={handleContentChangeWithDirty}
              language="fractalic"
              theme="fractalicDarkTheme"
              options={{
                wordWrap: wordWrap ? 'on' : 'off',
                lineNumbers: lineNumbers ? 'on' : 'off',
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabCompletion: "on",
                wordBasedSuggestions: "currentDocument",
                parameterHints: {
                  enabled: true
                }
              }}
              beforeMount={(monaco) => {
                if (!window.fractalicInitialized) {
                  setupFractalicLanguage(monaco);
                  window.fractalicInitialized = true;
                }
              }}
            />
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div
      className={cn(
        "h-full w-full relative flex flex-col",
        isFullscreen && "fixed top-0 left-0 z-50 bg-background"
      )}
    >
      <div className="w-full flex justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          {isFullscreen && (
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              <ArrowLeftCircle className="mr-2 h-4 w-4" />
              Exit Fullscreen
            </Button>
          )}
          {mode === "git" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("inline")}
                className={`${
                  selectedView === "inline"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <AlignJustify className="mr-2 h-4 w-4" />
                Inline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("sideBySide")}
                className={`${
                  selectedView === "sideBySide"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Columns className="mr-2 h-4 w-4" />
                Side by Side
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("report")}
                className={`${
                  selectedView === "report"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("trace")}
                className={`${
                  selectedView === "trace"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <GitCommit className="mr-2 h-4 w-4" />
                Trace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("inspector")}
                className={`${
                  selectedView === "inspector"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <GitCommit className="mr-2 h-4 w-4" />
                Inspector
              </Button>
            </>
          ) : mode === "mcp" ? (
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">MCP Management</h2>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleEditModeChange("plainText");
                  setShowPreview(false);
                }}
                className={`${
                  editMode === "plainText" && !showPreview
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Type className="mr-2 h-4 w-4" />
                Plain text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleEditModeChange("notebook");
                  setShowPreview(false);
                }}
                className={`${
                  editMode === "notebook" && !showPreview
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Book className="mr-2 h-4 w-4" />
                Notebook
              </Button>
              {isMarkdownFile(currentFilePath) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className={`${
                    showPreview
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              )}
            </>
          )}
          {mode !== "mcp" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Sliders className="mr-2 h-4 w-4" />
                  Editor Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#1a1a1a] border border-gray-800">
                <DropdownMenuLabel className="text-white font-medium">Editor Settings</DropdownMenuLabel>
                <div className="p-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="word-wrap-switch" className="text-sm text-gray-300">Word Wrap</Label>
                    <Switch
                      id="word-wrap-switch"
                      checked={wordWrap}
                      onCheckedChange={handleWordWrapChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="line-numbers-switch" className="text-sm text-gray-300">Line Numbers</Label>
                    <Switch
                      id="line-numbers-switch"
                      checked={lineNumbers}
                      onCheckedChange={handleLineNumbersChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="font-size-input" className="text-sm text-gray-300">Font Size</Label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id="font-size-input"
                          type="number"
                          value={fontSize}
                          onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value) || 14))}
                          className="w-full h-8 text-sm bg-[#2a2a2a] border-gray-700 text-white focus:border-primary focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="8"
                          max="32"
                          step="2"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col space-y-0.5 pointer-events-none">
                          <button
                            onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                            className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-white pointer-events-auto"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setFontSize(prev => Math.max(8, prev - 2))}
                            className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-white pointer-events-auto"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {branchNotification && (
            console.log('[Editor] Rendering View Changes button, branchNotification:', branchNotification),
            <Button
              variant="outline"
              size="sm"
              className={`${
                isButtonClicked
                  ? "bg-transparent text-primary"
                  : "bg-green-900 text-white"
              }`}
              onClick={handleBranchSelectWithState}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Changes
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving || !currentFilePath}
              variant="outline" 
              size="sm"
              className={cn("relative")}
            >
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>
                  Save
                  {isDirty && (
                    <span className="ml-1 inline-block w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
              </div>
            </Button>

            <Button 
              variant="outline"
              size="sm"
              onClick={handleRunWithStateReset}
            >
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
          </div>
        </div>
      </div>
      <div className={`${mode === 'git' ? 'git-diff-editor' : ''} relative h-full`}>
        {renderEditor()}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.mode === nextProps.mode &&
    prevProps.selectedView === nextProps.selectedView &&
    prevProps.editMode === nextProps.editMode &&
    prevProps.theme === nextProps.theme &&
    prevProps.currentFilePath === nextProps.currentFilePath &&
    prevProps.editedContent === nextProps.editedContent &&
    prevProps.branchHash === nextProps.branchHash &&
    prevProps.lastCommitHash === nextProps.lastCommitHash &&
    prevProps.repoPath === nextProps.repoPath &&
    JSON.stringify(prevProps.selectedCommit) === JSON.stringify(nextProps.selectedCommit) &&
    JSON.stringify(prevProps.branchNotification) === JSON.stringify(nextProps.branchNotification) &&
    prevProps.diffContent?.original === nextProps.diffContent?.original &&
    prevProps.diffContent?.modified === nextProps.diffContent?.modified &&
    prevProps.setSelectedView === nextProps.setSelectedView &&
    prevProps.setEditMode === nextProps.setEditMode &&
    prevProps.setLastCommitHash === nextProps.setLastCommitHash &&
    prevProps.handleRun === nextProps.handleRun &&
    prevProps.handleContentChange === nextProps.handleContentChange &&
    prevProps.handleBreadcrumbClick === nextProps.handleBreadcrumbClick &&
    prevProps.onBranchHashClick === nextProps.onBranchHashClick &&
    prevProps.handleBranchSelect === nextProps.handleBranchSelect &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.editorContainerRef === nextProps.editorContainerRef
  );
});

export default EditorComponent;
