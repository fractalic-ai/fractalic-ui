import { Button } from "@/components/ui/button"
import { Plus, FolderPlus, Filter } from 'lucide-react'
import { useState, KeyboardEvent } from 'react'
import { Input } from "@/components/ui/input"
// Remove vscode-icons-js import
// import { getIconForFile, getIconForFolder } from 'vscode-icons-js'
import React from 'react';
// Import necessary icons from react-icons
import {
  SiJavascript, SiTypescript, SiJson, SiMarkdown, SiPython, SiHtml5, SiCss3, SiGnubash
} from 'react-icons/si';
import { HiFolder, HiDocument } from 'react-icons/hi2'; // Using Hi2 for potentially newer icons
import { GoFileMedia } from 'react-icons/go'; // Generic media file
import '@/public/assets/seti-icons/seti.css';
import ContextMenu from './ContextMenu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FileTreeProps {
  currentFiles: any[]
  handleFolderSelect: (folder: any) => void
  handleNewFile?: (name: string) => void
  handleNewFolder?: (name: string) => void
  mode?: 'edit' | 'git'
  selectedItem: string | null
  selectedFolder: any | null
  currentPath: string
  onFileUpdate?: (newName?: string) => void
  isEditing?: 'file' | 'folder' | null
  setIsEditing?: (value: 'file' | 'folder' | null) => void
  newItemName?: string
  setNewItemName?: (value: string) => void
  filterOption?: FilterOption
  setFilterOption?: (value: FilterOption) => void
}

type FilterOption = 'all' | 'md' | 'md-ctx';

const getIconClass = (fileName: string, isDir: boolean): string => {
  if (isDir || fileName === '..') {
    return 'icon icon-folder';
  }

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    // JavaScript and TypeScript
    case 'js':
    case 'jsx':
      return 'icon icon-javascript';
    case 'ts':
    case 'tsx':
      return 'icon icon-typescript';
    // Web Technologies
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
    case 'jsx':
    case 'tsx':
      return 'icon icon-react';
    // Data and Config
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
    // Programming Languages
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
    // Shell and Config
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
    // Build and Package
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
    // Media
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
    // Documents
    case 'pdf':
      return 'icon icon-pdf';
    // Archives
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return 'icon icon-zip';
    // Design
    case 'psd':
      return 'icon icon-photoshop';
    case 'ai':
      return 'icon icon-illustrator';
    // Version Control
    case 'gitignore':
    case 'gitattributes':
      return 'icon icon-git';
    default:
      return 'icon icon-default';
  }
};

export default function FileTree({
  currentFiles,
  handleFolderSelect,
  handleNewFile,
  handleNewFolder,
  mode,
  selectedItem,
  selectedFolder,
  currentPath,
  onFileUpdate,
  isEditing: externalIsEditing,
  setIsEditing: externalSetIsEditing,
  newItemName: externalNewItemName,
  setNewItemName: externalSetNewItemName,
  filterOption: externalFilterOption,
  setFilterOption: externalSetFilterOption
}: FileTreeProps) {
  // Use local state if external state is not provided
  const [localIsEditing, localSetIsEditing] = useState<'file' | 'folder' | null>(null);
  const [localNewItemName, localSetNewItemName] = useState('');
  
  // Use either external state or local state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : localIsEditing;
  const setIsEditing = externalSetIsEditing || localSetIsEditing;
  const newItemName = externalNewItemName !== undefined ? externalNewItemName : localNewItemName;
  const setNewItemName = externalSetNewItemName || localSetNewItemName;
  const filterOption = externalFilterOption !== undefined ? externalFilterOption : 'all';
  const setFilterOption = externalSetFilterOption || ((value: FilterOption) => {});

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: any;
  } | null>(null)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<any | null>(null)

  const handleKeyPress = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingItem) {
        // Skip rename if the new name is the same as the old name
        if (newItemName === editingItem.name) {
          setIsEditing(null)
          setNewItemName('')
          setEditingItem(null)
          return;
        }

        // Handle rename
        try {
          const response = await fetch(
            `/rename_item/?old_path=${encodeURIComponent(editingItem.path)}&new_name=${encodeURIComponent(newItemName)}`,
            {
              method: 'POST',
            }
          );
          if (response.ok) {
            // Pass the new name to the update handler
            onFileUpdate?.(newItemName);
          } else {
            console.error('Error renaming item:', response.statusText);
          }
        } catch (error) {
          console.error('Error renaming item:', error);
        }
      } else if (isEditing === 'file' && handleNewFile) {
        handleNewFile(newItemName)
      } else if (isEditing === 'folder' && handleNewFolder) {
        handleNewFolder(newItemName)
      }
      setIsEditing(null)
      setNewItemName('')
      setEditingItem(null)
    } else if (e.key === 'Escape') {
      setIsEditing(null)
      setNewItemName('')
      setEditingItem(null)
    }
  }

  const startNewFile = () => {
    setIsEditing('file')
    setNewItemName('')
  }

  const startNewFolder = () => {
    setIsEditing('folder')
    setNewItemName('')
  }

  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };

  const handleRename = async () => {
    if (!contextMenu) return;
    const file = contextMenu.file;
    setIsEditing(file.is_dir ? 'folder' : 'file');
    setNewItemName(file.name);
    setEditingItem(file);
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    setFileToDelete(contextMenu.file);
    setDeleteDialogOpen(true);
    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      const response = await fetch(
        `/delete_item/?path=${encodeURIComponent(fileToDelete.path)}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        // Call the update handler instead of reloading
        onFileUpdate?.();
      } else {
        console.error('Error deleting item:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  const filteredFiles = currentFiles.filter(file => {
    // Always show folders
    if (file.is_dir) return true;
    
    // Apply filter based on selected option
    switch (filterOption) {
      case 'all':
        return true;
      case 'md':
        return file.name.endsWith('.md');
      case 'md-ctx':
        return file.name.endsWith('.md') || file.name.endsWith('.ctx');
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div data-radix-scroll-area-viewport="" className="h-full w-full rounded-[inherit] overflow-hidden">
        <div style={{ minWidth: '100%', display: 'table' }}>
          <div className="p-4 space-y-4 bg-[#141414]">
            <div className="flex flex-col h-full">
              <div className="flex-grow overflow-y-auto">
                <ul className="space-y-1">
                  {filteredFiles
                    .filter(file => mode === 'git' ? (file.is_dir || file.is_git_repo) : true)
                    .map((file) => (
                      <li key={file.path} className="space-y-1">
                        {editingItem?.path === file.path ? (
                          <div className="flex items-center gap-2 px-2">
                            <i className={file.is_git_repo ? 'icon icon-git' : getIconClass(file.name, file.is_dir)} />
                            <Input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                              className="h-8 flex-1"
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-selected={selectedItem === file.path}
                            className={`w-full justify-start file-tree-button ${
                              selectedItem === file.path
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => {
                              handleFolderSelect(file)
                              console.log('Selected Item:', file.path)
                            }}
                            onContextMenu={(e) => handleContextMenu(e, file)}
                          >
                            <i className={file.is_git_repo ? 'icon icon-git' : getIconClass(file.name, file.is_dir)} />
                            <span>{file.name}</span>
                          </Button>
                        )}
                      </li>
                    ))}
                  {isEditing && !editingItem && (
                    <li className="px-2 py-1">
                      <Input
                        type="text"
                        placeholder={`New ${isEditing}...`}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        autoFocus
                      />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setFileToDelete(null);
        }
        setDeleteDialogOpen(open);
      }}>
        <DialogContent className="bg-[#1e1e1e] border-[#3d3d3d]">
          <DialogTitle className="text-3xl font-bold text-white">Delete File</DialogTitle>
          <DialogDescription className="text-base text-gray-200">
            This will permanently delete <span className="text-blue-400 font-semibold">{fileToDelete?.name}</span>. This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFileToDelete(null);
              }}
              className="text-gray-200 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}