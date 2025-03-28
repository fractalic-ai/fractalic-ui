import { Button } from "@/components/ui/button"
import { Plus, FolderPlus } from 'lucide-react'
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

interface FileTreeProps {
  currentFiles: any[]
  handleFolderSelect: (folder: any) => void
  handleNewFile?: (name: string) => void
  handleNewFolder?: (name: string) => void
  mode?: 'edit' | 'git'
  selectedItem: string | null
  selectedFolder: any | null
}

// Helper function to get the Icon Component and Color
const getIconDetails = (fileName: string, isDir: boolean): { IconComponent: React.ElementType, color: string } => {
  const defaultColor = '#C0C0C0'; // Gray for default/unknown
  const defaultIcon = HiDocument;

  if (isDir || fileName === '..') {
    return { IconComponent: HiFolder, color: '#4E72A4' }; // Dark Blue for folders
  }

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
      return { IconComponent: SiJavascript, color: '#F1E05A' }; // Yellow
    case 'ts':
    case 'tsx':
      return { IconComponent: SiTypescript, color: '#51B6C3' }; // Blue
    case 'json':
      return { IconComponent: SiJson, color: '#F1E05A' }; // Yellow
    case 'md':
      return { IconComponent: SiMarkdown, color: '#51B6C3' }; // Blue
    case 'ctx':
      return { IconComponent: SiMarkdown, color: '#4295A1' }; // Darker Blue
    case 'py':
      return { IconComponent: SiPython, color: '#3572A5' }; // Python Blue
    case 'html':
    case 'htm':
      return { IconComponent: SiHtml5, color: '#E34F26' }; // Orange
    case 'css':
    case 'scss':
      return { IconComponent: SiCss3, color: '#1572B6' }; // CSS Blue
    case 'sh':
      return { IconComponent: SiGnubash, color: '#C0C0C0' }; // Gray
    case 'webp':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return { IconComponent: GoFileMedia, color: '#A0A0A0' }; // Neutral Gray for images
    default:
      return { IconComponent: defaultIcon, color: defaultColor };
  }
};

export default function FileTree({
  currentFiles,
  handleFolderSelect,
  handleNewFile,
  handleNewFolder,
  mode,
  selectedItem,
  selectedFolder
}: FileTreeProps) {
  const [isEditing, setIsEditing] = useState<'file' | 'folder' | null>(null)
  const [newItemName, setNewItemName] = useState('')

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isEditing === 'file' && handleNewFile) {
        handleNewFile(newItemName)
      } else if (isEditing === 'folder' && handleNewFolder) {
        handleNewFolder(newItemName)
      }
      setIsEditing(null)
      setNewItemName('')
    } else if (e.key === 'Escape') {
      setIsEditing(null)
      setNewItemName('')
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

  // Get header folder details
  const { IconComponent: HeaderFolderIcon, color: headerFolderColor } = getIconDetails('folder', true);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold flex items-center">
          {/* Render header folder icon using Component */}
          <HeaderFolderIcon
             className="mr-2 h-6 w-6 shrink-0" // Added shrink-0
             style={{ color: headerFolderColor }}
             aria-hidden="true" // Indicate decorative
           />
          {mode === 'git' ? 'Folders' : 'Files'}
        </h3>
        {mode === 'edit' && (
          <div className="space-x-2">
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
      <ul className="space-y-1">
        {currentFiles.map((file) => {
          // Get the Icon Component and color for the current file/folder
          const { IconComponent, color } = getIconDetails(file.name, file.is_dir);

          return (
            <li key={file.path} className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                aria-selected={selectedItem === file.path}
                className={`w-full justify-start ${
                  selectedItem === file.path
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => {
                  handleFolderSelect(file)
                  console.log('Selected Item:', file.path)
                }}
              >
                {/* Render the selected Icon Component */}
                <IconComponent
                   className="mr-2 h-6 w-6 shrink-0" // Size and prevent shrinking
                   style={{ color: color }} // Apply color via style prop
                   aria-hidden="true" // Indicate decorative
                 />
                {file.name}
              </Button>
            </li>
          );
        })}
        {isEditing && (
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
  )
}