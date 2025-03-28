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
import '@/public/assets/seti-icons/seti.css';

interface FileTreeProps {
  currentFiles: any[]
  handleFolderSelect: (folder: any) => void
  handleNewFile?: (name: string) => void
  handleNewFolder?: (name: string) => void
  mode?: 'edit' | 'git'
  selectedItem: string | null
  selectedFolder: any | null
  currentPath: string
}

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
  currentPath
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

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold flex items-center group relative">
          <i className={getIconClass('folder', true)} />
          <span className="cursor-default" title={currentPath}>
            {currentPath === '/' ? '/' : currentPath.split('/').pop() || '/'}
          </span>
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
        {currentFiles.map((file) => (
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
              <i className={getIconClass(file.name, file.is_dir)} />
              {file.name}
            </Button>
          </li>
        ))}
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