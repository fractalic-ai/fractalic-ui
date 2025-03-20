// Editor.tsx

import React, { useState, useCallback, RefObject, useEffect } from 'react';
import { importFromMarkdown, exportToMarkdown } from '@/utils/fileOperations';
import './gitDiff.css';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownViewer from './MarkdownViewer';
import styles from '@/components/MarkdownViewer.module.css';
import { TraceView } from "./TraceView";

import { Button } from "@/components/ui/button";
import {
  GitCompare,
  AlignJustify,
  FileText,
  Type,
  Book,
  Play,
  ChevronRight,
  Eye,
  Settings,
  Sliders,
  Save,
  Loader2,
  ArrowLeftCircle,
  GitCommit,
  Maximize,
  Minimize,
  Columns,
  ArrowLeft,
} from "lucide-react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import PromptEngineeringUI from './PromptEngineeringUI';
import { useToast } from "@/hooks/use-toast";

interface EditorProps {
  mode: "edit" | "git";
  selectedView: "sideBySide" | "inline" | "report" | "trace";
  setSelectedView: (view: "sideBySide" | "inline" | "report" | "trace") => void;
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
}

function debounce<Func extends (...args: any[]) => void>(func: Func, wait: number) {
  let timeout: number | undefined;
  return (...args: Parameters<Func>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

function EditorComponent(props: EditorProps) {
  const {
    mode,
    selectedView,
    setSelectedView,
    selectedCommit,
    editMode,
    setEditMode,
    lastCommitHash,
    setLastCommitHash,
    handleRun,
    diffContent,
    editedContent,
    handleContentChange,
    theme,
    editorContainerRef,
    repoPath,
    handleBreadcrumbClick,
    currentFilePath,
    branchHash,
    onBranchHashClick,
    branchNotification,
    handleBranchSelect,
  } = props;

  const { toast } = useToast();
  const [isVisited, setIsVisited] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [currentFilePathState, setCurrentFilePathState] = useState(props.currentFilePath);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = React.useRef<any>(null);
  // Add isFullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Add toggleFullscreen function
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Define fetchFileContent
  const fetchFileContent = async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`http://localhost:8000/get_file_content_disk/?path=${encodeURIComponent(filePath)}`);
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
  };

  // Debounced version of handleContentChange
  const handleContentChangeWithDebounce = useCallback(
    debounce((value: string | undefined) => {
      handleContentChange(value);
    }, 300),
    [handleContentChange]
  );

  const handleBranchHashClick = useCallback(() => {
    if (branchHash) {
      onBranchHashClick(branchHash);
    }
  }, [branchHash, onBranchHashClick]);

  const handleBranchSelectWithState = () => {
    handleBranchSelect();
    setIsVisited(true);
    setIsButtonClicked(true);
  };

  const handleRunWithStateReset = () => {
    handleRun();
    setIsButtonClicked(false);
  };

  const handleWordWrapChange = (checked: boolean) => {
    setWordWrap(checked);
  };

  const handleLineNumbersChange = (checked: boolean) => {
    setLineNumbers(checked);
  };

  const handleFileSelect = async (file: any) => {
    // Fetch file content
    const content = await fetchFileContent(file.path);
    handleContentChange(content);
  };

  const handleEditModeChange = (mode: "plainText" | "notebook") => {
    try {
      if (editMode === "notebook" && mode === "plainText") {
        // Track the last notebook state
        const nodes = importFromMarkdown(editedContent);
        const markdownContent = exportToMarkdown(nodes);
        // Force update the content to ensure latest changes are captured
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

  const handleSave = async () => {
    if (!currentFilePathState) {
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

      const response = await fetch('http://localhost:8000/save_file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: currentFilePathState,
          content: contentToSave
        }),
      });

      if (response.ok) {
        setIsDirty(false);
        toast({
          title: "Success",
          description: "File saved successfully"
        });
      } else {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
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
  };

  useEffect(() => {
    setCurrentFilePathState(props.currentFilePath);
  }, [props.currentFilePath]);

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  const renderEditorSettings = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm" 
          className="hover:bg-accent hover:text-accent-foreground"
        >
          <Sliders className="mr-2 h-4 w-4" />
          Editor Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          {/* Font Size Selector */}
          <div className="flex flex-col space-y-1 py-2 px-3">
            <label htmlFor="fontSize" className="text-sm text-foreground">
              Font Size
            </label>
            <select
              id="fontSize"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="border rounded px-2 py-1 bg-black text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {[12,14,16,18,20].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          {/* Word Wrap Toggle */}
          <div className="flex items-center space-x-2 py-2 px-3">
            <Switch
              id="wordWrap"
              checked={wordWrap}
              onCheckedChange={handleWordWrapChange}
              className="bg-black"
              onClick={(e) => e.stopPropagation()}
            />
            <label htmlFor="wordWrap" className="text-sm text-foreground">
              Word Wrap
            </label>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          {/* Line Numbers Switch */}
          <div className="flex items-center space-x-2 py-2 px-3">
            <Switch
              id="lineNumbers"
              checked={lineNumbers}
              onCheckedChange={handleLineNumbersChange}
              onClick={(e) => e.stopPropagation()}
            />
            <label htmlFor="lineNumbers" className="text-sm text-foreground">
              Line Numbers
            </label>
          </div>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderEditor = () => {
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
      
      // Add a new view condition for 'trace'
      if (selectedView === 'trace' && selectedCommit.length > 0) {
        const currentCommit = selectedCommit[selectedCommit.length - 1];
        
        return (
          <div className="h-full w-full overflow-hidden">
            <TraceView 
              repoPath={repoPath}
              traceFile={currentCommit.trc_file}
              traceCommitHash={currentCommit.trc_commit_hash}
              className={styles.markdownContent}
            />
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
      if (editMode === "notebook") {
        return (
          <div className="flex flex-col h-full">
            {/* Control buttons */} 
            <div className="flex-shrink-0">
              {/* Existing buttons */}
            </div>

            {/* Notebook container */}
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
              language="markdown"
              theme="vs-dark"
              options={{
                wordWrap: wordWrap ? 'on' : 'off',
                lineNumbers: lineNumbers ? 'on' : 'off',
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
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
                className={
                  selectedView === "inline"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <AlignJustify className="mr-2 h-4 w-4" />
                Inline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("sideBySide")}
                className={
                  selectedView === "sideBySide"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <Columns className="mr-2 h-4 w-4" />
                Side by Side
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("report")}
                className={
                  selectedView === "report"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedView("trace")}
                className={
                  selectedView === "trace"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <GitCommit className="mr-2 h-4 w-4" />
                Trace
              </Button>
              {renderEditorSettings()} {/* Add settings button */}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditModeChange("plainText")} // Changed from setEditMode
                className={
                  editMode === "plainText"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <Type className="mr-2 h-4 w-4" />
                Plain text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditModeChange("notebook")} // Changed from setEditMode
                className={
                  editMode === "notebook"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }
              >
                <Book className="mr-2 h-4 w-4" />
                Notebook
              </Button>
              {renderEditorSettings()} {/* Add settings button */}
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {branchNotification && (
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
              disabled={!isDirty || isSaving || !currentFilePathState}
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
      {mode === "git" && selectedCommit && selectedCommit.length > 0 && (
        <div className="flex items-center text-sm bg-gray-900 p-2 rounded-md text-white">
          {selectedCommit.map((node: any, index: number) => (
            <span key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
              )}
              <button
                className="text-white hover:underline"
                onClick={() => handleBreadcrumbClick(node)}
              >
                {node.text}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={`${mode === 'git' ? 'git-diff-editor' : ''} relative h-full`}>
        {renderEditor()}
      </div>
    </div>
  );
}

export default EditorComponent;
