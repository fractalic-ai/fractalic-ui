// GitDiffViewer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from './Header';
import Sidebar from './Sidebar';
import FileTree from './FileTree';
import CommitTree from './CommitTree';
import Editor from './Editor';
import dynamic from 'next/dynamic';
import SettingsModal from './SettingsModal';
import '@xterm/xterm/css/xterm.css';
import path from 'path';
import { DiffEditor } from "@monaco-editor/react";
import MarkdownViewer from './MarkdownViewer';
import { TraceView } from "./TraceView";
import styles from './MarkdownViewer.module.css';

interface ConsoleProps {
  // We keep the same props as before but no longer need "ref".
  setShowConsole: (show: boolean) => void;
  onResize: () => void;
  currentPath: string;
  currentFilePath: string;
  onSpecialOutput: (branchId: string, fileHash: string, filePath: string) => void;
}

// Dynamically imported Console with no forwardRef
const DynamicConsole = dynamic<ConsoleProps>(() => import('./Console'), { ssr: false });

export default function GitDiffViewer() {
  // State variables
  const [selectedView, setSelectedView] = useState<'sideBySide' | 'inline' | 'report' | 'trace'>('sideBySide');
  const [currentGitPath, setCurrentGitPath] = useState<string>('');
  const [currentEditPath, setCurrentEditPath] = useState<string>('');
  const [currentGitFiles, setCurrentGitFiles] = useState<any[]>([]);
  const [currentEditFiles, setCurrentEditFiles] = useState<any[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mode, setMode] = useState<'edit' | 'git'>('edit');
  const [diffContent, setDiffContent] = useState<{ original: string; modified: string }>({
    original: '',
    modified: '',
  });
  const [showConsole, setShowConsole] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [repoPath, setRepoPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editMode, setEditMode] = useState<'plainText' | 'notebook'>('plainText');
  const [lastCommitHash, setLastCommitHash] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [branchHash, setBranchHash] = useState<string | null>(null);
  const [branchNotification, setBranchNotification] = useState<{
    branchId: string;
    fileHash: string;
    filePath: string;
  } | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [previousPanelSize, setPreviousPanelSize] = useState(25);

  useEffect(() => {
    console.log('GitDiffViewer mounted');
    return () => console.log('GitDiffViewer unmounted');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (mode === 'git') {
      fetchDirectoryContents(currentGitPath, true);
    } else if (mode === 'edit') {
      fetchDirectoryContents(currentEditPath, false);
    }
  }, [currentGitPath, currentEditPath, mode]);

  useEffect(() => {
    if (repoPath) {
      fetchBranchesAndCommits(repoPath);
    }
  }, [repoPath]);
  
  const handleFileSelect = useCallback(async (file: any) => {
    try {
      const response = await fetch(
        `http://localhost:8000/get_file_content_disk/?path=${encodeURIComponent(file.path)}`
      );
      if (response.ok) {
        const data = await response.text();
        setEditedContent(data);
        setSelectedFile(file);
        setCurrentFilePath(file.path);
      } else {
        console.error('Error fetching file content:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedItem && selectedItem.endsWith('.tsx')) { // Adjust the file extension as needed
      handleFileSelect(selectedItem);
    }
  }, [selectedItem, handleFileSelect]);

  const handlePanelResize = useCallback(() => {
    // Handle any logic needed when the panel resizes
  }, []);

  const fetchDirectoryContents = async (pathStr: string, isGitMode: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/list_directory/?path=${encodeURIComponent(pathStr)}`);
      if (response.ok) {
        const data = await response.json();
        if (isGitMode) {
          setCurrentGitFiles(data);
        } else {
          setCurrentEditFiles(data);
        }
      } else {
        console.error('Error fetching directory contents:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching directory contents:', error);
    }
  };

  const fetchBranchesAndCommits = useCallback(async (pathStr: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/branches_and_commits/?repo_path=${encodeURIComponent(pathStr)}`
      );
      if (response.ok) {
        const data = await response.json();
        setBranchesData(data);
        return data;
      } else {
        console.error('Error fetching branches and commits:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error fetching branches and commits:', error);
      return [];
    }
  }, []);



  const handleFolderSelect = useCallback(
    (folder: any) => {
      console.log('Folder selected:', folder);
      if (folder.is_git_repo && mode === 'git') {
        setRepoPath(folder.path);
        setSelectedFolder(folder);
        setCurrentGitPath(folder.path);
        setSelectedItem(folder.path);
      } else if (folder.is_dir || folder.name === '..') {
        const newPath = folder.path;
        if (mode === 'git') {
          setCurrentGitPath(newPath);
        } else {
          setCurrentEditPath(newPath);
        }
        setSelectedItem(newPath);
      } else {
        if (mode === 'edit') {
          handleFileSelect(folder);
          { setSelectedItem(folder.path) }
        }
      }
    },
    [mode, handleFileSelect]
  );

  const handleContentChange = (value: string | undefined) => {
    setEditedContent(value || '');
  };

  const handleNewFile = (fileName: string) => {
    if (fileName) {
      fetch(
        `http://localhost:8000/create_file/?path=${encodeURIComponent(currentEditPath)}&name=${encodeURIComponent(
          fileName
        )}`,
        {
          method: 'POST',
        }
      )
        .then(async (response) => {
          if (response.ok) {
            await fetchDirectoryContents(currentEditPath, false);
            const newFilePath = `${currentEditPath}/${fileName}`;
            setSelectedItem(newFilePath);
            // Create file object and call handleFileSelect
            const newFile = {
              path: newFilePath,
              name: fileName,
              is_dir: false
            };
            handleFileSelect(newFile);
          } else {
            console.error('Error creating file:', response.statusText);
          }
        })
        .catch((error) => {
          console.error('Error creating file:', error);
        });
    }
  };

  const handleNewFolder = (folderName: string) => {
    if (folderName) {
      fetch(
        `http://localhost:8000/create_folder/?path=${encodeURIComponent(
          currentEditPath
        )}&name=${encodeURIComponent(folderName)}`,
        {
          method: 'POST',
        }
      )
        .then((response) => {
          if (response.ok) {
            fetchDirectoryContents(currentEditPath, false);
          } else {
            console.error('Error creating folder:', response.statusText);
          }
        })
        .catch((error) => {
          console.error('Error creating folder:', error);
        });
    }
  };

  const fetchFileContent = useCallback(
    async (repoPathParam: string, filePath: string, commitHash: string) => {
      try {
        const response = await fetch(
          `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
            repoPathParam
          )}&file_path=${encodeURIComponent(filePath)}&commit_hash=${commitHash}`
        );
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
    },
    []
  );

  const fetchDiffContent = useCallback(
    async (
      repoPathParam: string,
      mdFile: string,
      ctxFile: string,
      mdCommitHash: string,
      ctxCommitHash: string
    ) => {
      try {
        const [mdContent, ctxContent] = await Promise.all([
          fetchFileContent(repoPathParam, mdFile, mdCommitHash),
          fetchFileContent(repoPathParam, ctxFile, ctxCommitHash),
        ]);

        setDiffContent({
          original: mdContent,
          modified: ctxContent,
        });
      } catch (error) {
        console.error('Error fetching diff content:', error);
      }
    },
    [fetchFileContent]
  );

  const handleBranchSelect = useCallback(() => {
    if (branchNotification) {
      const { branchId, fileHash, filePath } = branchNotification;
      const repoRootPath = path.dirname(filePath);
      const parentPath = path.dirname(repoRootPath);

      setMode('git');
      setRepoPath(repoRootPath);
      setCurrentGitPath(parentPath);
      setSelectedFolder({ path: repoRootPath, is_git_repo: true });
      setSelectedItem(repoRootPath);
      setBranchHash(fileHash);

      fetchBranchesAndCommits(repoRootPath).then((data) => {
        const branch = data.find((b: { id: string }) => b.id === branchId);
        if (branch) {
          setSelectedCommit([branch]);

          const findCommit = (node: any): any => {
            if (node.ctx_commit_hash === fileHash) {
              return node;
            }
            for (const child of node.children || []) {
              const result = findCommit(child);
              if (result) return result;
            }
            return null;
          };

          const commit = findCommit(branch);
          if (commit) {
            setSelectedCommit((prev) => [...prev, commit]);
            fetchDiffContent(
              repoRootPath,
              commit.md_file,
              commit.ctx_file,
              commit.md_commit_hash,
              commit.ctx_commit_hash
            );
          }
        }
      });
    }
  }, [
    branchNotification,
    setMode,
    setRepoPath,
    setCurrentGitPath,
    setSelectedFolder,
    setSelectedItem,
    setBranchHash,
    fetchBranchesAndCommits,
    setSelectedCommit,
    fetchDiffContent,
  ]);

  const handleCommitSelect = useCallback(
    async (node: any) => {
      const breadcrumb = [];
      let currentNode = node;
      while (currentNode) {
        breadcrumb.unshift(currentNode);
        currentNode = currentNode.parent;
      }
      setSelectedCommit(breadcrumb);

      if (node.ctx_file && node.md_file) {
        await fetchDiffContent(repoPath, node.md_file, node.ctx_file, node.md_commit_hash, node.ctx_commit_hash);
      } else {
        setDiffContent({
          original: '',
          modified: '',
        });
      }
    },
    [fetchDiffContent, repoPath]
  );

  const handleBreadcrumbClick = useCallback(
    async (node: any) => {
      if (node.ctx_file && node.md_file) {
        await fetchDiffContent(repoPath, node.md_file, node.ctx_file, node.md_commit_hash, node.ctx_commit_hash);
      }
    },
    [fetchDiffContent, repoPath]
  );

  const handleSpecialOutput = useCallback((branchId: string, fileHash: string, filePath: string) => {
    setBranchNotification({ branchId, fileHash, filePath });
  }, []);

  const handleRun = useCallback(() => {
    setShowConsole(true);
  }, []);

  const handleBranchHashClick = useCallback(
    (hash: string) => {
      const branch = branchesData.find((b) => b.children.some((commit: any) => commit.ctx_commit_hash === hash));
      if (branch) {
        const commit = branch.children.find((c: any) => c.ctx_commit_hash === hash);
        if (commit) {
          setSelectedCommit([branch, commit]);
          fetchDiffContent(repoPath, commit.md_file, commit.ctx_file, commit.md_commit_hash, commit.ctx_commit_hash);
          setCurrentGitPath(path.dirname(commit.ctx_file));
          setSelectedFolder({ path: path.dirname(commit.ctx_file), is_git_repo: true });
        }
      }
    },
    [branchesData, setSelectedCommit, fetchDiffContent, repoPath]
  );

  const handlePanelToggle = () => {
    if (isPanelVisible) {
      // Store current size before hiding
      const leftPanel = document.getElementById('left-panel');
      if (leftPanel) {
        const size = parseFloat(getComputedStyle(leftPanel).width) / window.innerWidth * 100;
        setPreviousPanelSize(size);
      }
    }
    setIsPanelVisible(!isPanelVisible);
  };

  const renderEditor = () => {
    if (selectedView === 'trace' && selectedCommit.length > 0) {
      console.log("Rendering TraceView with selectedCommit:", selectedCommit);
      
      // Only pass the first element as it's the root node
      // This prevents the duplication issue
      return (
        <div className="h-full w-full flex flex-col flex-grow">
          <TraceView 
            repoPath={repoPath}
            callTree={[selectedCommit[0]]}  // Pass only the root node
          />
        </div>
      );
    } else if (selectedView === 'report' && diffContent.modified) {
      // Add debug log to verify the condition is being met
      console.log('Showing report view:', diffContent.modified.slice(0, 100));
      
      return (
        <div className="h-full w-full flex flex-col flex-grow">
          <ScrollArea className="h-full flex-grow">
            <MarkdownViewer 
              content={diffContent.modified} 
              className={styles.markdownContent}
            />
          </ScrollArea>
        </div>
      );
    }
    
    return (
      <DiffEditor
        original={diffContent.original}
        modified={diffContent.modified}
        language="markdown"
        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderSideBySide: selectedView === 'sideBySide',
          readOnly: true,
        }}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#141414] text-foreground">
      <Header
        theme={theme}
        setTheme={setTheme}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />
      <div className="flex-grow flex overflow-hidden">
        <Sidebar 
          mode={mode} 
          setMode={setMode} 
          isPanelVisible={isPanelVisible}
          togglePanel={handlePanelToggle}
        />
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-grow overflow-hidden"
          onLayout={handlePanelResize}
        >
          {/* Left Panel */}
          {isPanelVisible && (
            <>
              <ResizablePanel 
                defaultSize={previousPanelSize} 
                minSize={20} 
                maxSize={40} 
                id="left-panel" 
                order={1}
              >
                {mode === 'git' ? (
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={50} id="commit-tree-panel" order={1}>
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4 bg-[#141414]">
                          <CommitTree
                            selectedFolder={selectedFolder}
                            branchesData={branchesData}
                            setSelectedCommit={setSelectedCommit}
                            setDiffContent={setDiffContent}
                            repoPath={repoPath}
                            handleCommitSelect={handleCommitSelect}
                            selectedCommit={selectedCommit}
                          />
                        </div>
                      </ScrollArea>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50} id="file-tree-panel" order={2}>
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4 bg-[#141414]">
                          <FileTree
                            currentFiles={currentGitFiles.filter(
                              (file) => file.is_dir || file.name === '..' || file.is_git_repo
                            )}
                            handleFolderSelect={handleFolderSelect}
                            mode="git"
                            selectedItem={selectedItem}
                            selectedFolder={selectedFolder}
                            currentPath={currentGitPath}
                          />
                        </div>
                      </ScrollArea>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4 bg-[#141414]">
                      <FileTree
                        currentFiles={currentEditFiles}
                        handleFolderSelect={handleFolderSelect}
                        handleNewFile={handleNewFile}
                        handleNewFolder={handleNewFolder}
                        mode={mode}
                        selectedItem={selectedItem}
                        selectedFolder={selectedFolder}
                        currentPath={currentEditPath}
                      />
                    </div>
                  </ScrollArea>
                )}
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-border" />
            </>
          )}
          {/* Right Panel */}
          <ResizablePanel defaultSize={isPanelVisible ? 75 : 100} minSize={60} id="right-panel" order={isPanelVisible ? 2 : 1}>
            <div className="flex flex-col h-full bg-[#141414]">
              <ResizablePanelGroup direction="vertical" onLayout={handlePanelResize} className="flex-grow">
                <ResizablePanel
                  defaultSize={showConsole ? 70 : 100}
                  minSize={30}
                  id="editor-panel"
                  order={1}
                >
                  <div className="relative h-full">
                    <Editor
                      mode={mode}
                      selectedView={selectedView}
                      setSelectedView={setSelectedView}
                      selectedCommit={selectedCommit}
                      editMode={editMode}
                      setEditMode={setEditMode}
                      lastCommitHash={lastCommitHash}
                      setLastCommitHash={setLastCommitHash}
                      handleRun={handleRun}
                      diffContent={diffContent}
                      editedContent={editedContent}
                      handleContentChange={handleContentChange}
                      theme={theme}
                      editorContainerRef={editorContainerRef}
                      repoPath={repoPath}
                      handleBreadcrumbClick={handleBreadcrumbClick}
                      currentFilePath={currentFilePath}
                      branchHash={branchHash}
                      onBranchHashClick={handleBranchHashClick}
                      branchNotification={branchNotification}
                      handleBranchSelect={handleBranchSelect}
                    />
                  </div>
                </ResizablePanel>
                {/* Console Panel */}
                {showConsole && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={80} id="console-panel" order={2}>
                      <div className="h-full w-full overflow-hidden bg-[#141414]">
                        <DynamicConsole
                          setShowConsole={setShowConsole}
                          onResize={handlePanelResize}
                          currentPath={mode === 'git' ? currentGitPath : currentEditPath}
                          currentFilePath={currentFilePath}
                          onSpecialOutput={handleSpecialOutput}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        setIsOpen={setIsSettingsOpen}
        setGlobalSettings={setGlobalSettings}
      />
    </div>
  );
}
