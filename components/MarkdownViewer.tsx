import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MarkdownViewer.module.css';
import MermaidDiagram from './MermaidDiagram';
import { transformCustomYAMLBlocks } from '../utils/transformCustomYAMLBlocks';

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
    padding: 0
  },
  'pre[class*="language-"]': {
    ...tomorrow['pre[class*="language-"]'],
    backgroundColor: '#2d333b',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
    padding: 0
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
`;

// Style injector component
const StyleInjector = () => {
  React.useEffect(() => {
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
  
  // Split text by newlines and wrap with React fragments to preserve breaks
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
  showLineNumbers = true
}) => {
  // Preprocess the markdown source before rendering
  const transformedContent = transformCustomYAMLBlocks(content);

  return (
    <ScrollArea className="h-full w-full relative pb-12" scrollHideDelay={0}>
      <StyleInjector />
      <div className={`${styles.markdownRoot} prose prose-invert max-w-none`}>
        <div className={`${styles.markdownContent} ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                
                // Handle Mermaid diagrams
                if (match && match[1] === 'mermaid') {
                  return <MermaidDiagram chart={String(children).trim()} isDarkMode={isDarkMode} />;
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
                    overflow: 'hidden', // Ensure content doesn't overflow rounded corners
                    border: '1px solid #444c56',
                    width: '100%',
                    maxWidth: '100%' // Ensure it doesn't exceed container
                  };
                  
                  // Apply special styling for custom operations
                  if (isCustomOperation) {
                    Object.assign(wrapperStyle, {
                      boxShadow: 'rgba(0, 0, 0, 0.5) 0px 0px 10px 0px inset',
                      backgroundImage: 'radial-gradient(rgb(60, 60, 62) 0.5px, rgba(0, 0, 0, 0) 0.5px), radial-gradient(rgb(67, 67, 69) 0.5px, rgb(16, 25, 50) 0.5px)',
                      backgroundSize: '20px 20px, 20px 20px',
                      backgroundPosition: '0px 0px, 10px 10px',
                      backgroundColor: 'rgb(16, 25, 50)', // #101932
                      opacity: 0.8
                    });
                  }
                  
                  // Style for the SyntaxHighlighter itself
                  const codeBlockStyle: React.CSSProperties = {
                    margin: 0,
                    padding: '1rem',
                    width: '100%',
                    backgroundColor: isCustomOperation ? 'transparent' : '#2d333b',
                    // Always wrap text for all code blocks
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
                        style={customTomorrowTheme}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                        customStyle={codeBlockStyle}
                        showLineNumbers={shouldShowLineNumbers}
                        wrapLongLines={true}  // Always wrap lines
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
              
              // Rest of the component renderers remain unchanged
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
              
              p({ children }) {
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
              
              li({ children, ...props }) {
                return (
                  <li {...props}>
                    {React.Children.map(children, child => {
                      if (typeof child === 'string') {
                        return preserveLineBreaks(child);
                      }
                      return child;
                    })}
                  </li>
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