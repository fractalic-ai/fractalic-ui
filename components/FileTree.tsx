import { Button } from "@/components/ui/button"
import { Folder, File, GitBranch, Plus, FolderPlus } from 'lucide-react'
import { useState, KeyboardEvent } from 'react'
import { Input } from "@/components/ui/input"

interface FileTreeProps {
  currentFiles: any[]
  handleFolderSelect: (folder: any) => void
  handleNewFile?: (name: string) => void
  handleNewFolder?: (name: string) => void
  mode?: 'edit' | 'git'
  selectedItem: string | null
  selectedFolder: any | null
}

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

  const renderFileTree = (files: any[]) => (
    <ul className="space-y-1">
      {files.map((file) => (
        <li key={file.path} className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start ${
              mode === 'edit' && selectedItem === file.path
                ? 'bg-blue-600 bg-opacity-100 text-white'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => handleFolderSelect(file)}
          >
            {file.is_dir || file.name === '..' ? (
              <Folder className="mr-2 h-4 w-4" />
            ) : (
              <File className="mr-2 h-4 w-4" />
            )}
            {file.name}
            {file.is_git_repo && <GitBranch className="ml-auto h-4 w-4 text-muted-foreground" />}
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
  )
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold flex items-center">
          <Folder className="mr-2 h-4 w-4" />
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
      {renderFileTree(currentFiles)}
    </div>
  )
}