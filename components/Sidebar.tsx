import { Button } from "@/components/ui/button"
import { PenSquare, GitBranch } from 'lucide-react'

interface SidebarProps {
  mode: 'edit' | 'git'
  setMode: (mode: 'edit' | 'git') => void
}

export default function Sidebar({ mode, setMode }: SidebarProps) {
  return (
    <div className="w-16 border-r flex flex-col items-center py-4 space-y-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMode('edit')}
        className={`w-12 h-12 ${mode === 'edit' ? 'bg-accent text-accent-foreground' : ''}`}
      >
        <PenSquare className="h-6 w-6" />
        <span className="sr-only">Edit mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMode('git')}
        className={`w-12 h-12 ${mode === 'git' ? 'bg-accent text-accent-foreground' : ''}`}
      >
        <GitBranch className="h-6 w-6" />
        <span className="sr-only">Git mode</span>
      </Button>
    </div>
  )
}