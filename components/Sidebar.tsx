import { Button } from "@/components/ui/button"
import { PenSquare, GitBranch } from 'lucide-react'

interface SidebarProps {
  mode: 'edit' | 'git'
  setMode: (mode: 'edit' | 'git') => void
  isPanelVisible: boolean
  togglePanel: () => void
}

export default function Sidebar({ mode, setMode, isPanelVisible, togglePanel }: SidebarProps) {
  const handleModeClick = (newMode: 'edit' | 'git') => {
    if (mode === newMode) {
      togglePanel();
    } else {
      setMode(newMode);
    }
  };

  return (
    <div className="w-16 border-r flex flex-col items-center py-4 space-y-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleModeClick('edit')}
        className={`w-12 h-12 ${mode === 'edit' ? 'text-white' : 'text-gray-400'}`}
      >
        <PenSquare className="h-6 w-6" />
        <span className="sr-only">Edit mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleModeClick('git')}
        className={`w-12 h-12 ${mode === 'git' ? 'text-white' : 'text-gray-400'}`}
      >
        <GitBranch className="h-6 w-6" />
        <span className="sr-only">Git mode</span>
      </Button>
    </div>
  )
}