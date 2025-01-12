import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings, Moon, Sun } from 'lucide-react'
import SettingsModal from './SettingsModal'

interface HeaderProps {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (isOpen: boolean) => void
}

export default function Header({ theme, setTheme, isSettingsOpen, setIsSettingsOpen }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center">
        <span className="text-2xl font-bold text-white bg-blue-900 px-2 py-1 rounded-md">L*</span>
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 mr-2" />
              ) : (
                <Sun className="h-4 w-4 mr-2" />
              )}
              Theme
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SettingsModal isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} setGlobalSettings={() => {}} />
    </div>
  )
}