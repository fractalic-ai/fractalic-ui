// DynamicTerminal.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import path from 'path';
import 'xterm/css/xterm.css';

interface DynamicTerminalProps {
  onSendCommand: (command: string, onData: (chunk: string | null) => void) => void;
  currentPath: string;
  currentFilePath: string;
  initialCommand?: string;
  onSpecialOutput: (branchId: string, fileHash: string, filePath: string) => void;
  initializedRef: React.MutableRefObject<boolean>;
}

function DynamicTerminal(props: DynamicTerminalProps) {
  const {
    onSendCommand,
    currentPath,
    currentFilePath,
    initialCommand,
    onSpecialOutput,
    initializedRef,
  } = props;

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>('');
  const currentWorkingDirRef = useRef<string>(currentPath);

  const updatePrompt = useCallback(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(`${currentWorkingDirRef.current}$ `);
    }
  }, []);

  const handleTerminalData = useCallback(
    (data: string) => {
      const regex = /\[EventMessage: Root-Context-Saved\] ID: ([\w-]+), (\w+)/;
      const match = data.match(regex);
      if (match) {
        const [, branchId, fileHash] = match;
        onSpecialOutput(branchId, fileHash, currentFilePath);
      }
      terminalInstanceRef.current?.write(data);
    },
    [onSpecialOutput, currentFilePath]
  );

  const handleFileExecution = useCallback(() => {
    if (currentFilePath) {
      const newWorkingDir = path.dirname(currentFilePath);
      if (newWorkingDir !== currentWorkingDirRef.current) {
        currentWorkingDirRef.current = newWorkingDir;
        terminalInstanceRef.current?.writeln(`\r\nChanging directory to: ${newWorkingDir}`);
      }
    }
  }, [currentFilePath]);

  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstanceRef.current) return;

    console.log('Initializing terminal');
    const newTerminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
        
       /*
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        // Add full ANSI color palette
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
        */
      },
      allowProposedApi: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      scrollback: 1000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    newTerminal.loadAddon(fitAddon);

    newTerminal.open(terminalRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = newTerminal;
    fitAddonRef.current = fitAddon;

    newTerminal.writeln('Terminal initialized. Ready for commands.');

    // If there's an initial command and not yet initialized
    if (!initializedRef.current && initialCommand) {
      if (initialCommand === '__INITIAL__') {
        handleFileExecution();
        onSendCommand(initialCommand, (chunk) => {
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
    initialCommand,
    handleFileExecution,
    onSendCommand,
    handleTerminalData,
    updatePrompt,
    initializedRef,
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
