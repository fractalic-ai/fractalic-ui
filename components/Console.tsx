// Console.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { X, Terminal } from 'lucide-react';

const DynamicTerminal = dynamic(() => import('./DynamicTerminal'), {
  ssr: false,
  loading: () => <div>Loading terminal...</div>,
});

export interface ConsoleProps {
  setShowConsole: (show: boolean) => void;
  onResize: () => void;
  currentPath: string;
  currentFilePath: string;
  onSpecialOutput: (branchId: string, fileHash: string, filePath: string) => void;
  shouldRunFile?: boolean;
  triggerCommand?: string;
}

function Console(props: ConsoleProps) {
  const { setShowConsole, onResize, currentPath, currentFilePath, onSpecialOutput, shouldRunFile, triggerCommand } = props;
  const terminalRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    console.log('Console component mounted');
    return () => {
      console.log('Console component unmounted');
      initializedRef.current = false;
    };
  }, []);

  const handleClose = useCallback(() => {
    console.log('Console close button clicked');
    setShowConsole(false);
  }, [setShowConsole]);

  const executeFractalicFile = useCallback(
    (onData: (chunk: string | null) => void) => {
      console.log('[Console] executeFractalicFile called with currentFilePath:', currentFilePath);
      if (!currentFilePath) {
        onData('Error: No file selected\n');
        return;
      }

      fetch(`http://localhost:8000/ws/run_fractalic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: currentFilePath,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const reader = response.body!.getReader();
          const decoder = new TextDecoder('utf-8');

          function read() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  onData(null); // Indicate end
                  return;
                }
                const chunk = decoder.decode(value);
                onData(chunk);
                read();
              })
              .catch((error) => {
                console.error('Error reading response stream:', error);
                onData(null);
              });
          }
          read();
        })
        .catch((error) => {
          console.error('Error executing fractalic file:', error);
          onData('Error: Failed to execute file\n');
        });
    },
    [currentFilePath]
  );

  const handleSendCommand = useCallback(
    (command: string, onData: (chunk: string | null) => void) => {
      try {
        fetch(`http://localhost:8000/ws/run_command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command,
            path: currentPath || '/',
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const reader = response.body!.getReader();
            const decoder = new TextDecoder('utf-8');

            function read() {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    onData(null); // Indicate end
                    return;
                  }
                  const chunk = decoder.decode(value);
                  onData(chunk);
                  read();
                })
                .catch((error) => {
                  console.error('Error reading response stream:', error);
                  onData(null);
                });
            }
            read();
          })
          .catch((error) => {
            console.error('Error sending command:', error);
            onData('Error: Failed to execute command\n');
          });
      } catch (error) {
        console.error('Error sending command:', error);
        onData('Error: Failed to execute command\n');
      }
    },
    [currentPath]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Console</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <DynamicTerminal
          onSendCommand={handleSendCommand}
          onExecuteFile={executeFractalicFile}
          currentPath={currentPath || '/'}
          onSpecialOutput={onSpecialOutput}
          currentFilePath={currentFilePath}
          initializedRef={initializedRef}
          triggerCommand={triggerCommand}
        />
      </div>
    </div>
  );
}

export default Console;
