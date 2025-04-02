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
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrace } from '@/contexts/TraceContext';

type FilterOption = 'all' | 'md' | 'md-ctx';

const getIconClass = (fileName: string, isDir: boolean): string => {
  if (isDir || fileName === '..') {
    return 'icon icon-folder';
  }

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
      return 'icon icon-javascript';
    case 'ts':
    case 'tsx':
      return 'icon icon-typescript';
    case 'html':
    case 'htm':
      return 'icon icon-html';
    case 'css':
      return 'icon icon-css';
    case 'scss':
    case 'sass':
      return 'icon icon-sass';
    case 'vue':
      return 'icon icon-vue';
    case 'json':
      return 'icon icon-json';
    case 'yml':
    case 'yaml':
      return 'icon icon-yml';
    case 'xml':
      return 'icon icon-xml';
    case 'csv':
      return 'icon icon-csv';
    case 'md':
    case 'markdown':
      return 'icon icon-markdown';
    case 'ctx':
      return 'icon icon-markdown ctx-file';
    case 'py':
      return 'icon icon-python';
    case 'rb':
      return 'icon icon-ruby';
    case 'java':
      return 'icon icon-java';
    case 'go':
      return 'icon icon-go';
    case 'rs':
      return 'icon icon-rust';
    case 'swift':
      return 'icon icon-swift';
    case 'kt':
      return 'icon icon-kotlin';
    case 'scala':
      return 'icon icon-scala';
    case 'elm':
      return 'icon icon-elm';
    case 'clj':
    case 'cljs':
      return 'icon icon-clojure';
    case 'lua':
      return 'icon icon-lua';
    case 'jl':
      return 'icon icon-julia';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'icon icon-shell';
    case 'ini':
    case 'conf':
    case 'config':
      return 'icon icon-config';
    case 'editorconfig':
      return 'icon icon-editorconfig';
    case 'dockerfile':
      return 'icon icon-docker';
    case 'gradle':
      return 'icon icon-gradle';
    case 'pom.xml':
      return 'icon icon-maven';
    case 'package.json':
      return 'icon icon-npm';
    case 'yarn.lock':
      return 'icon icon-yarn';
    case 'webpack.config.js':
      return 'icon icon-webpack';
    case 'rollup.config.js':
      return 'icon icon-rollup';
    case 'babel.config.js':
      return 'icon icon-babel';
    case '.eslintrc':
    case '.eslintrc.js':
    case '.eslintrc.json':
      return 'icon icon-eslint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'ico':
      return 'icon icon-image';
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'icon icon-audio';
    case 'mp4':
    case 'avi':
    case 'mov':
      return 'icon icon-video';
    case 'pdf':
      return 'icon icon-pdf';
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return 'icon icon-zip';
    case 'psd':
      return 'icon icon-photoshop';
    case 'ai':
      return 'icon icon-illustrator';
    case 'gitignore':
    case 'gitattributes':
      return 'icon icon-git';
    default:
      return 'icon icon-default';
  }
};

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
  const [selectedView, setSelectedView] = useState<'sideBySide' | 'inline' | 'report' | 'trace' | 'inspector'>('sideBySide');
  const [currentGitPath, setCurrentGitPath] = useState('/');
  const [currentEditPath, setCurrentEditPath] = useState('/');
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
  const [restoredCommitHashes, setRestoredCommitHashes] = useState<string[] | null>(null);
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [isEditing, setIsEditing] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const { setTraceData } = useTrace();

  // Ref to track initial mount completion
  const isMountedRef = useRef(false);

  useEffect(() => {
    console.log('GitDiffViewer mounted');
    // Load initial directory contents
    fetchDirectoryContents('.', false);
    return () => console.log('GitDiffViewer unmounted');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (mode === 'git') {
      console.log('Git mode active, currentGitPath:', currentGitPath);
      if (currentGitPath && currentGitPath !== '/') {
        console.log('Fetching directory contents for git path:', currentGitPath);
        fetchDirectoryContents(currentGitPath, true);
      } else {
        console.log('Fetching root directory in git mode');
        fetchDirectoryContents('.', true);
      }
    } else if (mode === 'edit') {
      if (currentEditPath && currentEditPath !== '/') {
        fetchDirectoryContents(currentEditPath, false);
      }
    }
  }, [currentGitPath, currentEditPath, mode]);

  useEffect(() => {
    if (repoPath) {
      fetchBranchesAndCommits(repoPath);
    }
  }, [repoPath]);
  
  const handleFileSelect = useCallback(async (file: any) => {
    try {
      console.log('[GitDiffViewer] handleFileSelect triggered for:', file.path);
      const response = await fetch(
        `/get_file_content_disk/?path=${encodeURIComponent(file.path)}`
      );
      if (response.ok) {
        const data = await response.text();
        console.log('[GitDiffViewer] Fetched content length:', data.length);
        setEditedContent(data);
        console.log('[GitDiffViewer] setEditedContent called.');
        setSelectedFile(file);
        setCurrentFilePath(file.path);
        setSelectedItem(file.path);
        
        const fileDir = file.path.split('/').slice(0, -1).join('/') || '/';
        console.log(`[GitDiffViewer] Updating ${mode} path to:`, fileDir);
        if (mode === 'git') {
          setCurrentGitPath(fileDir);
        } else {
          setCurrentEditPath(fileDir);
        }
      } else {
        console.error('[GitDiffViewer] Error fetching file content - Response status:', response.statusText);
      }
    } catch (error) {
      console.error('[GitDiffViewer] Error in handleFileSelect catch block:', error);
    }
  }, [mode]);

  const handlePanelResize = useCallback(() => {
    // Handle any logic needed when the panel resizes
  }, []);

  const fetchDirectoryContents = async (pathStr: string, isGitMode: boolean) => {
    try {
      console.log('Fetching directory contents for path:', pathStr, 'isGitMode:', isGitMode);
      const response = await fetch(`/list_directory/?path=${encodeURIComponent(pathStr)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Received directory contents:', data);
        if (isGitMode) {
          console.log('Setting git files:', data);
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
    // Log entry into this function
    console.log(`fetchBranchesAndCommits: Attempting to fetch for repo_path: ${pathStr}`);
    if (!pathStr) {
      console.error("fetchBranchesAndCommits: Called with empty pathStr. Aborting.");
      setBranchesData([]); // Clear data if path is invalid
      return [];
    }
    try {
      const response = await fetch(
        `/branches_and_commits/?repo_path=${encodeURIComponent(pathStr)}`
      );
      // Log the response status
      console.log(`fetchBranchesAndCommits: Response status for ${pathStr}: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        // Log the received data structure (summary)
        console.log(`fetchBranchesAndCommits: Received data for ${pathStr} (summary):`, JSON.stringify(data.map((b: any) => ({id: b.id, text: b.text, hash: b.ctx_commit_hash, children_count: b.children?.length || 0}))));
        // Set the state
        setBranchesData(data);
        return data;
      } else {
        console.error(`fetchBranchesAndCommits: Error fetching branches and commits for ${pathStr}: ${response.statusText}`);
        setBranchesData([]); // Clear data on error
        return [];
      }
    } catch (error) {
      console.error(`fetchBranchesAndCommits: Network or JSON parsing error for ${pathStr}:`, error);
      setBranchesData([]); // Clear data on error
      return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies minimal if setBranchesData is stable

  const handleFolderSelect = useCallback(
    (folder: any) => {
      console.log('Folder selected:', folder);
      if (folder.is_git_repo && mode === 'git') {
        setRepoPath(folder.path);
        setSelectedFolder(folder);
        setCurrentGitPath(folder.path);
        setSelectedItem(folder.path);
        fetchDirectoryContents(folder.path, true);
      } else if (folder.is_dir || folder.name === '..') {
        const newPath = folder.path;
        if (mode === 'git') {
          setCurrentGitPath(newPath);
        } else {
          setCurrentEditPath(newPath);
        }
        setSelectedItem(newPath);
        fetchDirectoryContents(newPath, mode === 'git');
      } else {
        if (mode === 'edit') {
          handleFileSelect(folder);
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
        `/create_file/?path=${encodeURIComponent(currentEditPath)}&name=${encodeURIComponent(
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
        `/create_folder/?path=${encodeURIComponent(
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
          `/get_file_content/?repo_path=${encodeURIComponent(
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
        
        // Store trace data in context if available
        if (node.trc_file && node.trc_commit_hash) {
          try {
            const response = await fetch(
              `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
                repoPath
              )}&file_path=${encodeURIComponent(node.trc_file)}&commit_hash=${node.trc_commit_hash}`
            );
            
            if (response.ok) {
              const content = await response.text();
              setTraceData({
                [node.trc_commit_hash]: {
                  content,
                  commitHash: node.trc_commit_hash,
                  filePath: node.trc_file
                }
              });
            }
          } catch (error) {
            console.error('Error fetching trace file:', error);
          }
        }
      } else {
        setDiffContent({
          original: '',
          modified: '',
        });
      }
    },
    [fetchDiffContent, repoPath, setTraceData]
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

  // Add useEffect to restore state from localStorage on mount
  useEffect(() => {
    const restoreState = async () => {
      const savedStateStr = localStorage.getItem('fileTreeState');
      if (savedStateStr) {
        try {
          const savedState = JSON.parse(savedStateStr);
          console.log('--- State Restoration START ---');
          console.log('Restoring saved state:', savedState);

          // Restore core state variables directly
          const restoredMode = savedState.mode || 'edit';
          const restoredGitPath = savedState.currentGitPath || '/';
          const restoredEditPath = savedState.currentEditPath || '/';
          const restoredSelectedItem = savedState.selectedItem;
          const restoredSelectedFolder = savedState.selectedFolder;
          const restoredRepoPath = savedState.repoPath;
          const savedCommitHashes = savedState.selectedCommitHashes;

          // --- Apply restored state ---
          setMode(restoredMode);
          setCurrentGitPath(restoredGitPath);
          setCurrentEditPath(restoredEditPath);
          setSelectedFolder(restoredSelectedFolder);
          setSelectedItem(restoredSelectedItem);
          setRepoPath(restoredRepoPath || '');
          if (savedCommitHashes && savedCommitHashes.length > 0) {
            setRestoredCommitHashes(savedCommitHashes);
          }
          console.log('Applied base restored state:', { mode: restoredMode, currentGitPath: restoredGitPath, currentEditPath: restoredEditPath, selectedItem: restoredSelectedItem, repoPath: restoredRepoPath });

          // --- Determine Initial Action based on restored state ---
          let pathForDirFetch: string | null = null;
          let isGitFetch = restoredMode === 'git';
          let fileToLoadLater: any | null = null;

          if (restoredMode === 'git') {
              if (restoredSelectedFolder?.is_git_repo) {
                  pathForDirFetch = restoredSelectedFolder.path;
                  console.log(`Git Restore: Selected repo found. Setting dir fetch path to: ${pathForDirFetch}`);
                  if (pathForDirFetch) {
                      console.log(`Git Restore: Triggering fetchBranchesAndCommits for: ${pathForDirFetch}`);
                      fetchBranchesAndCommits(pathForDirFetch);
                  } else {
                      console.error("Git Restore: Selected repo folder path is invalid.");
                      pathForDirFetch = '.';
                  }
              } else if (restoredSelectedItem && restoredSelectedItem.endsWith('/')) {
                  pathForDirFetch = restoredSelectedItem;
                  console.log(`Git Restore: Selected directory found. Setting dir fetch path to: ${pathForDirFetch}`);
              } else {
                  pathForDirFetch = restoredGitPath !== '/' ? restoredGitPath : '.';
                  console.log(`Git Restore: No specific selection/repo. Using path: ${pathForDirFetch}`);
              }
          } else {
              if (restoredSelectedItem) {
                  if (restoredSelectedItem.endsWith('/') || restoredSelectedItem === restoredSelectedFolder?.path) {
                      pathForDirFetch = restoredSelectedItem;
                      console.log(`Edit Restore: Selected directory found. Setting dir fetch path to: ${pathForDirFetch}`);
                  } else {
                      console.log(`Edit Restore: Selected file found: ${restoredSelectedItem}`);
                      pathForDirFetch = restoredSelectedItem.split('/').slice(0, -1).join('/') || '/';
                      fileToLoadLater = savedState.selectedFile || {
                          path: restoredSelectedItem,
                          name: restoredSelectedItem.split('/').pop(),
                          is_dir: false
                      };
                      console.log(`Edit Restore: Prepared file to load later:`, fileToLoadLater);
                  }
              } else {
                  pathForDirFetch = restoredEditPath !== '/' ? restoredEditPath : '.';
                  console.log(`Edit Restore: No specific selection. Using path: ${pathForDirFetch}`);
              }
          }

          // --- Perform Initial Directory Fetch ---
          const finalPathForDirFetch = pathForDirFetch === '/' ? '.' : pathForDirFetch;
          if (finalPathForDirFetch) {
              console.log(`Performing initial directory fetch for: ${finalPathForDirFetch}, isGitMode: ${isGitFetch}`);
              await fetchDirectoryContents(finalPathForDirFetch, isGitFetch);
              
              // Only attempt to load file content if we're in edit mode and have a file to load
              if (restoredMode === 'edit') {
                  if (fileToLoadLater) {
                      console.log(`Edit Restore: Loading file content for: ${fileToLoadLater.path}`);
                      // Add a small delay to ensure state updates are processed
                      setTimeout(() => {
                          handleFileSelect(fileToLoadLater);
                      }, 100);
                  } else if (restoredSelectedItem && !restoredSelectedItem.endsWith('/')) {
                      console.log(`Edit Restore: Loading content for restored selected item: ${restoredSelectedItem}`);
                      const fileToLoad = {
                          path: restoredSelectedItem,
                          name: restoredSelectedItem.split('/').pop(),
                          is_dir: false
                      };
                      // Add a small delay to ensure state updates are processed
                      setTimeout(() => {
                          handleFileSelect(fileToLoad);
                      }, 100);
                  }
              }
          } else {
              console.error("Restoration logic failed to determine a path for initial directory fetch.");
          }

          console.log('--- State Restoration END (Sync part) ---');

        } catch (error) {
          console.error('Error restoring file tree state:', error);
          fetchDirectoryContents('.', false);
        }
      } else {
        console.log('No saved state found, fetching root directory.');
        fetchDirectoryContents('.', false);
      }
    };

    restoreState();
  }, []); // Empty dependency array ensures this runs only once on mount

  // New useEffect to handle restoring commit selection after branchesData is loaded
  useEffect(() => {
    // Add check for branchesData being non-empty array
    if (mode === 'git' && restoredCommitHashes && restoredCommitHashes.length > 0 && Array.isArray(branchesData) && branchesData.length > 0) {
      console.log('--- Commit Restoration Effect Triggered ---');
      console.log('Restoring Hashes:', restoredCommitHashes);
      // Log summary of branch data structure for context
      console.log('Branches Data Available (Summary):', JSON.stringify(branchesData.map(b => ({id: b.id, text: b.text, hash: b.ctx_commit_hash, children_count: b.children?.length || 0}))));

      // Updated findCommitPath with more logging
      const findCommitPath = (nodes: any[], hashes: string[], currentPath: any[] = []): any[] | null => {
        // Log entry into the function for this level
        console.log(`findCommitPath: Searching nodes (level ${currentPath.length}) for hash: ${hashes[0]}. Current path hashes: [${currentPath.map(n=>n.ctx_commit_hash).join(', ')}]`);

        if (hashes.length === 0) {
           // This case might be hit if logic calls it with empty hashes, return current path.
           console.log("findCommitPath: Called with empty hashes. Returning current path.");
           return currentPath;
        }

        const targetHash = hashes[0];
        for (const node of nodes) {
          // Log node being checked
          console.log(`  Checking node: "${node.text}" (Hash: ${node.ctx_commit_hash || 'N/A'}) against target: ${targetHash}`);

          // Check if the current node matches the target hash for this level
          if (node.ctx_commit_hash === targetHash) {
            console.log(`    ✅ Match found for hash: ${targetHash} at node "${node.text}"`);
            const newPath = [...currentPath, node]; // Add the matched node to the path
            const remainingHashes = hashes.slice(1); // Get the hashes for the next levels

            if (remainingHashes.length === 0) {
              // This was the last hash in the list, we found the complete path
              console.log("    🏁 Last hash matched. Returning full reconstructed path:", newPath.map(n=>`"${n.text}"`).join(' -> '));
              return newPath;
            } else if (node.children && node.children.length > 0) {
              // Match found, but more hashes remain. Continue searching in this node's children
              console.log(`     Mapped "${node.text}". Continuing search in ${node.children.length} children for next hash: ${remainingHashes[0]}`);
              const result = findCommitPath(node.children, remainingHashes, newPath); // Recursive call
              if (result) return result; // Found the full path down this branch
              console.log(`    Search in children of "${node.text}" did not yield full path for remaining hashes.`);
            } else {
               // Matched the hash, but there are remaining hashes and no children to search
               console.log(`    ⚠️ Matched hash "${targetHash}" at "${node.text}", but no children found to search for remaining hashes: [${remainingHashes.join(', ')}]`);
               // Return null as we cannot complete the path
               return null;
            }
          }
          // If the current node *doesn't* match the target hash,
          // but it's a potential parent node (e.g., a branch root without a hash itself, or just iterating through siblings)
          // check if it has children and recursively search them using the *same* target hash for this level.
          else if (node.children && node.children.length > 0) {
              console.log(`    Node "${node.text}" didn't match target ${targetHash}. Checking its ${node.children.length} children.`);
              // Pass the original `hashes` and `currentPath` - we haven't matched this level yet.
              const resultInChildren = findCommitPath(node.children, hashes, currentPath);
              if (resultInChildren) return resultInChildren; // Path found deeper
          }
        }
        // Target hash not found among these nodes or their children
        console.log(`  ❌ Hash ${targetHash} not found in this set of nodes (level ${currentPath.length}).`);
        return null;
      };


      let reconstructedBreadcrumb: any[] | null = null;
      console.log("Starting commit path search in root branchesData...");
      // Start search from the top level of branchesData, looking for the first hash
      reconstructedBreadcrumb = findCommitPath(branchesData, restoredCommitHashes, []);

      if (reconstructedBreadcrumb) {
        console.log('--- Commit Restoration SUCCESS ---');
        // Log the structure of the found breadcrumb for verification
        console.log('Reconstructed commit breadcrumb:', reconstructedBreadcrumb.map(c => ({text: c.text, hash: c.ctx_commit_hash})));
        setSelectedCommit(reconstructedBreadcrumb); // Update the state

        const leafCommit = reconstructedBreadcrumb[reconstructedBreadcrumb.length - 1];
        // Ensure leafCommit and repoPath exist before fetching diff
        if (leafCommit && leafCommit.ctx_file && leafCommit.md_file && repoPath) {
           console.log('Fetching diff for restored leaf commit:', leafCommit.text);
           fetchDiffContent(repoPath, leafCommit.md_file, leafCommit.ctx_file, leafCommit.md_commit_hash, leafCommit.ctx_commit_hash);
        } else {
            // Log details if diff fetch cannot proceed
            console.log("Leaf commit data insufficient or repoPath missing for diff fetching.", {leafCommitExists: !!leafCommit, hasCtxFile: !!leafCommit?.ctx_file, hasMdFile: !!leafCommit?.md_file, repoPathExists: !!repoPath});
        }
      } else {
        console.warn('--- Commit Restoration FAILED ---');
        console.warn('Could not reconstruct commit path for hashes:', restoredCommitHashes);
        // Consider clearing the commit selection if restoration fails to avoid inconsistent state
        // setSelectedCommit([]);
      }

      // Clear the restored hashes flag regardless of success/failure
      console.log('Clearing restoredCommitHashes flag.');
      setRestoredCommitHashes(null);
      console.log('--- Commit Restoration Effect Finished ---');
    } else {
       // Log why the effect didn't run (useful for debugging race conditions or missing data)
       if (mode === 'git' && restoredCommitHashes && restoredCommitHashes.length > 0) {
         if (!Array.isArray(branchesData)) console.log("Commit restore skipped: branchesData is not an array yet.", branchesData);
         else if (branchesData.length === 0) console.log("Commit restore skipped: branchesData is empty.");
       } else if (mode !== 'git') {
           // console.log("Commit restore skipped: Not in git mode."); // Less verbose logging
       } else if (!restoredCommitHashes || restoredCommitHashes.length === 0) {
           // console.log("Commit restore skipped: No restored commit hashes."); // Less verbose logging
       }
    }
  // Dependencies: run when branchesData is loaded, or when restored hashes are set, or if mode/repo changes while hashes are pending.
  }, [branchesData, restoredCommitHashes, mode, repoPath, fetchDiffContent]);

  // Update localStorage whenever relevant state changes, BUT skip the very first run after mount
  useEffect(() => {
    // Prevent saving state during the very first render cycle after mount
    if (!isMountedRef.current) {
      console.log("State saving skipped on initial mount.");
      isMountedRef.current = true; // Mark initial mount as complete
      return; // Don't save yet
    }

    // Proceed with saving state on subsequent updates
    const stateToSave = {
      currentGitPath,
      currentEditPath,
      selectedItem,
      mode,
      selectedFolder: selectedFolder ? {
        path: selectedFolder.path,
        is_git_repo: selectedFolder.is_git_repo
      } : null,
      repoPath,
      selectedFile: selectedFile ? {
        path: selectedFile.path,
        name: selectedFile.name,
        is_dir: selectedFile.is_dir
      } : null,
      // Save commit breadcrumb hashes (if any)
      selectedCommitHashes: selectedCommit ? selectedCommit.map(c => c.ctx_commit_hash).filter(Boolean) : [],
    };
    console.log('Saving state:', stateToSave);
    localStorage.setItem('fileTreeState', JSON.stringify(stateToSave));
  // Dependencies: Ensure all relevant state pieces are included
  }, [currentGitPath, currentEditPath, selectedItem, mode, selectedFolder, repoPath, selectedFile, selectedCommit]); // Dependencies remain the same

  // Add an effect to trigger file load when switching to edit mode if a file is already selected
  useEffect(() => {
    if (mode === 'edit' && selectedItem && selectedFile && !editedContent) {
      console.log('Switching to edit mode: triggering file load for', selectedFile.path);
      handleFileSelect(selectedFile);
    }
  }, [mode, selectedItem, selectedFile, editedContent, handleFileSelect]);

  const handleFileUpdate = useCallback((newName?: string) => {
    // Refresh the current directory contents
    fetchDirectoryContents(currentEditPath, false).then(() => {
      // If we have a selected file and a new name, update its path to match the new name
      if (selectedFile && newName) {
        const newFilePath = `${currentEditPath}/${newName}`;
        setCurrentFilePath(newFilePath);
        setSelectedFile({ ...selectedFile, path: newFilePath, name: newName });
        setSelectedItem(newFilePath);
      }
    });
  }, [currentEditPath, selectedFile, fetchDirectoryContents]);

  const startNewFile = () => {
    // Trigger the edit box for a new file in the FileTree
    if (mode === 'edit') {
      setIsEditing('file');
      setNewItemName('');
    }
  };

  const startNewFolder = () => {
    // Trigger the edit box for a new folder in the FileTree
    if (mode === 'edit') {
      setIsEditing('folder');
      setNewItemName('');
    }
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
          className="py-2"
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
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center bg-[#141414] px-8 py-2">
                    <h3 className="font-semibold flex items-center group relative">
                      <i className={getIconClass('folder', true)} />
                      <span className="cursor-default" title={mode === 'git' ? currentGitPath : currentEditPath}>
                        {(mode === 'git' ? currentGitPath : currentEditPath) === '/' ? '/' : (mode === 'git' ? currentGitPath : currentEditPath).split('/').pop() || '/'}
                      </span>
                    </h3>
                    {mode === 'edit' && (
                      <div className="space-x-1 flex items-center">
                        <Select value={filterOption} onValueChange={(value: FilterOption) => setFilterOption(value)}>
                          <SelectTrigger className="w-8 h-8 p-0 border-0 hover:border-0 focus:border-0 focus:ring-0 [&>svg:not(.lucide)]:hidden flex items-center justify-center">
                            <Filter className={cn(
                              "h-4 w-4",
                              filterOption !== 'all' && "fill-current"
                            )} />
                            <span className="sr-only">Filter files</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show all</SelectItem>
                            <SelectItem value="md">Show .md</SelectItem>
                            <SelectItem value="md-ctx">Show .md & .ctx</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={startNewFile}>
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">New File</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={startNewFolder}>
                          <FolderPlus className="h-4 w-4" />
                          <span className="sr-only">New Folder</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
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
                                currentFiles={currentGitFiles}
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
                        <div className="px-4 pb-4 space-y-4 bg-[#141414]">
                          <FileTree
                            currentFiles={currentEditFiles}
                            handleFolderSelect={handleFolderSelect}
                            handleNewFile={handleNewFile}
                            handleNewFolder={handleNewFolder}
                            mode={mode}
                            selectedItem={selectedItem}
                            selectedFolder={selectedFolder}
                            currentPath={currentEditPath}
                            onFileUpdate={handleFileUpdate}
                            isEditing={isEditing}
                            setIsEditing={setIsEditing}
                            newItemName={newItemName}
                            setNewItemName={setNewItemName}
                            filterOption={filterOption}
                            setFilterOption={setFilterOption}
                          />
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
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
                      onSave={async () => {
                        // The save functionality is now handled in the Editor component
                        return Promise.resolve();
                      }}
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
