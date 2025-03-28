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
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  onSave: () => Promise<void>;
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
    onSave,
  } = props;

  const { toast } = useToast();
  const [isVisited, setIsVisited] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const savedSettings = {
      wordWrap,
      lineNumbers,
      selectedView,
      editMode
    };
    localStorage.setItem('editorSettings', JSON.stringify(savedSettings));
  }, [wordWrap, lineNumbers, selectedView, editMode]);

  useEffect(() => {
    const savedSettingsStr = localStorage.getItem('editorSettings');
    if (savedSettingsStr) {
      try {
        const savedSettings = JSON.parse(savedSettingsStr);
        setWordWrap(savedSettings.wordWrap ?? true);
        setLineNumbers(savedSettings.lineNumbers ?? true);
        setSelectedView(savedSettings.selectedView || 'sideBySide');
        setEditMode(savedSettings.editMode || 'plainText');
      } catch (error) {
        console.error('Error restoring editor settings:', error);
      }
    }
  }, []);

  const fetchFileContent = async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`/api/get_file_content_disk/?path=${encodeURIComponent(filePath)}`);
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

  const handleContentChangeWithDebounce = useCallback(
    debounce((value: string | undefined) => {
      if (typeof value === 'string' && value !== props.editedContent) {
        handleContentChange(value);
        setIsDirty(true);
      }
    }, 300),
    [handleContentChange, props.editedContent]
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
    const content = await fetchFileContent(file.path);
    handleContentChange(content);
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

  const handleSave = async () => {
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

      const response = await fetch(`/api/save_file?path=${encodeURIComponent(currentFilePath)}`, {
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
      toast({
        title: "Success",
        description: "File saved successfully"
      });
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
    console.log('[EditorComponent] Props received:', {
      editedContentLength: editedContent?.length,
      currentFilePath,
      mode,
      editMode,
      selectedView,
      diffContentOriginalLength: diffContent?.original?.length,
      diffContentModifiedLength: diffContent?.modified?.length
    });
  }, [editedContent, currentFilePath, mode, editMode, selectedView, diffContent]);

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  const renderEditorSettings = () => (
    <div className="flex items-center space-x-4 p-2 border-b border-border bg-card text-card-foreground">
      <div className="flex items-center space-x-2">
        <Button
          variant={editMode === 'plainText' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleEditModeChange('plainText')}
          className="text-xs px-2 py-1 h-auto"
        >
          Plain Text
        </Button>
        <Button
          variant={editMode === 'notebook' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleEditModeChange('notebook')}
          className="text-xs px-2 py-1 h-auto"
        >
          Notebook
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center space-x-2">
        <Switch
          id="word-wrap-switch"
          checked={wordWrap}
          onCheckedChange={handleWordWrapChange}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="word-wrap-switch" className="text-xs">Word Wrap</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="line-numbers-switch"
          checked={lineNumbers}
          onCheckedChange={handleLineNumbersChange}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="line-numbers-switch" className="text-xs">Line Numbers</Label>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center space-x-2">
        <Label htmlFor="font-size-input" className="text-xs">Font Size:</Label>
        <Input
          id="font-size-input"
          type="number"
          value={fontSize}
          onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value) || 14))}
          className="w-16 h-7 text-xs px-2"
          min="8"
          max="32"
        />
      </div>

      <Button
        onClick={handleSave}
        size="sm"
        disabled={!isDirty || isSaving}
        className="ml-auto text-xs px-2 py-1 h-auto"
      >
        {isSaving ? 'Saving...' : 'Save'}
        {isDirty && !isSaving && <span className="ml-1 text-yellow-500">*</span>}
      </Button>
    </div>
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
      
      if (selectedView === 'trace' && selectedCommit.length > 0) {
        return (
          <div className="h-full w-full overflow-hidden">
            <TraceView 
              repoPath={repoPath}
              callTree={selectedCommit.length > 0 ? [selectedCommit[0]] : undefined}
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
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditModeChange("plainText")}
                className={`${
                  editMode === "plainText"
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
                onClick={() => handleEditModeChange("notebook")}
                className={`${
                  editMode === "notebook"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Book className="mr-2 h-4 w-4" />
                Notebook
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Sliders className="mr-2 h-4 w-4" />
                Editor Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Editor Settings</DropdownMenuLabel>
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="word-wrap-switch" className="text-xs">Word Wrap</Label>
                  <Switch
                    id="word-wrap-switch"
                    checked={wordWrap}
                    onCheckedChange={handleWordWrapChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers-switch" className="text-xs">Line Numbers</Label>
                  <Switch
                    id="line-numbers-switch"
                    checked={lineNumbers}
                    onCheckedChange={handleLineNumbersChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size-input" className="text-xs">Font Size</Label>
                  <Input
                    id="font-size-input"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value) || 14))}
                    className="w-16 h-7 text-xs px-2"
                    min="8"
                    max="32"
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
}

export default EditorComponent;
