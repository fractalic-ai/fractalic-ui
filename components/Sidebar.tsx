import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PenSquare, GitBranch, Server, Wrench, ShoppingBag, Globe } from 'lucide-react'

interface SidebarProps {
  mode: 'edit' | 'git' | 'mcp' | 'toolsManager' | 'marketplace' | 'mcpRegistry';
  setMode: (mode: 'edit' | 'git' | 'mcp' | 'toolsManager' | 'marketplace' | 'mcpRegistry') => void;
  isPanelVisible: boolean
  togglePanel: () => void
  className?: string
}

export default function Sidebar({ mode, setMode, isPanelVisible, togglePanel, className }: SidebarProps) {
  const handleModeClick = (newMode: SidebarProps['mode']) => {
    if (mode === newMode) {
      togglePanel();
    } else {
      setMode(newMode);
    }
  };

  return (
    <TooltipProvider>
      <div className={`w-16 border-r flex flex-col items-center space-y-4 ${className || ''}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('edit')}
              className={`w-12 h-12 ${mode === 'edit' ? 'text-white' : 'text-gray-400'}`}
            >
              <PenSquare className="h-6 w-6" />
              <span className="sr-only">Edit mode</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>Edit mode</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('git')}
              className={`w-12 h-12 ${mode === 'git' ? 'text-white' : 'text-gray-400'}`}
            >
              <GitBranch className="h-6 w-6" />
              <span className="sr-only">Git mode</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>Sessions history</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('mcp')}
              className={`w-12 h-12 ${mode === 'mcp' ? 'text-white' : 'text-gray-400'}`}
            >
              <Server className="h-6 w-6" />
              <span className="sr-only">MCP Management</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>MCP manager</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('toolsManager')}
              className={`w-12 h-12 ${mode === 'toolsManager' ? 'text-white' : 'text-gray-400'}`}
            >
              <Wrench className="h-6 w-6" />
              <span className="sr-only">Tools Manager</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>Fractalic tools</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('marketplace')}
              className={`w-12 h-12 ${mode === 'marketplace' ? 'text-white' : 'text-gray-400'}`}
            >
              <ShoppingBag className="h-6 w-6" />
              <span className="sr-only">Tools & MCPs Marketplace</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>Tools & MCPs Marketplace</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleModeClick('mcpRegistry')}
              className={`w-12 h-12 ${mode === 'mcpRegistry' ? 'text-white' : 'text-gray-400'}`}
            >
              <Globe className="h-6 w-6" />
              <span className="sr-only">MCP Official Registry</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-blue-900 border-blue-800 text-white">
            <p>MCP Official Registry</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}