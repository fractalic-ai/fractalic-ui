import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MarkdownViewer.module.css';
import { transformCustomYAMLBlocks } from '../utils/transformCustomYAMLBlocks';
import MermaidDiagram from './MermaidDiagram';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  isDarkMode?: boolean;
  showLineNumbers?: boolean;
}

// Create a custom theme for regular code blocks
const customTomorrowTheme = {
  ...tomorrow,
  'code[class*="language-"]': {
    ...tomorrow['code[class*="language-"]'],
    backgroundColor: '#2d333b',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
    padding: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace'
  },
  'pre[class*="language-"]': {
    ...tomorrow['pre[class*="language-"]'],
    backgroundColor: '#2d333b',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
    padding: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace'
  }
};

// For custom operation blocks
const transparentTheme = {
  ...tomorrow,
  'code[class*="language-"]': {
    ...tomorrow['code[class*="language-"]'],
    backgroundColor: 'transparent',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
    padding: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace'
  },
  'pre[class*="language-"]': {
    ...tomorrow['pre[class*="language-"]'],
    backgroundColor: 'transparent',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
    padding: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace'
  }
};

// CSS class to inject
const customCSS = `
  /* Fix for line display in code blocks */
  .markdown-code-wrapper span[style*="display: flex"] {
    display: block !important;
  }
  
  .markdown-code-wrapper .react-syntax-highlighter-line-number {
    display: inline-block !important;
    min-width: 2.5em !important;
    padding-right: 1em !important;
    text-align: right !important;
    user-select: none !important;
    color: #6e7681 !important;
    border-right: 1px solid #444c56 !important;
    margin-right: 1em !important;
  }

  /* Mermaid styling */
  .mermaid {
    background-color: #2d333b;
    border-radius: 6px;
    padding: 16px;
    margin: 16px 0;
    border: 1px solid #444c56;
    overflow: auto;
  }
  
  .mermaid svg {
    display: block;
    margin: 0 auto;
  }

  /* List styling - improved for proper number alignment */
  .markdown-list {
    padding-left: 2em;
    margin: 1em 0;
    color: #adbac7;
  }
  
  .markdown-ordered-list {
    list-style-type: decimal;
    list-style-position: outside; /* Key property for proper alignment */
  }
  
  .markdown-unordered-list {
    list-style-type: disc;
    list-style-position: outside; /* Key property for proper alignment */
  }
  
  .markdown-list-item {
    margin: 0.25em 0;
    line-height: 1.6;
    display: list-item; /* Ensure proper list item display */
  }
  
  /* Fix for multi-line list items */
  .markdown-list-item > p {
    margin: 0;
    display: inline; /* Changed from inline-block to inline */
  }
  
  /* Nested lists */
  .markdown-list .markdown-list {
    margin: 0.25em 0 0.25em 1em;
  }
  
  .markdown-unordered-list .markdown-unordered-list {
    list-style-type: circle;
  }
  
  .markdown-unordered-list .markdown-unordered-list .markdown-unordered-list {
    list-style-type: square;
  }
  
  /* Tools Marketplace README specific styles */
  .tools-marketplace-readme .markdown-scroll-area {
    background: transparent !important;
    padding: 0 !important;
  }
  
  .tools-marketplace-readme .markdown-scroll-area > div {
    background: transparent !important;
    padding: 0 !important;
  }
  
  .tools-marketplace-readme .prose {
    background: transparent !important;
    padding: 0 !important;
  }
`;

// Style injector component
const StyleInjector = () => {
  useEffect(() => {
    const id = 'markdown-code-fix-styles';
    if (!document.getElementById(id)) {
      const styleElement = document.createElement('style');
      styleElement.id = id;
      styleElement.innerHTML = customCSS;
      document.head.appendChild(styleElement);
      
      return () => {
        const element = document.getElementById(id);
        if (element) document.head.removeChild(element);
      };
    }
  }, []);
  
  return null;
};

// Helper function to preserve line breaks in text
const preserveLineBreaks = (text: string) => {
  if (typeof text !== 'string') return text;
  
  const parts = text.split(/\n/).reduce((acc: React.ReactNode[], part, i, arr) => {
    if (i < arr.length - 1) {
      acc.push(part, <br key={i} />);
    } else {
      acc.push(part);
    }
    return acc;
  }, []);
  
  return <>{parts}</>;
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  content, 
  className = '', 
  isDarkMode = true,
  showLineNumbers = false
}) => {
  // Reference to track rendered mermaid diagrams
  const mermaidRef = useRef<HTMLDivElement>(null);
  // Store mermaid diagrams content
  const [mermaidDiagrams, setMermaidDiagrams] = useState<Map<string, string>>(new Map());
  
  // Effect to extract mermaid diagrams from content
  useEffect(() => {
    const extractMermaidDiagrams = () => {
      const diagramMap = new Map<string, string>();
      
      // Find all mermaid code blocks in the content
      const regex = /```mermaid\n([\s\S]*?)```/g;
      let match;
      let index = 0;
      
      while ((match = regex.exec(content)) !== null) {
        const id = `mermaid-${index++}`;
        diagramMap.set(id, match[1].trim());
      }
      
      setMermaidDiagrams(diagramMap);
    };
    
    extractMermaidDiagrams();
  }, [content]);
  
  // Preprocess the markdown source before rendering
  const transformedContent = transformCustomYAMLBlocks(content);

  // Add an effect to apply styles directly to scrollbar elements
  useEffect(() => {
    const addScrollbarStyles = () => {
      const styleId = 'markdown-scrollbar-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* Make scrollbar visible */
          .markdown-scroll-area [data-radix-scroll-area-viewport] {
            height: 100% !important;
            width: 100% !important;
          }
          
          /* Target the actual scrollbar classes from Radix UI */
          .markdown-scroll-area [data-orientation="vertical"] {
            position: absolute !important;
            z-index: 50 !important; 
            pointer-events: auto !important;
            opacity: 1 !important;
            right: 2px !important;
            width: 8px !important;
            background: transparent !important;
            display: flex !important;
            visibility: visible !important;
            transition: opacity 0.15s;
          }
          
          /* Target the thumb */
          .markdown-scroll-area [data-orientation="vertical"] > div {
            background-color: rgba(255, 255, 255, 0.3) !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            width: 6px !important;
            border-radius: 3px !important;
            flex: 1;
          }
          
          /* Show more visible thumb on hover */
          .markdown-scroll-area:hover [data-orientation="vertical"] > div {
            background-color: rgba(255, 255, 255, 0.5) !important;
          }
        `;
        document.head.appendChild(style);
      }
    };
    
    addScrollbarStyles();
    
    return () => {
      const styleElement = document.getElementById('markdown-scrollbar-fix');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  return (
    <ScrollArea 
      className="h-full w-full relative pb-12 markdown-scroll-area" 
      scrollHideDelay={0}
      style={{ 
        position: "relative",
        ...(className?.includes('tools-marketplace-readme') ? {
          background: 'transparent',
          padding: 0
        } : {})
      }}
    >
      <StyleInjector />
      <div ref={mermaidRef} className={`${styles.markdownRoot} prose prose-invert max-w-none`} style={{
        ...(className?.includes('tools-marketplace-readme') ? {
          background: 'transparent',
          padding: 0
        } : {})
      }}>
        <div className={`${styles.markdownContent} ${className}`} style={{
          ...(className?.includes('tools-marketplace-readme') ? {
            background: 'transparent',
            padding: 0
          } : {})
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                
                // Check if this is a mermaid diagram
                if (match && match[1] === 'mermaid') {
                  const diagramContent = String(children).trim();
                  const diagramId = Object.keys(Object.fromEntries(mermaidDiagrams))
                    .find(key => mermaidDiagrams.get(key) === diagramContent);
                    
                  // If we have an ID, use the MermaidDiagram component
                  if (diagramId) {
                    return <MermaidDiagram 
                      key={diagramId} 
                      chart={diagramContent} 
                      isDarkMode={isDarkMode} 
                    />;
                  }
                  
                  // Fallback to simple mermaid rendering
                  return <pre className="mermaid">{diagramContent}</pre>;
                }

                // Handle code blocks with syntax highlighting
                if (!inline && match) {
                  // Check if this is a custom operation block
                  const codeContent = String(children).trim();
                  const allowedPrefixes = ['@run', '@llm', '@goto', '@shell', '@import', '@return', '@operation'];
                  const isCustomOperation = allowedPrefixes.some(prefix => 
                    codeContent.startsWith(prefix)
                  );
                  
                  // Check if this block should show line numbers
                  const hasLineNumbersMeta = /\{showLineNumbers(=true|=false)?\}/.test(className || '');
                  const lineNumbersDisabled = /\{showLineNumbers=false\}/.test(className || '');
                  const lineNumbersEnabled = hasLineNumbersMeta && !lineNumbersDisabled;
                  
                  // Determine whether to show line numbers for this block
                  const shouldShowLineNumbers = lineNumbersEnabled || (showLineNumbers && !lineNumbersDisabled);
                  
                  // Set styles directly on the container for better control
                  const wrapperStyle: React.CSSProperties = {
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #444c56',
                    width: '100%',
                    maxWidth: '100%'
                  };
                  
                  // Apply special styling for custom operations
                  if (isCustomOperation) {
                    Object.assign(wrapperStyle, {
                      boxShadow: 'rgba(0, 0, 0, 0.5) 0px 0px 10px 0px inset',
                      backgroundImage: 'radial-gradient(rgb(60, 60, 62) 0.5px, rgba(0, 0, 0, 0) 0.5px), radial-gradient(rgb(67, 67, 69) 0.5px, rgb(16, 25, 50) 0.5px)',
                      backgroundSize: '20px 20px, 20px 20px',
                      backgroundPosition: '0px 0px, 10px 10px',
                      backgroundColor: 'rgb(16, 25, 50)',
                      opacity: 0.8
                    });
                  }
                  
                  const codeBlockStyle: React.CSSProperties = {
                    margin: 0,
                    padding: '1rem',
                    width: '100%',
                    backgroundColor: isCustomOperation ? 'transparent' : '#2d333b',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  };
                  
                  return (
                    <div 
                      className="markdown-code-wrapper" 
                      style={wrapperStyle}
                    >
                      <SyntaxHighlighter
                        style={isCustomOperation ? transparentTheme : customTomorrowTheme}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                        customStyle={codeBlockStyle}
                        showLineNumbers={shouldShowLineNumbers}
                        wrapLongLines={true}
                        lineNumberStyle={{
                          minWidth: '2.5em',
                          paddingRight: '1em',
                          textAlign: 'right',
                          userSelect: 'none',
                          color: '#6e7681',
                          borderRight: '1px solid #444c56',
                          marginRight: '1em'
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                // Handle inline code
                return (
                  <code
                    className={`${styles.inlineCode} ${className || ''}`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              
              // Other component renderers...
              a({ node, children, href, ...props }) {
                return (
                  <a 
                    href={href} 
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
              
              img({ src, alt, ...props }) {
                return (
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    loading="lazy"
                    className={styles.markdownImage}
                    {...props} 
                  />
                );
              },
              
              table({ children }) {
                return (
                  <div className={styles.tableContainer}>
                    <table className={styles.markdownTable}>{children}</table>
                  </div>
                );
              },
              
              td({ children, ...props }) {
                return (
                  <td 
                    className={styles.markdownTableCell} 
                    {...props}
                  >
                    {children}
                  </td>
                );
              },
              
              p({ children, node }) {
                // We don't want to use the special handling of line breaks in list items
                if (node.parent && (node.parent.type === "listItem")) {
                  return <p>{children}</p>;
                }
                
                return (
                  <p className={styles.markdownParagraph}>
                    {typeof children === 'string' ? preserveLineBreaks(children) : children}
                  </p>
                );
              },
              
              br() {
                return <br />;
              },
              
              h1({ children, ...props }) {
                return <h1 className={styles.markdownHeading} {...props}>{children}</h1>;
              },
              
              h2({ children, ...props }) {
                return <h2 className={styles.markdownHeading} {...props}>{children}</h2>;
              },
              
              h3({ children, ...props }) {
                return <h3 className={styles.markdownHeading} {...props}>{children}</h3>;
              },
              
              h4({ children, ...props }) {
                return <h4 className={styles.markdownHeading} {...props}>{children}</h4>;
              },
              
              h5({ children, ...props }) {
                return <h5 className={styles.markdownHeading} {...props}>{children}</h5>;
              },
              
              h6({ children, ...props }) {
                return <h6 className={styles.markdownHeading} {...props}>{children}</h6>;
              },
              
              // Update the li component renderer - make it extremely simple
              li({ children, ...props }) {
                return (
                  <li className="markdown-list-item" {...props}>
                    {children}
                  </li>
                );
              },
              
              ul({ children, ...props }) {
                return (
                  <ul className="markdown-list markdown-unordered-list" {...props}>
                    {children}
                  </ul>
                );
              },
              
              ol({ children, ...props }) {
                return (
                  <ol className="markdown-list markdown-ordered-list" {...props}>
                    {children}
                  </ol>
                );
              }
            }}
          >
            {transformedContent}
          </ReactMarkdown>
          <div className={styles.bottomPadding}></div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MarkdownViewer;