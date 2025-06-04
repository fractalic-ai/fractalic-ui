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
          const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
          let byteBuffer = new Uint8Array(0);
          let textBuffer = '';

          function read() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  // Process any remaining bytes in the buffer
                  if (byteBuffer.length > 0) {
                    try {
                      const finalText = decoder.decode(byteBuffer, { stream: false });
                      textBuffer += finalText;
                      console.log('[Console/executeFractalicFile] Final buffer decoded:', JSON.stringify(finalText));
                    } catch (error) {
                      console.error('[Console/executeFractalicFile] Error decoding final buffer:', error);
                    }
                  }
                  
                  if (textBuffer) {
                    console.log('[Console/executeFractalicFile] Final text data:', JSON.stringify(textBuffer));
                    onData(textBuffer);
                  }
                  onData(null); // Indicate end
                  return;
                }
                
                if (value) {
                  // Append new bytes to buffer
                  const newBuffer = new Uint8Array(byteBuffer.length + value.length);
                  newBuffer.set(byteBuffer);
                  newBuffer.set(value, byteBuffer.length);
                  byteBuffer = newBuffer;
                  
                  console.log('[Console/executeFractalicFile] Buffer size:', byteBuffer.length, 'bytes');
                  
                  // Try to decode as much as possible
                  let decodedText = '';
                  let lastValidIndex = 0;
                  
                  try {
                    // Attempt to decode the entire buffer
                    decodedText = decoder.decode(byteBuffer, { stream: true });
                    // If successful, we can use all bytes
                    lastValidIndex = byteBuffer.length;
                    byteBuffer = new Uint8Array(0);
                  } catch (error) {
                    // If decoding fails, find the last valid UTF-8 character boundary
                    for (let i = byteBuffer.length - 1; i >= 0; i--) {
                      try {
                        const testBuffer = byteBuffer.slice(0, i + 1);
                        const testDecoded = new TextDecoder('utf-8', { fatal: true }).decode(testBuffer);
                        // If we reach here, this is a valid UTF-8 sequence
                        decodedText = testDecoded;
                        lastValidIndex = i + 1;
                        break;
                      } catch (testError) {
                        // Continue searching backwards
                      }
                    }
                    
                    // Keep remaining bytes for next iteration
                    if (lastValidIndex < byteBuffer.length) {
                      byteBuffer = byteBuffer.slice(lastValidIndex);
                    } else {
                      byteBuffer = new Uint8Array(0);
                    }
                  }
                    if (decodedText) {
                    console.log('[Console/executeFractalicFile] Decoded text:', JSON.stringify(decodedText));
                    
                    // Check for encoding issues
                    if (decodedText.includes('�')) {
                      console.warn('[Console/executeFractalicFile] Replacement characters detected - this should not happen with proper buffering');
                    }
                    
                    // Check for Cyrillic characters
                    if (/[\u0400-\u04FF]/.test(decodedText)) {
                      console.log('[Console/executeFractalicFile] Cyrillic characters successfully decoded:', decodedText.match(/[\u0400-\u04FF]+/g));
                    }
                    
                    // Process Rich library streaming patterns to prevent artifacts
                    let processedText = decodedText;
                    
                    // Detect Rich panel streaming patterns
                    const hasRichPatterns = (
                      processedText.includes('streaming...') ||
                      processedText.includes('━') ||
                      processedText.includes('┏') ||
                      /\x1b\[s.*?\x1b\[u/.test(processedText) || // cursor save/restore
                      /\x1b\[\d+;\d+H/.test(processedText) // absolute cursor positioning
                    );
                    
                    if (hasRichPatterns) {
                      console.log('[Console/executeFractalicFile] Rich library streaming detected - preprocessing ANSI sequences');
                      
                      // Handle Rich's cursor positioning more carefully
                      // Rich often uses cursor save/restore patterns that can cause artifacts
                      processedText = processedText.replace(/(\x1b\[s.*?\x1b\[u)/gs, (match) => {
                        // For streaming panels, preserve only essential positioning
                        const lines = match.split('\n');
                        if (lines.length > 1) {
                          // Keep the last complete line to avoid duplicates
                          const lastNonEmptyLine = lines.reverse().find(line => line.trim());
                          return lastNonEmptyLine || match;
                        }
                        return match;
                      });
                      
                      // Clean up redundant line clearing sequences
                      processedText = processedText.replace(/(\x1b\[2K\x1b\[1G)+/g, '\x1b\[2K\x1b\[1G');
                      
                      // Handle Rich's panel redraw patterns
                      processedText = processedText.replace(/(\x1b\[\d+;\d+H.*?┏.*?\n.*?streaming.*?\n)/gs, (match, offset, string) => {
                        // Check if this is a duplicate panel header
                        const beforeMatch = string.substring(0, offset);
                        const duplicatePattern = /┏.*?streaming.*?\n/g;
                        const previousMatches = (beforeMatch.match(duplicatePattern) || []).length;
                        
                        if (previousMatches > 0) {
                          // This is a duplicate header, only keep the content updates
                          const contentOnly = match.replace(/┏.*?\n/, '').replace(/┃.*?streaming.*?\n/, '');
                          return contentOnly;
                        }
                        return match;
                      });
                    }
                    
                    textBuffer += processedText;
                    onData(textBuffer);
                    textBuffer = '';
                  }
                }
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
            const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
            let byteBuffer = new Uint8Array(0);
            let textBuffer = '';

            function read() {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    // Process any remaining bytes in the buffer
                    if (byteBuffer.length > 0) {
                      try {
                        const finalText = decoder.decode(byteBuffer, { stream: false });
                        textBuffer += finalText;
                        console.log('[Console/handleSendCommand] Final buffer decoded:', JSON.stringify(finalText));
                      } catch (error) {
                        console.error('[Console/handleSendCommand] Error decoding final buffer:', error);
                      }
                    }
                    
                    if (textBuffer) {
                      onData(textBuffer);
                    }
                    onData(null); // Indicate end
                    return;
                  }
                  
                  if (value) {
                    // Append new bytes to buffer
                    const newBuffer = new Uint8Array(byteBuffer.length + value.length);
                    newBuffer.set(byteBuffer);
                    newBuffer.set(value, byteBuffer.length);
                    byteBuffer = newBuffer;
                    
                    // Try to decode as much as possible
                    let decodedText = '';
                    let lastValidIndex = 0;
                    
                    try {
                      // Attempt to decode the entire buffer
                      decodedText = decoder.decode(byteBuffer, { stream: true });
                      // If successful, we can use all bytes
                      lastValidIndex = byteBuffer.length;
                      byteBuffer = new Uint8Array(0);
                    } catch (error) {
                      // If decoding fails, find the last valid UTF-8 character boundary
                      for (let i = byteBuffer.length - 1; i >= 0; i--) {
                        try {
                          const testBuffer = byteBuffer.slice(0, i + 1);
                          const testDecoded = new TextDecoder('utf-8', { fatal: true }).decode(testBuffer);
                          // If we reach here, this is a valid UTF-8 sequence
                          decodedText = testDecoded;
                          lastValidIndex = i + 1;
                          break;
                        } catch (testError) {
                          // Continue searching backwards
                        }
                      }
                      
                      // Keep remaining bytes for next iteration
                      if (lastValidIndex < byteBuffer.length) {
                        byteBuffer = byteBuffer.slice(lastValidIndex);
                      } else {
                        byteBuffer = new Uint8Array(0);
                      }
                    }
                      if (decodedText) {
                      // Check for Cyrillic characters
                      if (/[\u0400-\u04FF]/.test(decodedText)) {
                        console.log('[Console/handleSendCommand] Cyrillic characters successfully decoded:', decodedText.match(/[\u0400-\u04FF]+/g));
                      }
                      
                      // Apply same Rich library processing as in executeFractalicFile
                      let processedText = decodedText;
                      
                      // Detect Rich panel streaming patterns
                      const hasRichPatterns = (
                        processedText.includes('streaming...') ||
                        processedText.includes('━') ||
                        processedText.includes('┏') ||
                        /\x1b\[s.*?\x1b\[u/.test(processedText) || // cursor save/restore
                        /\x1b\[\d+;\d+H/.test(processedText) // absolute cursor positioning
                      );
                      
                      if (hasRichPatterns) {
                        console.log('[Console/handleSendCommand] Rich library streaming detected - preprocessing ANSI sequences');
                        
                        // Handle Rich's cursor positioning patterns
                        processedText = processedText.replace(/(\x1b\[s.*?\x1b\[u)/gs, (match) => {
                          const lines = match.split('\n');
                          if (lines.length > 1) {
                            const lastNonEmptyLine = lines.reverse().find(line => line.trim());
                            return lastNonEmptyLine || match;
                          }
                          return match;
                        });
                        
                        // Clean up redundant line clearing
                        processedText = processedText.replace(/(\x1b\[2K\x1b\[1G)+/g, '\x1b\[2K\x1b\[1G');
                      }
                      
                      textBuffer += processedText;
                      onData(textBuffer);
                      textBuffer = '';
                    }
                  }
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
