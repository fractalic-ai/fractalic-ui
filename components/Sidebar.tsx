import { Button } from "@/components/ui/button"
import { PenSquare, GitBranch, Server, Wrench } from 'lucide-react'

interface SidebarProps {
  mode: 'edit' | 'git' | 'mcp' | 'toolsManager'
  setMode: (mode: 'edit' | 'git' | 'mcp' | 'toolsManager') => void
  isPanelVisible: boolean
  togglePanel: () => void
  className?: string
}

export default function Sidebar({ mode, setMode, isPanelVisible, togglePanel, className }: SidebarProps) {
  const handleModeClick = (newMode: 'edit' | 'git' | 'mcp' | 'toolsManager') => {
    if (mode === newMode) {
      togglePanel();
    } else {
      setMode(newMode);
    }
  };

  return (
    <div className={`w-16 border-r flex flex-col items-center space-y-4 ${className || ''}`}>
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleModeClick('mcp')}
        className={`w-12 h-12 ${mode === 'mcp' ? 'text-white' : 'text-gray-400'}`}
      >
        <Server className="h-6 w-6" />
        <span className="sr-only">MCP Management</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleModeClick('toolsManager')}
        className={`w-12 h-12 ${mode === 'toolsManager' ? 'text-white' : 'text-gray-400'}`}
      >
        <Wrench className="h-6 w-6" />
        <span className="sr-only">Tools Manager</span>
      </Button>
    </div>
  )
}