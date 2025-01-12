import React, { useRef, useEffect } from 'react';
import { useMonaco } from '../hooks/useMonaco';

interface MonacoPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  showLineNumbers: boolean;
  wordWrap: boolean;
  placeholder?: string;
  onFocusChange?: (focused: boolean) => void;
  isOperationEditor?: boolean;
}

const MonacoPromptEditor: React.FC<MonacoPromptEditorProps> = ({
  value,
  onChange,
  wordWrap,
  showLineNumbers,
  placeholder = '',
  onFocusChange,
  isOperationEditor = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const disposablesRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const decorationsRef = useRef<any>(null);
  const { isLoading, error, monaco } = useMonaco();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disposablesRef.current.forEach(d => d.dispose());
      if (editorRef.current) {
        editorRef.current.dispose();
      }
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading || error || !containerRef.current || !monaco || !mountedRef.current) return;

    const initEditor = async () => {
      if (editorRef.current) return;

      try {
        const uri = monaco.Uri.parse(`file:///prompt-${Date.now()}.txt`);
        modelRef.current = monaco.editor.getModel(uri) || monaco.editor.createModel(value, 'markdown', uri);
        modelRef.current.setValue(value);

        editorRef.current = monaco.editor.create(containerRef.current!, {
          model: modelRef.current,
          theme: 'vs-dark',
          fontSize: 14,
          lineHeight: 21,
          fontFamily: "'SF Mono', Menlo, Monaco, 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? 'on' : 'off',
          lineNumbers: showLineNumbers ? 'on' : 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: showLineNumbers ? 28 : 0,
          lineNumbersMinChars: 2,
          renderLineHighlight: 'none',
          scrollbar: {
            vertical: 'hidden',
            horizontal: wordWrap ? 'hidden' : 'auto',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalScrollbarSize: 0,

            horizontalScrollbarSize: 4,
            handleMouseWheel: !wordWrap, 

            //handleMouseWheel: false, // Disable mouse wheel handling
            alwaysConsumeMouseWheel: false // Prevent scroll event capture
        
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          automaticLayout: false,
          contextmenu: false,
          links: false,
          quickSuggestions: false,
          renderWhitespace: 'none',
          occurrencesHighlight: false,
          selectionHighlight: false,
          codeLens: false,
          roundedSelection: false,
          padding: { top: 4, bottom: 4 },
        });

        disposablesRef.current.push(
          modelRef.current.onDidChangeContent(() => {
            const newValue = modelRef.current.getValue();
            onChange(newValue);
            updatePlaceholder();
            handleResize();
          }),
          editorRef.current.onDidFocusEditorText(() => onFocusChange?.(true)),
          editorRef.current.onDidBlurEditorText(() => onFocusChange?.(false))
        );

        updatePlaceholder();
        handleResize();

        containerRef.current?.addEventListener('click', () => {
          editorRef.current?.focus();
        });
      } catch (err) {
        console.error('Failed to initialize Monaco editor:', err);
      }
    };

    initEditor();
  }, [isLoading, error, monaco, onChange, placeholder, value, showLineNumbers, onFocusChange, wordWrap]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: wordWrap ? 'on' : 'off',
        lineNumbers: showLineNumbers ? 'on' : 'off',
        lineDecorationsWidth: showLineNumbers ? 28 : 0,
      });
      handleResize();
    }
  }, [wordWrap, showLineNumbers]);

  const updatePlaceholder = () => {
    if (!editorRef.current || !monaco || !placeholder) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (!value) {
      decorationsRef.current = editorRef.current.createDecorationsCollection([{
        range: new monaco.Range(1, 1, 1, 1),
        options: {
          after: {
            content: placeholder,
            inlineClassName: 'placeholder'
          }
        }
      }]);
    }
  };

  const handleResize = () => {
    if (!editorRef.current || !containerRef.current) return;

    requestAnimationFrame(() => {
      const contentHeight = Math.max(editorRef.current.getContentHeight(), 24);
      if (containerRef.current) {
        containerRef.current.style.height = `${contentHeight}px`;
      }
      editorRef.current.layout();
    });
  };

  useEffect(() => {
    if (modelRef.current && value !== modelRef.current.getValue()) {
      modelRef.current.setValue(value);
      updatePlaceholder();
      handleResize();
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className={`min-h-[24px] w-full ${isOperationEditor ? 'operation-editor' : ''}`}
      style={{ minHeight: '24px' }}
    />
  );
};

export default MonacoPromptEditor;