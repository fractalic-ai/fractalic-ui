// DynamicTerminal.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import path from 'path';
import 'xterm/css/xterm.css';

interface DynamicTerminalProps {
  onSendCommand: (command: string, onData: (chunk: string | null) => void) => void;
  onExecuteFile: (onData: (chunk: string | null) => void) => void;
  currentPath: string;
  currentFilePath: string;
  onSpecialOutput: (branchId: string, fileHash: string, filePath: string) => void;
  initializedRef: React.MutableRefObject<boolean>;
  triggerCommand?: string;
}

function DynamicTerminal(props: DynamicTerminalProps) {
  const {
    onSendCommand,
    onExecuteFile,
    currentPath,
    currentFilePath,
    onSpecialOutput,
    initializedRef,
    triggerCommand,
  } = props;

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>('');
  const currentWorkingDirRef = useRef<string>(currentPath);
  const lastTriggerCommandRef = useRef<string | undefined>(undefined);

  const updatePrompt = useCallback(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(`${currentWorkingDirRef.current}$ `);
    }
  }, []);
  const handleTerminalData = useCallback(
    (data: string) => {
      console.log('[DynamicTerminal] handleTerminalData received:', JSON.stringify(data));
      // Run the regex on the raw data
      const regex = /\[EventMessage: Root-Context-Saved\] ID: ([\w-]+), (\w+)/;
      const match = data.match(regex);
      if (match) {
        console.log('[DynamicTerminal] EventMessage matched:', match);
        const [, branchId, fileHash] = match;
        console.log('[DynamicTerminal] Calling onSpecialOutput with:', { branchId, fileHash, currentFilePath });
        onSpecialOutput(branchId, fileHash, currentFilePath);
      } else {
        // Check if data contains the EventMessage pattern but doesn't match
        if (data.includes('[EventMessage: Root-Context-Saved]')) {
          console.log('[DynamicTerminal] EventMessage found but regex failed to match. Data:', JSON.stringify(data));
          console.log('[DynamicTerminal] Regex used:', regex.toString());
        }
      }
      // Write the raw data to the terminal (no cleaning for event parsing)
      terminalInstanceRef.current?.write(data);
    },
    [onSpecialOutput, currentFilePath]
  );

  const handleFileExecution = useCallback(() => {
    if (currentFilePath) {
      const newWorkingDir = path.dirname(currentFilePath);
      if (newWorkingDir !== currentWorkingDirRef.current) {
        currentWorkingDirRef.current = newWorkingDir;
        terminalInstanceRef.current?.writeln(`Changing directory to: ${newWorkingDir}`);
      }
    }
  }, [currentFilePath]);  // Handle triggerCommand changes
  useEffect(() => {
    if (triggerCommand && triggerCommand !== lastTriggerCommandRef.current) {
      console.log('[DynamicTerminal] Trigger command changed from', lastTriggerCommandRef.current, 'to', triggerCommand);
      lastTriggerCommandRef.current = triggerCommand;
      if (currentFilePath) {
        console.log('[DynamicTerminal] onExecuteFile called from triggerCommand effect');
        // Clear the terminal before executing
        terminalInstanceRef.current?.clear();
        // Execute the file regardless of the command value
        onExecuteFile((chunk) => {
          console.log('[DynamicTerminal] onExecuteFile received chunk:', chunk);
          if (chunk === null) {
            // End of stream
            updatePrompt();
            return;
          }
          // Use handleTerminalData instead of writing directly to ensure regex matching
          handleTerminalData(chunk);
        });
      } else {
        console.log('[DynamicTerminal] No currentFilePath, cannot execute');
      }
    }
  }, [triggerCommand, currentFilePath, onExecuteFile, updatePrompt, handleTerminalData]);

  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstanceRef.current) return;

    const newTerminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
      },
      convertEol: true, // Convert line endings to \n
      cols: 80, // Set a reasonable default width
    });

    const fitAddon = new FitAddon();
    newTerminal.loadAddon(fitAddon);
    newTerminal.open(terminalRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = newTerminal;
    fitAddonRef.current = fitAddon;

    // Only execute initial command if not already initialized
    if (!initializedRef.current && currentFilePath) {
      const isEditMode = window.location.pathname.includes('/edit');
      if (isEditMode) {
        handleFileExecution();
        onExecuteFile((chunk) => {
          if (chunk === null) {
            updatePrompt();
            initializedRef.current = true;
          } else {
            handleTerminalData(chunk);
          }
        });
      }
    } else {
      updatePrompt();
      initializedRef.current = true;
    }

    newTerminal.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 13) {
        // Enter key
        newTerminal.write('\r\n');
        const command = inputBufferRef.current;
        inputBufferRef.current = '';
        onSendCommand(command, (chunk) => {
          if (chunk === null) {
            updatePrompt();
          } else {
            handleTerminalData(chunk);
          }
        });
      } else if (code === 127) {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          newTerminal.write('\b \b');
        }
      } else if (code < 32) {
        // Ignore other control chars
      } else {
        inputBufferRef.current += data;
        newTerminal.write(data);
      }
    });
  }, [
    handleFileExecution,
    onSendCommand,
    onExecuteFile,
    handleTerminalData,
    updatePrompt,
    initializedRef,
    currentFilePath,
  ]);

  useEffect(() => {
    initializeTerminal();
    const resizeObserver = new ResizeObserver(() => {
      if (terminalRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [initializeTerminal]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}

export default DynamicTerminal;
