import { Button } from "@/components/ui/button"
import { GitCommit, FileText } from 'lucide-react'

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
  const renderCommitTree = (nodes: any[], level = 0, parentNode: any = null) => (
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
                  <GitCommit className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {node.text}
              </Button>
            </div>
            {node.children && renderCommitTree(node.children, level + 1, nodeWithParent)}
          </li>
        )
      })}
    </ul>
  )

  return (
    <div>
      <h3 className="mb-2 font-semibold flex items-center">
        <GitCommit className="mr-2 h-4 w-4" />
        Commits
      </h3>
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