// Tools & MCPs Marketplace for Fractalic Tools integration
// Replaces MCPMarketplace with fractalic-tools repository integration

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wrench, Filter, RotateCw, ChevronDown, ChevronRight, X, AlertCircle, Download, Folder, CheckCircle2, Package, Info, AlertTriangle, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import MarkdownViewer from './MarkdownViewer';

// Cache for GitHub API responses (5 minutes TTL)
// Using localStorage for persistence across page refreshes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'fractalic-tools-cache';

// Helper functions for persistent cache
const getCachedData = (url: string): { data: any; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const urlCache = cacheData[url];
    
    if (!urlCache) return null;
    
    // Check if cache is still valid
    if (Date.now() - urlCache.timestamp > CACHE_TTL) {
      // Remove expired cache entry
      delete cacheData[url];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      return null;
    }
    
    return urlCache;
  } catch (error) {
    console.warn('Failed to read from cache:', error);
    return null;
  }
};

const setCachedData = (url: string, data: any): void => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheData = cached ? JSON.parse(cached) : {};
    
    cacheData[url] = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to write to cache:', error);
  }
};

// Component props interface
interface ToolsMarketplaceProps {
  currentFilePath?: string;
}

// Tool interface based on Integration.md specifications
interface FractalicTool {
  name: string;
  path: string;
  description: string;
  category: string;
  categoryIcon: string;
  githubRawUrl: string;
  id: string;
}

interface ToolCategory {
  name: string;
  icon: string;
  count: number;
  tools: FractalicTool[];
}

// Installation status types
type InstallationStatus = 'not-installed' | 'installed-correct' | 'installed-wrong-location';
type SelectionState = 'none' | 'partial' | 'all';

// Tree structure for hierarchical display
interface TreeNode {
  id: string;
  name: string;
  type: 'category' | 'folder' | 'tool';
  path: string;
  icon?: string;
  description?: string;
  githubRawUrl?: string;
  readmeUrl?: string; // For folders: URL to their README.md
  children?: TreeNode[];
  selected: boolean;
  folderPath?: string[]; // For tools: array of folder names in the path
  // New fields for advanced functionality
  installationStatus?: InstallationStatus; // For tools: installation status
  selectionState?: SelectionState; // For folders: aggregated selection state
  selectedCount?: number; // For folders: number of selected tools in subtree
  totalCount?: number; // For folders: total number of tools in subtree
  localPath?: string; // For tools: actual file system location if found
}

// Fetch repository structure from GitHub API
const fetchRepositoryStructure = async (): Promise<any[]> => {
  const url = 'https://api.github.com/repos/fractalic-ai/fractalic-tools/git/trees/main?recursive=1';
  
  // Check persistent cache first
  const cached = getCachedData(url);
  if (cached) {
    console.log('[ToolsMarketplace] Using cached repository structure (persistent)');
    return cached.data;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    console.log('[ToolsMarketplace] Fetching repository structure from GitHub API');
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Provide more detailed error information
      const errorText = await response.text().catch(() => 'Unknown error');
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      
      if (response.status === 403 && rateLimitRemaining === '0') {
        const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() : 'unknown';
        throw new Error(`GitHub API rate limit exceeded. Limit resets at ${resetTime}. Try again later.`);
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    const tree = data.tree || [];
    
    // Cache the result persistently
    setCachedData(url, tree);
    console.log('[ToolsMarketplace] Repository structure fetched and cached (persistent)');
    
    return tree;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch repository structure');
  }
};

// Fetch README for category descriptions
const fetchReadmeForDescriptions = async (): Promise<Map<string, string>> => {
  const descriptions = new Map<string, string>();
  
  try {
    const url = 'https://raw.githubusercontent.com/fractalic-ai/fractalic-tools/main/README.md';
    const response = await fetch(url, {
      headers: { 'Accept': 'text/plain' }
    });
    
    if (!response.ok) return descriptions;
    
    const readme = await response.text();
    const lines = readme.split('\n');
    
    let currentCategory = '';
    let currentDescription = '';
    let collectingDescription = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Match category headers: ### 🔧 Core (2 tools)
      const categoryMatch = trimmed.match(/^###\s*([^\s]+)\s*([^(]+)\s*\(/);
      if (categoryMatch) {
        // Save previous category if exists
        if (currentCategory && currentDescription) {
          descriptions.set(currentCategory.toLowerCase(), currentDescription.trim());
        }
        
        currentCategory = categoryMatch[2].trim();
        currentDescription = '';
        collectingDescription = true;
        continue;
      }
      
      // Stop collecting when we hit tools list or next section
      if (collectingDescription && (trimmed.startsWith('- **') || trimmed.startsWith('##') || trimmed.startsWith('###'))) {
        if (trimmed.startsWith('- **')) {
          collectingDescription = false;
        }
        continue;
      }
      
      // Collect description lines
      if (collectingDescription && trimmed && !trimmed.startsWith('#')) {
        currentDescription += (currentDescription ? ' ' : '') + trimmed;
      }
    }
    
    // Save last category
    if (currentCategory && currentDescription) {
      descriptions.set(currentCategory.toLowerCase(), currentDescription.trim());
    }
    
  } catch (error) {
    console.warn('Failed to fetch README descriptions:', error);
  }
  
  return descriptions;
};

// Installation detection utilities
const checkToolInstallation = async (toolPath: string): Promise<{ status: InstallationStatus; actualPath?: string }> => {
  try {
    // First check if the tool exists at the expected location: ./tools/{toolPath}
    const expectedPath = `tools/${toolPath}`;
    
    // Use the existing save-tool API to check if file exists
    const checkResponse = await fetch('/api/check-tool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expectedPath,
        toolName: toolPath.split('/').pop()?.replace('.py', '') || ''
      })
    });
    
    if (checkResponse.ok) {
      const result = await checkResponse.json();
      return {
        status: result.status as InstallationStatus,
        actualPath: result.actualPath
      };
    }
    
    // Fallback: assume not installed if API call fails
    return { status: 'not-installed' };
  } catch (error) {
    console.warn('Failed to check tool installation:', error);
    return { status: 'not-installed' };
  }
};

// Get installation status description for tooltips
const getInstallationDescription = (status: InstallationStatus, expectedPath: string, actualPath?: string): string => {
  switch (status) {
    case 'not-installed':
      return 'Tool not found in local directory';
    case 'installed-correct':
      return `Tool installed at: ./tools/${expectedPath}`;
    case 'installed-wrong-location':
      return `Tool found at: ${actualPath} (expected: ./tools/${expectedPath})`;
    default:
      return 'Unknown installation status';
  }
};

// Calculate folder selection state based on children
const calculateFolderSelectionState = (folder: TreeNode): SelectionState => {
  if (!folder.children || folder.children.length === 0) {
    return 'none';
  }
  
  const tools = folder.children.filter(child => child.type === 'tool');
  const subfolders = folder.children.filter(child => child.type === 'folder');
  
  let selectedCount = 0;
  let totalCount = 0;
  
  // Count direct tool selections
  tools.forEach(tool => {
    totalCount++;
    if (tool.selected) selectedCount++;
  });
  
  // Count subfolder selections recursively
  subfolders.forEach(subfolder => {
    const subState = calculateFolderSelectionState(subfolder);
    const subTotal = subfolder.totalCount || 0;
    const subSelected = subfolder.selectedCount || 0;
    
    totalCount += subTotal;
    selectedCount += subSelected;
  });
  
  // Update folder counts
  folder.totalCount = totalCount;
  folder.selectedCount = selectedCount;
  
  // Determine selection state
  if (selectedCount === 0) {
    return 'none';
  } else if (selectedCount === totalCount) {
    return 'all';
  } else {
    return 'partial';
  }
};

// Update parent selection states after a change
const updateParentSelectionStates = (nodes: TreeNode[]): TreeNode[] => {
  return nodes.map(node => {
    if (node.type === 'folder' && node.children) {
      // First update children recursively
      const updatedChildren = updateParentSelectionStates(node.children);
      
      // Then calculate this folder's state
      const updatedNode = { ...node, children: updatedChildren };
      updatedNode.selectionState = calculateFolderSelectionState(updatedNode);
      
      return updatedNode;
    }
    return node;
  });
};

// Toggle folder selection (select/deselect all tools in folder)
const toggleFolderSelection = (nodes: TreeNode[], folderId: string, selectAll: boolean): TreeNode[] => {
  return nodes.map(node => {
    if (node.id === folderId && node.type === 'folder') {
      // Toggle all children in this folder
      const updatedChildren = node.children ? toggleAllChildrenSelection(node.children, selectAll) : [];
      return { ...node, children: updatedChildren };
    } else if (node.children) {
      // Recursively update children
      return { ...node, children: toggleFolderSelection(node.children, folderId, selectAll) };
    }
    return node;
  });
};

// Helper to toggle all children selection
const toggleAllChildrenSelection = (children: TreeNode[], selectAll: boolean): TreeNode[] => {
  return children.map(child => {
    if (child.type === 'tool') {
      return { ...child, selected: selectAll };
    } else if (child.type === 'folder' && child.children) {
      return { ...child, children: toggleAllChildrenSelection(child.children, selectAll) };
    }
    return child;
  });
};

// Build fully dynamic tree structure from GitHub repository structure
const buildTreeFromRepo = (repoFiles: any[]): TreeNode[] => {
  console.log('Building dynamic tree from repository files:', repoFiles.length);
  
  // Filter for Python files and README files
  const pythonFiles = repoFiles.filter((file: any) => 
    file.type === 'blob' && 
    file.path.endsWith('.py') &&
    !file.path.includes('__pycache__') &&
    !file.path.includes('.git')
  );
  
  const readmeFiles = repoFiles.filter((file: any) =>
    file.type === 'blob' &&
    file.path.toLowerCase().includes('readme.md')
  );
  
  console.log('Found Python files:', pythonFiles.length, 'README files:', readmeFiles.length);
  
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();
  
  // Create folder structure dynamically based on actual file paths
  pythonFiles.forEach((file: any) => {
    const pathParts = file.path.split('/');
    let currentPath = '';
    let currentParent: TreeNode[] = rootNodes;
    
    // Create all intermediate folders dynamically
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      currentPath += (currentPath ? '/' : '') + folderName;
      
      let folderNode = nodeMap.get(currentPath);
      if (!folderNode) {
        // Find corresponding README for this folder
        const folderReadme = readmeFiles.find(readme => {
          const readmePath = readme.path.toLowerCase();
          const folderPath = currentPath.toLowerCase();
          return readmePath === `${folderPath}/readme.md` || 
                 readmePath === `${folderPath}/readme.md` ||
                 (folderPath === folderName.toLowerCase() && readmePath === 'readme.md');
        });
        
        folderNode = {
          id: `folder-${currentPath.replace(/[^a-z0-9]/g, '-')}`,
          name: folderName,
          type: 'folder',
          path: currentPath,
          description: `Folder: ${folderName}`,
          readmeUrl: folderReadme ? `https://raw.githubusercontent.com/fractalic-ai/fractalic-tools/main/${folderReadme.path}` : undefined,
          children: [],
          selected: false
        };
        
        nodeMap.set(currentPath, folderNode);
        currentParent.push(folderNode);
      }
      
      currentParent = folderNode.children!;
    }
    
    // Add the Python file as a tool
    const fileName = pathParts[pathParts.length - 1];
    const toolName = fileName.replace('.py', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const toolNode: TreeNode = {
      id: `tool-${file.path.replace(/[^a-z0-9]/g, '-')}`,
      name: toolName,
      type: 'tool',
      path: file.path,
      description: `Python tool: ${fileName}`,
      githubRawUrl: `https://raw.githubusercontent.com/fractalic-ai/fractalic-tools/main/${file.path}`,
      selected: false,
      installationStatus: 'not-installed' // Will be updated after build
    };
    
    currentParent.push(toolNode);
  });
  
  // Sort folders and tools alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'tool') return -1;
      if (a.type === 'tool' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children);
      }
    });
  };
  
  sortNodes(rootNodes);
  
  console.log('Dynamic tree building complete. Root nodes:', rootNodes.length);
  return rootNodes;
};

// Extract all tools from tree structure with folder path information
const extractAllTools = (nodes: TreeNode[], parentPath: string[] = []): TreeNode[] => {
  const tools: TreeNode[] = [];
  
  nodes.forEach(node => {
    if (node.type === 'tool') {
      // Add folder path information to the tool
      const toolWithPath = {
        ...node,
        folderPath: [...parentPath]
      };
      tools.push(toolWithPath);
    } else if (node.type === 'folder' && node.children) {
      // Recursively extract tools from subfolders
      const childTools = extractAllTools(node.children, [...parentPath, node.name]);
      tools.push(...childTools);
    }
  });
  
  return tools;
};

// Highlight search matches
const highlightMatch = (text: string, terms: string[]): React.ReactNode => {
  if (!terms.length || terms[0] === '*') return text;
  
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  let result: React.ReactNode[] = [];
  let remainingText = text;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    let matchFound = false;
    let earliestMatchIndex = remainingText.length;
    let matchedTerm = '';
    let matchedLength = 0;

    for (const term of sortedTerms) {
      if (!term) continue;
      const lowerText = remainingText.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const matchIndex = lowerText.indexOf(lowerTerm);
      
      if (matchIndex !== -1 && matchIndex < earliestMatchIndex) {
        earliestMatchIndex = matchIndex;
        matchedTerm = remainingText.substr(matchIndex, term.length);
        matchedLength = term.length;
        matchFound = true;
      }
    }

    if (matchFound) {
      if (earliestMatchIndex > 0) {
        result.push(remainingText.substring(0, earliestMatchIndex));
      }
      
      result.push(
        <mark key={keyIndex++} className="bg-yellow-300 text-black rounded px-0.5">
          {matchedTerm}
        </mark>
      );
      
      remainingText = remainingText.substring(earliestMatchIndex + matchedLength);
    } else {
      result.push(remainingText);
      break;
    }
  }

  return result.length > 1 ? result : text;
};

// Installation Status Badge Component
const InstallationStatusBadge: React.FC<{
  status: InstallationStatus;
  toolPath: string;
  actualPath?: string;
}> = ({ status, toolPath, actualPath }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'installed-correct':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Installed',
          className: 'bg-green-500/20 text-green-400 border-green-500/30',
          tooltip: `Tool installed at: ./tools/${toolPath}`
        };
      case 'installed-wrong-location':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Installed',
          className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          tooltip: `Tool found at: ${actualPath} (expected: ./tools/${toolPath})`
        };
      default:
        return {
          icon: null,
          text: 'Not Installed',
          className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          tooltip: 'Tool not found in local directory'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.className} cursor-help`}>
            {config.icon}
            <span>{config.text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ToolsMarketplace: React.FC<ToolsMarketplaceProps> = ({ currentFilePath }) => {
  const [search, setSearch] = useState("");
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [allTools, setAllTools] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<FractalicTool | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null);
  const [folderReadme, setFolderReadme] = useState<string>('');
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string>('');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [toolToInstall, setToolToInstall] = useState<FractalicTool | null>(null);
  const [targetDirectory, setTargetDirectory] = useState<string>('');
  const [showBatchInstallDialog, setShowBatchInstallDialog] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const { toast } = useToast();

  // Clean up expired cache entries on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        let hasExpired = false;
        
        Object.keys(cacheData).forEach(url => {
          if (now - cacheData[url].timestamp > CACHE_TTL) {
            delete cacheData[url];
            hasExpired = true;
          }
        });
        
        if (hasExpired) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
      }
    } catch (error) {
      console.warn('Failed to clean cache:', error);
    }
  }, []);

  // Debug effect to track dialog state changes
  useEffect(() => {
    console.log('[ToolsMarketplace] showBatchInstallDialog changed to:', showBatchInstallDialog);
  }, [showBatchInstallDialog]);

  // Load tools from fractalic-tools repository and check installation status
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUsingCachedData(false);
    
    (async () => {
      try {
        // Check if we have cached data before making API call
        const url = 'https://api.github.com/repos/fractalic-ai/fractalic-tools/git/trees/main?recursive=1';
        const cached = getCachedData(url);
        if (cached) {
          setUsingCachedData(true);
        }
        
        // Fetch repository structure
        const repoStructure = await fetchRepositoryStructure();
        const parsedTree = buildTreeFromRepo(repoStructure);
        
        if (!cancelled) {
          // Check installation status for all tools
          const updatedTree = await updateInstallationStatus(parsedTree);
          
          // Calculate folder selection states
          const treeWithSelectionStates = updateParentSelectionStates(updatedTree);
          
          setTreeNodes(treeWithSelectionStates);
          
          // Extract all tools from the tree structure
          const tools = extractAllTools(treeWithSelectionStates);
          setAllTools(tools);
          
          // Expand all groups by default
          const groupPaths = new Set<string>();
          tools.forEach(tool => {
            const groupKey = tool.folderPath?.join('/') || 'root';
            groupPaths.add(groupKey);
          });
          setExpandedGroups(groupPaths);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load tools';
          setError(errorMessage);
          console.error('Failed to load fractalic-tools:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, []);

  // Update installation status for all tools in the tree
  const updateInstallationStatus = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
    const updateNode = async (node: TreeNode): Promise<TreeNode> => {
      if (node.type === 'tool') {
        try {
          const { status, actualPath } = await checkToolInstallation(node.path);
          return {
            ...node,
            installationStatus: status,
            localPath: actualPath
          };
        } catch (error) {
          console.warn('Failed to check installation for', node.name, error);
          return {
            ...node,
            installationStatus: 'not-installed'
          };
        }
      } else if (node.children) {
        const updatedChildren = await Promise.all(node.children.map(updateNode));
        return { ...node, children: updatedChildren };
      }
      return node;
    };
    
    return Promise.all(nodes.map(updateNode));
  };

  // Add filter
  const addFilter = useCallback((folder: string) => {
    setActiveFilters(prev => {
      if (!prev.includes(folder)) {
        return [...prev, folder];
      }
      return prev;
    });
  }, []);

  // Remove filter
  const removeFilter = useCallback((folder: string) => {
    setActiveFilters(prev => prev.filter(f => f !== folder));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // Fetch and display folder README
  const fetchFolderReadme = useCallback(async (folder: TreeNode) => {
    if (!folder.readmeUrl) {
      setSelectedFolder(folder);
      setFolderReadme(`# ${folder.name}\n\nNo README.md found for this folder.`);
      return;
    }

    setLoadingReadme(true);
    setSelectedFolder(folder);
    setSelectedTool(null); // Clear tool selection when folder is selected
    
    try {
      const response = await fetch(folder.readmeUrl);
      if (!response.ok) throw new Error(`Failed to fetch README: ${response.statusText}`);
      const readmeContent = await response.text();
      setFolderReadme(readmeContent);
    } catch (error) {
      console.error('Failed to fetch folder README:', error);
      setFolderReadme(`# ${folder.name}\n\nFailed to load README.md for this folder.`);
    } finally {
      setLoadingReadme(false);
    }
  }, []);

  // Handle folder checkbox clicks
  const handleFolderToggle = useCallback((folderId: string) => {
    setTreeNodes(prev => {
      const targetFolder = findNodeById(prev, folderId);
      if (targetFolder && targetFolder.type === 'folder') {
        // Determine new selection state based on current state
        const newSelectAll = targetFolder.selectionState !== 'all';
        
        // Toggle all tools in this folder
        const updatedNodes = toggleFolderSelection(prev, folderId, newSelectAll);
        
        // Recalculate all selection states
        return updateParentSelectionStates(updatedNodes);
      }
      return prev;
    });
  }, []);

  // Toggle individual tool selection
  const toggleNodeSelection = useCallback((nodeId: string) => {
    setTreeNodes(prev => {
      const targetNode = findNodeById(prev, nodeId);
      if (targetNode && targetNode.type === 'tool') {
        const updatedNodes = prev.map(node => updateToolSelection(node, nodeId, !targetNode.selected));
        return updateParentSelectionStates(updatedNodes);
      }
      return prev;
    });
  }, []);

  // Helper to update tool selection recursively
  const updateToolSelection = (node: TreeNode, targetId: string, selected: boolean): TreeNode => {
    if (node.id === targetId && node.type === 'tool') {
      return { ...node, selected };
    } else if (node.children) {
      return { ...node, children: node.children.map(child => updateToolSelection(child, targetId, selected)) };
    }
    return node;
  };

  // Find node by ID
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Get all selected tools
  const getSelectedTools = useCallback(() => {
    const selectedTools: FractalicTool[] = [];
    
    const collectTools = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'tool' && node.selected && node.githubRawUrl) {
          selectedTools.push({
            id: node.id,
            name: node.name,
            path: node.path,
            description: node.description || '',
            category: '', // Will be filled by parent context
            categoryIcon: '',
            githubRawUrl: node.githubRawUrl
          });
        }
        if (node.children) {
          collectTools(node.children);
        }
      });
    };
    
    collectTools(treeNodes);
    return selectedTools;
  }, [treeNodes]);

  // Filter and search the tree structure while maintaining hierarchy
  const filteredTreeNodes = useMemo(() => {
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce((acc: TreeNode[], node) => {
        if (node.type === 'folder') {
          const filteredChildren = filterNodes(node.children || []);
          
          // Include folder if it has matching children or if searching
          if (filteredChildren.length > 0) {
            acc.push({
              ...node,
              children: filteredChildren
            });
          } else if (search.trim() && node.name.toLowerCase().includes(search.trim().toLowerCase())) {
            acc.push({
              ...node,
              children: []
            });
          }
        } else if (node.type === 'tool') {
          // Apply search filter to tools
          if (search.trim()) {
            const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const matches = searchTerms.every(term =>
              node.name.toLowerCase().includes(term) ||
              (node.description && node.description.toLowerCase().includes(term))
            );
            if (matches) acc.push(node);
          } else {
            acc.push(node);
          }
        }
        
        return acc;
      }, []);
    };
    
    return filterNodes(treeNodes);
  }, [treeNodes, search]);

  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Toggle group expansion
  const toggleGroup = useCallback((groupPath: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupPath)) {
        newSet.delete(groupPath);
      } else {
        newSet.add(groupPath);
      }
      return newSet;
    });
  }, []);

  // Tool card renderer matching MCPManager design
  const renderToolCard = (tool: TreeNode): React.ReactNode => {
    const handleCardClick = () => {
      setSelectedTool({
        id: tool.id,
        name: tool.name,
        path: tool.path,
        description: tool.description || '',
        category: '',
        categoryIcon: '',
        githubRawUrl: tool.githubRawUrl || ''
      });
    };

    return (
      <Card 
        key={tool.id}
        className={`cursor-pointer border-0 mb-2 transition-all ${
          tool.selected 
            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 shadow-lg' 
            : 'bg-[#1e1e1e] hover:bg-[#252525] hover:shadow-md'
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <Checkbox
                checked={tool.selected}
                onCheckedChange={(e) => {
                  e?.stopPropagation?.();
                  toggleNodeSelection(tool.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white truncate">{tool.name}</h3>
                  <InstallationStatusBadge 
                    status={tool.installationStatus || 'not-installed'}
                    toolPath={tool.path}
                    actualPath={tool.localPath}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-mono">Python Tool</span>
            </div>
            <div className="flex justify-between">
              <span>Source:</span>
              <span className="font-mono text-blue-400">GitHub</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render collapsible folder headers with checkboxes
  const renderFolderHeader = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedGroups.has(node.path);
    const selectedCount = node.selectedCount || 0;
    const totalCount = node.totalCount || 0;
    const selectionState = node.selectionState || 'none';
    
    return (
      <div key={node.id} className="mb-3">
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-3 p-4 hover:bg-[#222] transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleGroup(node.path)}
                className="p-1 hover:bg-gray-600 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              <Checkbox
                checked={selectionState === 'all'}
                indeterminate={selectionState === 'partial'}
                onCheckedChange={() => handleFolderToggle(node.id)}
                className="flex-shrink-0"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-300">{node.name}</h3>
                <Badge className="bg-gray-600/20 text-gray-400 text-xs">
                  {selectedCount}/{totalCount} tools
                </Badge>
              </div>
              {node.description && (
                <p className="text-xs text-gray-500 mt-1">{node.description}</p>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchFolderReadme(node);
              }}
              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
              title="View README"
            >
              <Info className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          {isExpanded && node.children && (
            <div className="px-4 pb-2">
              <div className="space-y-2">
                {node.children.map(child => {
                  if (child.type === 'folder') {
                    return renderFolderHeader(child, 0);
                  } else if (child.type === 'tool') {
                    return renderToolCard(child);
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render function for tree nodes
  const renderTreeNodes = (nodes: TreeNode[]): React.ReactNode[] => {
    return nodes.map(node => {
      if (node.type === 'folder') {
        return renderFolderHeader(node);
      } else if (node.type === 'tool') {
        return renderToolCard(node);
      }
      return null;
    });
  };

  // Calculate the target directory for tool installation
  const getTargetDirectory = useCallback((currentFile?: string): string => {
    if (currentFile) {
      // Clean the file path by removing any line numbers or extra metadata (e.g., ":123")
      const cleanPath = currentFile.split(':')[0];
      
      // Get the directory of the current file
      const lastSlashIndex = cleanPath.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const fileDirectory = cleanPath.substring(0, lastSlashIndex);
        // Return absolute path for the tools directory
        return `${fileDirectory}/tools`;
      }
    }
    // Fallback to workspace root relative path
    return './tools';
  }, []);

  // Show installation confirmation dialog
  const showInstallConfirmation = useCallback((tool: FractalicTool) => {
    console.log('[ToolsMarketplace] showInstallConfirmation called with tool:', tool);
    console.log('[ToolsMarketplace] currentFilePath:', currentFilePath);
    const targetDir = getTargetDirectory(currentFilePath);
    console.log('[ToolsMarketplace] targetDir:', targetDir);
    setToolToInstall(tool);
    setTargetDirectory(targetDir);
    setShowInstallDialog(true);
    console.log('[ToolsMarketplace] Dialog state set, showInstallDialog should be true');
  }, [currentFilePath, getTargetDirectory]);

  // Show batch installation confirmation dialog
  const showBatchInstallConfirmation = useCallback(() => {
    console.log('[ToolsMarketplace] showBatchInstallConfirmation called');
    const selectedTools = getSelectedTools();
    console.log('[ToolsMarketplace] selectedTools:', selectedTools.length);
    if (selectedTools.length === 0) {
      toast({
        title: "No Tools Selected",
        description: "Please select tools to install using the checkboxes",
        variant: "destructive",
      });
      return;
    }
    const targetDir = getTargetDirectory(currentFilePath);
    console.log('[ToolsMarketplace] targetDir:', targetDir);
    setTargetDirectory(targetDir);
    console.log('[ToolsMarketplace] About to set showBatchInstallDialog to true');
    setShowBatchInstallDialog(true);
    console.log('[ToolsMarketplace] setShowBatchInstallDialog(true) called');
  }, [currentFilePath, getTargetDirectory, getSelectedTools, toast]);

  // Install a single tool
  const installTool = useCallback(async (tool: FractalicTool, targetDir?: string) => {
    console.log('[ToolsMarketplace] installTool called with:', tool, targetDir);
    if (installing) {
      console.log('[ToolsMarketplace] Already installing, returning');
      return;
    }
    
    setInstalling(true);
    setInstallProgress(`Downloading ${tool.name}...`);
    console.log('[ToolsMarketplace] Starting download for:', tool.name);
    
    try {
      // Download tool content
      const response = await fetch(tool.githubRawUrl);
      if (!response.ok) {
        throw new Error(`Failed to download ${tool.name}: ${response.statusText}`);
      }
      const content = await response.text();
      console.log('[ToolsMarketplace] Downloaded content, length:', content.length);
      
      setInstallProgress(`Installing ${tool.name}...`);
      
      const requestBody = {
        name: tool.name,
        path: tool.path,
        content: content,
        createToolsFolder: true,
        targetDirectory: targetDir || getTargetDirectory(currentFilePath)
      };
      console.log('[ToolsMarketplace] Sending API request with:', requestBody);
      
      // Save tool to local filesystem via API
      const saveResponse = await fetch('/api/save-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('[ToolsMarketplace] API response status:', saveResponse.status);
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        console.error('[ToolsMarketplace] API error:', errorData);
        throw new Error(errorData.error || `Failed to save ${tool.name}`);
      }
      
      const result = await saveResponse.json();
      console.log('[ToolsMarketplace] API success result:', result);
      
      toast({
        title: "Tool Installed",
        description: `${tool.name} has been installed to ${result.savedPath}`,
      });
      
    } catch (error) {
      console.error('[ToolsMarketplace] Installation failed:', error);
      toast({
        title: "Installation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setInstalling(false);
      setInstallProgress('');
      console.log('[ToolsMarketplace] Installation process finished');
    }
  }, [installing, toast, currentFilePath, getTargetDirectory]);

  // Install selected tools
  const installSelectedTools = useCallback(async () => {
    if (installing) return;
    
    const selectedTools = getSelectedTools();
    if (selectedTools.length === 0) {
      toast({
        title: "No Tools Selected",
        description: "Please select tools to install using the checkboxes",
        variant: "destructive",
      });
      return;
    }
    
    setInstalling(true);
    let successCount = 0;
    const targetDir = getTargetDirectory(currentFilePath);
    
    try {
      for (let i = 0; i < selectedTools.length; i++) {
        const tool = selectedTools[i];
        setInstallProgress(`Installing ${tool.name} (${i + 1}/${selectedTools.length})...`);
        
        try {
          // Download tool content
          const response = await fetch(tool.githubRawUrl);
          if (!response.ok) throw new Error(`Failed to download ${tool.name}`);
          const content = await response.text();
          
          // Save tool to local filesystem via API
          const saveResponse = await fetch('/api/save-tool', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: tool.name,
              path: tool.path,
              content: content,
              createToolsFolder: true,
              targetDirectory: targetDir
            })
          });
          
          if (saveResponse.ok) {
            successCount++;
          } else {
            const errorData = await saveResponse.json().catch(() => ({}));
            console.warn(`Failed to save ${tool.name}:`, errorData.error || 'Unknown error');
          }
          
        } catch (error) {
          console.warn(`Failed to install ${tool.name}:`, error);
        }
      }
      
      toast({
        title: "Installation Complete",
        description: `${successCount}/${selectedTools.length} selected tools installed successfully to ${targetDir}`,
      });
      
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: "Installation Failed",
        description: "Installation was interrupted",
        variant: "destructive",
      });
    } finally {
      setInstalling(false);
      setInstallProgress('');
    }
  }, [installing, toast, getSelectedTools, currentFilePath, getTargetDirectory]);

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-[#18181b] to-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-800 bg-[#141414]">
        <Wrench className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white flex-1">Tools & MCPs Marketplace</h2>
        {loading && <RotateCw className="h-5 w-5 animate-spin text-blue-400" />}
        {usingCachedData && !loading && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Using cached data</span>
          </div>
        )}
        {installing && (
          <div className="flex items-center gap-2 text-blue-400">
            <RotateCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">{installProgress}</span>
          </div>
        )}
      </div>
      
      {/* Controls & Search */}
      <div className="px-6 py-4 border-b border-gray-800 bg-[#18181b] space-y-3">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
          />
          
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            disabled={installing}
            onClick={() => {
              console.log('[ToolsMarketplace] Install Selected button clicked');
              showBatchInstallConfirmation();
            }}
          >
            {installing ? (
              <>
                <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install Selected
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-red-400 ml-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Filters:</span>
            {activeFilters.map(filter => (
              <div
                key={filter}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full"
              >
                <span>{filter}</span>
                <button
                  onClick={() => removeFilter(filter)}
                  className="hover:bg-blue-500/30 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-300 ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tools List */}
        <ScrollArea className="w-1/2 h-full border-r border-gray-800 bg-[#18181b]">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RotateCw className="h-6 w-6 animate-spin mr-2" /> Loading repository structure...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32 text-red-400">
                <AlertCircle className="h-6 w-6 mr-2" /> {error}
              </div>
            ) : filteredTreeNodes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                {activeFilters.length > 0 || search.trim() ? 'No tools match your filters.' : 'No tools found in repository.'}
              </div>
            ) : (
              <div>
                {renderTreeNodes(filteredTreeNodes)}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Right: Tool Details or Folder README */}
        <div className="flex-1 h-full overflow-y-auto bg-[#18181b]">
          {selectedFolder ? (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <Folder className="h-16 w-16 text-blue-400" />
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{selectedFolder.name}</h1>
                  <p className="text-gray-300">Folder README</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedFolder(null)}>
                  <X className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
              
              {loadingReadme ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <RotateCw className="h-6 w-6 animate-spin mr-2" /> Loading README...
                </div>
              ) : (
                <div className="bg-[#18181b] overflow-hidden">
                  <MarkdownViewer 
                    content={folderReadme}
                    className="tools-marketplace-readme"
                    isDarkMode={true}
                  />
                </div>
              )}
            </div>
          ) : selectedTool ? (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl">{selectedTool.categoryIcon}</div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{selectedTool.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-gray-800 text-gray-400 text-xs">{selectedTool.category}</Badge>
                  </div>
                  <p className="text-gray-300 mb-4">{selectedTool.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <a 
                      href={selectedTool.githubRawUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:underline text-sm"
                    >
                      View Source
                    </a>
                    <span className="text-gray-500 text-sm">•</span>
                    <span className="text-gray-500 text-sm">{selectedTool.path}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTool(null)}>
                  <X className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
              
              {/* Installation Section */}
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={installing}
                  onClick={() => {
                    console.log('[ToolsMarketplace] Install Tool button clicked, selectedTool:', selectedTool);
                    if (selectedTool) {
                      showInstallConfirmation(selectedTool);
                    } else {
                      console.error('[ToolsMarketplace] No selectedTool available');
                      toast({
                        title: "No Tool Selected",
                        description: "Please select a tool first by clicking on a tool card",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {installing ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install Tool
                    </>
                  )}
                </Button>
                
                {/* Installation Confirmation Dialog */}
                <AlertDialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
                  <AlertDialogContent className="bg-[#1e1e1e] border-gray-600">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Confirm Tool Installation
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        You are about to install the selected tool to your target directory.
                      </AlertDialogDescription>
                      <div className="space-y-3 mt-4">
                        <div>You are about to install:</div>
                        <div className="bg-gray-800 p-3 rounded border-l-4 border-l-blue-500">
                          <div className="font-semibold text-white">{toolToInstall?.name}</div>
                          <div className="text-sm text-gray-400">{toolToInstall?.path}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="font-medium text-yellow-400">Target Directory:</div>
                          <div className="bg-gray-800 p-2 rounded font-mono text-sm text-green-400 break-all max-h-20 overflow-y-auto">
                            {targetDirectory}
                          </div>
                          <div className="text-xs text-gray-500">
                            The tool will be installed to the target directory automatically.
                          </div>
                        </div>
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          console.log('[ToolsMarketplace] Final install button clicked, toolToInstall:', toolToInstall, 'targetDirectory:', targetDirectory);
                          if (toolToInstall) {
                            installTool(toolToInstall, targetDirectory);
                            setShowInstallDialog(false);
                          } else {
                            console.error('[ToolsMarketplace] No toolToInstall available');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Install Tool
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                

                
                {/* Selection Instructions */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Batch Installation</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Use the checkboxes to select multiple tools for batch installation.
                    Click on folder balloons to filter tools by category.
                    Selected tools will be downloaded with their complete directory structure to the target location.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center space-y-4">
                <Wrench className="h-16 w-16 text-blue-400 mx-auto" />
                <h3 className="text-2xl font-semibold text-gray-300 mb-2">Fractalic Tools Marketplace</h3>
                <p className="text-gray-500">Click on folder names to view their README documentation</p>
                <p className="text-gray-500">Click on tools to view details and installation options</p>
                <p className="text-gray-500">Use checkboxes for batch installation</p>
                <div className="mt-6 text-sm text-gray-500">
                  <p>Dynamic repository structure loaded from GitHub</p>
                  <p>Folders with README files show documentation on click</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Batch Installation Confirmation Dialog */}
      <AlertDialog open={showBatchInstallDialog} onOpenChange={(open) => {
        console.log('[ToolsMarketplace] Batch dialog onOpenChange called with:', open);
        setShowBatchInstallDialog(open);
      }}>
        <AlertDialogContent className="bg-[#1e1e1e] border-gray-600">
          {console.log('[ToolsMarketplace] Batch dialog content rendering, showBatchInstallDialog:', showBatchInstallDialog)}
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5" />
              Confirm Batch Installation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              You are about to install {getSelectedTools().length} selected tools to your target directory.
            </AlertDialogDescription>
            <div className="space-y-3 mt-4">
              <div>Selected tools:</div>
              <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                {getSelectedTools().map((tool, index) => (
                  <div key={tool.id} className="flex justify-between items-center py-1">
                    <span className="text-sm text-white">{tool.name}</span>
                    <span className="text-xs text-gray-400">{tool.path}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="font-medium text-yellow-400">Target Directory:</div>
                <div className="bg-gray-800 p-2 rounded font-mono text-sm text-green-400 break-all max-h-20 overflow-y-auto">
                  {targetDirectory}
                </div>
                <div className="text-xs text-gray-500">
                  All tools will be installed to the target directory automatically.
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                installSelectedTools();
                setShowBatchInstallDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Install All to Target Directory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ToolsMarketplace;