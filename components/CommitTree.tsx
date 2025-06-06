import { Button } from "@/components/ui/button"
import { GitCommit, FileText, LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'

interface CommitTreeProps {
  selectedFolder: any
  branchesData: any[]
  setSelectedCommit: (commit: any[]) => void
  setDiffContent: (content: { original: string; modified: string }) => void
  repoPath: string
  handleCommitSelect: (node: any) => Promise<void>
  selectedCommit: any[] | null
}

export default function CommitTree({
  selectedFolder,
  branchesData,
  setSelectedCommit,
  setDiffContent,
  repoPath,
  handleCommitSelect,
  selectedCommit
}: CommitTreeProps) {
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('compact')
  // Function to format commit text based on view mode
  const formatCommitText = (text: string): string => {
    if (viewMode === 'full') {
      return text
    }
    
    // For compact mode, extract meaningful parts from branch names like "20250606031812_0338efda_Testing-git-operations"
    // Split by underscore and take the last part (the actual description)
    const parts = text.split('_')
    if (parts.length >= 3) {
      // Return the description part, replacing hyphens with spaces for readability
      return parts[parts.length - 1].replace(/-/g, ' ')
    }
    
    // Fallback: if format doesn't match expected pattern, truncate if too long
    return text.length > 30 ? text.substring(0, 30) + '...' : text
  }

  // Function to extract and format date/time from branch name
  const extractDateTime = (text: string): string | null => {
    const parts = text.split('_')
    if (parts.length >= 1) {
      const dateTimePart = parts[0]
      // Check if it matches the expected format (YYYYMMDDHHMMSS)
      if (dateTimePart.length === 14 && /^\d{14}$/.test(dateTimePart)) {
        const year = dateTimePart.substring(0, 4)
        const month = dateTimePart.substring(4, 6)
        const day = dateTimePart.substring(6, 8)
        const hour = dateTimePart.substring(8, 10)
        const minute = dateTimePart.substring(10, 12)
        const second = dateTimePart.substring(12, 14)
        
        // Format as readable date/time
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`
      }
    }
    return null
  }
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'full' ? 'compact' : 'full')
  }

  const renderCommitTree = (nodes: any[], level = 0, parentNode: any = null) => {
    return (
      <ul className={`space-y-1 ${level > 0 ? 'ml-4' : ''}`}>
        {nodes.map((node: any, index: number) => {
          const nodeWithParent = { ...node, parent: parentNode }
          const isSelected = selectedCommit && selectedCommit.some(commit => commit.id === node.id)
          const isRootCommit = level === 0
          //console.log(`Node: ${node.text}, Level: ${level}, isRootCommit: ${isRootCommit}`)

          return (
            <li key={`${node.id}-${index}`}>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    isSelected
                      ? 'bg-[#202020] text-white hover:bg-[#202020]'
                      : 'text-gray-400 hover:bg-[#202020] hover:text-white'
                  }`}
                  onClick={() => handleCommitSelect(nodeWithParent)}
                >
                  {isRootCommit ? (
                    <GitCommit className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="flex flex-col items-start min-w-0 flex-1" title={node.text}>
                    <span className="truncate w-full text-left">{formatCommitText(node.text)}</span>
                    {viewMode === 'compact' && extractDateTime(node.text) && (
                      <span className="text-xs text-gray-500 w-full text-left">
                        {extractDateTime(node.text)}
                      </span>
                    )}
                  </div>
                </Button>
              </div>
              {node.children && renderCommitTree(node.children, level + 1, nodeWithParent)}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="relative">
      <div className="mb-2 min-w-0 flex items-center">
        <h3 className="font-semibold flex items-center min-w-0">
          <GitCommit className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Sessions</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleViewMode}
          className="ml-2 p-1 h-7 w-7 text-gray-400 hover:text-white hover:bg-[#202020] flex-shrink-0"
          aria-label={viewMode === 'full' ? 'Switch to Card/Compact mode' : 'Switch to List/Full mode'}
          title={viewMode === 'full' ? 'Switch to Card/Compact mode' : 'Switch to List/Full mode'}
        >
          {viewMode === 'full' ? (
            <LayoutGrid className="h-4 w-4" />
          ) : (
            <List className="h-4 w-4" />
          )}
        </Button>
      </div>
      {selectedFolder && selectedFolder.is_git_repo ? (
        renderCommitTree(branchesData)
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a folder with a git repository
        </p>
      )}
    </div>
  )
}