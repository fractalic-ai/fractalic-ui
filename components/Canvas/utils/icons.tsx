import React from 'react';
import { Terminal, FileText, MessageSquare } from 'lucide-react';

export const getNodeIcon = (type: string) => {
  switch (type) {
    case 'operation':
      return <Terminal className="w-4 h-4 text-emerald-400" />;
    case 'heading':
      return <FileText className="w-4 h-4 text-blue-400" />;
    default:
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
  }
};