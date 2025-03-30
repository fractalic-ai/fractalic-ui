import React from 'react';
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from 'lucide-react'

interface ContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, onRename, onDelete, onClose }: ContextMenuProps) {
  React.useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed bg-[#1e1e1e] border border-gray-700 rounded-md shadow-lg py-1 z-50"
      style={{ left: x, top: y }}
    >
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-2 hover:bg-gray-700 text-sm"
        onClick={onRename}
      >
        <Pencil className="h-4 w-4 mr-2" />
        Rename
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-2 hover:bg-gray-700 text-sm text-red-400"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  );
} 