// DynamicTerminal.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
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
  }, []);  const handleTerminalData = useCallback(
    (data: string) => {
      console.log('[DynamicTerminal] handleTerminalData received:', JSON.stringify(data));
      
      // Debug UTF-8 encoding
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
      const bytes = encoder.encode(data);
      const reconstructed = decoder.decode(bytes);
      
      if (data !== reconstructed) {
        console.log('[DynamicTerminal] UTF-8 encoding mismatch detected');
        console.log('[DynamicTerminal] Original:', JSON.stringify(data));
        console.log('[DynamicTerminal] Reconstructed:', JSON.stringify(reconstructed));
        console.log('[DynamicTerminal] Bytes:', Array.from(bytes));
      }
      
      // Check for Cyrillic characters and potential encoding issues
      if (/[\u0400-\u04FF]/.test(data)) {
        console.log('[DynamicTerminal] ✅ Cyrillic characters detected and properly decoded:', data.match(/[\u0400-\u04FF]+/g));
      }
      
      if (data.includes('�')) {
        console.warn('[DynamicTerminal] ❌ Replacement characters detected - UTF-8 buffering may have failed:', JSON.stringify(data));
      }
        // Debug Python Rich library ANSI sequences
      if (/\x1b\[[0-9;]*m/.test(data)) {
        const ansiSequences = data.match(/\x1b\[[0-9;]*m/g);
        console.log('[DynamicTerminal] 🎨 ANSI escape sequences detected (Rich formatting):', ansiSequences);
        console.log('[DynamicTerminal] 🎨 Full data with ANSI:', JSON.stringify(data.substring(0, 200)) + (data.length > 200 ? '...' : ''));
      }
      
      // Check for Rich library specific patterns
      if (data.includes('╭') || data.includes('╰') || data.includes('│') || data.includes('┌') || data.includes('└')) {
        console.log('[DynamicTerminal] 📦 Rich library box drawing characters detected');
      }
      
      // Check for Rich color codes specifically
      if (/\x1b\[38;2;/.test(data)) {
        console.log('[DynamicTerminal] 🌈 24-bit color codes detected (Rich truecolor)');
      }
      
      // Check for Rich styling codes
      if (/\x1b\[1m/.test(data)) {
        console.log('[DynamicTerminal] 💪 Bold text detected');
      }
      if (/\x1b\[3m/.test(data)) {
        console.log('[DynamicTerminal] 📐 Italic text detected');
      }
      if (/\x1b\[4m/.test(data)) {
        console.log('[DynamicTerminal] ➖ Underlined text detected');
      }
      
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
    if (!terminalRef.current || terminalInstanceRef.current) return;    const newTerminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        // Extended color palette for Rich library
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff8080',
        brightGreen: '#80ff80',
        brightYellow: '#ffff80',
        brightBlue: '#8080ff',
        brightMagenta: '#ff80ff',
        brightCyan: '#80ffff',
        brightWhite: '#ffffff',
        // Selection colors for proper text selection
        selection: 'rgba(255, 255, 255, 0.3)',
        selectionForeground: '#ffffff',
      },
      convertEol: true,
      scrollback: 10000,
      // Enhanced support for Python Rich library
      allowProposedApi: true, // Enable proposed APIs for better formatting support
      allowTransparency: false, // Better color rendering
      drawBoldTextInBrightColors: true, // Support for Rich's bold styling
      rightClickSelectsWord: true, // Better text selection
      wordSeparator: ' ()[]{}|;:.,!?', // Improved word boundaries for Rich panels
      altClickMovesCursor: false, // Prevent interference with Rich interactions
      // ANSI and color support for Rich library
      screenReaderMode: false, // Better performance with Rich formatting
      windowOptions: {
        setWinLines: false, // Prevent Rich from changing terminal size
      },
      // Terminal capabilities for proper ANSI support
      macOptionIsMeta: true,
      macOptionClickForcesSelection: false,
      // Box drawing character support
      lineHeight: 1.0,
      letterSpacing: 0,
      // Ensure proper text selection behavior
      minimumContrastRatio: 1, // Don't modify colors for contrast
      disableStdin: false, // Allow input
      // Better ANSI color support
      windowsMode: false,
    });

    const fitAddon = new FitAddon();
    const unicodeAddon = new Unicode11Addon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    
    newTerminal.loadAddon(fitAddon);
    newTerminal.loadAddon(unicodeAddon);
    newTerminal.loadAddon(webLinksAddon);
    newTerminal.loadAddon(searchAddon);    // Set Unicode version to 11 for better emoji and international character support
    newTerminal.unicode.activeVersion = '11';
      // Enhanced ANSI support for Python Rich library
    // Enable 24-bit color support (truecolor) for Rich's advanced styling
    newTerminal.options.windowOptions = { setWinLines: false };
      newTerminal.open(terminalRef.current);
    fitAddon.fit();
    
    // Force xterm to report proper terminal capabilities to help Rich detect color support
    // This is crucial for Python Rich to enable formatting
    console.log('[DynamicTerminal] Terminal capabilities configured for Rich library support');
    console.log('[DynamicTerminal] - Colors: 256 colors + truecolor support');
    console.log('[DynamicTerminal] - Unicode: Version 11 support'); 
    console.log('[DynamicTerminal] - ANSI: Full escape sequence support');
    console.log('[DynamicTerminal] - Text selection: Enabled with proper color preservation');
    
    // Log terminal info for debugging
    console.log('[DynamicTerminal] Terminal dimensions:', {
      cols: newTerminal.cols,
      rows: newTerminal.rows
    });

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
        // Set CSS custom properties for terminal colors
        '--xterm-background': '#1a1a1a',
        '--xterm-foreground': '#ffffff',
      } as React.CSSProperties}
    />
  );
}

export default DynamicTerminal;
