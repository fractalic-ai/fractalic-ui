import React, { useState } from 'react';
import { WrapText, AlignJustify } from 'lucide-react';

interface TextFieldProps {
  content: string;
  title?: string; // Make title optional
  hideButton?: boolean; // Option to hide the button (for when it's moved to node header)
  dataId?: string; // For targeting specific instances
}

export const TextField: React.FC<TextFieldProps> = ({ content, title, hideButton, dataId }) => {
  const [isWrapped, setIsWrapped] = useState(true);

  return (
    <div className="mb-4" data-text-field-id={dataId}>
      <div className="flex justify-between items-center mb-2">
        {title && <h3 className="font-medium text-gray-300">{title}</h3>}
        {!hideButton && (
          <button
            onClick={() => setIsWrapped(!isWrapped)}
            className={`p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors duration-200 ${!title ? 'ml-auto' : ''}`}
            title={isWrapped ? "Disable word wrap" : "Enable word wrap"}
          >
            {isWrapped ? <WrapText className="w-4 h-4" /> : <AlignJustify className="w-4 h-4" />}
          </button>
        )}
      </div>
      <pre className={`bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto text-gray-300 custom-scrollbar
        ${isWrapped ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
        {content}
      </pre>
    </div>
  );
};