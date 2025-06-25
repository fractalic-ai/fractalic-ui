import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings, Moon, Sun, Rocket } from 'lucide-react'
import SettingsModal from './SettingsModal'
import Image from 'next/image'

interface HeaderProps {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (isOpen: boolean) => void
  isDeployOpen: boolean
  setIsDeployOpen: (isOpen: boolean) => void
}

export default function Header({ theme, setTheme, isSettingsOpen, setIsSettingsOpen, isDeployOpen, setIsDeployOpen }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-2 border-b bg-[#141414]">
      <div className="flex items-center space-x-2">
        <Image 
          src="/static/F_icon_logo.png" 
          alt="logo" 
          width={42} 
          height={42} 
        />
        <Image 
          src="/static/F_logo_logo.png" 
          alt="Fractalic" 
          width={110}
          height={32}
        />
      </div>
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsDeployOpen(true)}
          className="text-gray-300 hover:text-green-300 hover:bg-green-900/20"
        >
          <Rocket className="h-4 w-4 mr-2" />
          Deploy
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsSettingsOpen(true)}
          className="text-gray-300"
        >
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