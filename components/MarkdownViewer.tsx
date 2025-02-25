import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MarkdownViewer.module.css';
import MermaidDiagram from './MermaidDiagram';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  isDarkMode?: boolean;
}

const customTomorrowTheme = {
  ...tomorrow,
  'code[class*="language-"]': {
    ...tomorrow['code[class*="language-"]'],
    backgroundColor: '#2d333b',
    color: '#adbac7',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word'
  },
  'pre[class*="language-"]': {
    ...tomorrow['pre[class*="language-"]'],
    backgroundColor: '#2d333b',
    color: '#adbac7',
    margin: '0',
    padding: '1rem',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word'
  }
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
  isDarkMode = true 
}) => {
  return (
    <ScrollArea className="h-full w-full relative pb-12" scrollHideDelay={0}>
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
                  return (
                    <div className={styles.codeWrapper}>
                      <SyntaxHighlighter
                        style={customTomorrowTheme}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                        wrapLongLines={true}
                        customStyle={{
                          marginTop: '1rem',
                          marginBottom: '1rem', 
                          padding: '1rem',
                          width: '100%',
                          overflow: 'auto',
                          backgroundColor: '#2d333b',
                          border: '1px solid #444c56',
                          borderRadius: '6px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word'
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
              
              // Improve link rendering with proper wrapping
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
              
              // Improve image rendering
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
              
              // Fix table rendering to respect content width
              table({ children }) {
                return (
                  <div className={styles.tableContainer}>
                    <table className={styles.markdownTable}>{children}</table>
                  </div>
                );
              },
              
              // Improve table cells to handle text wrapping
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
              
              // Ensure paragraphs preserve line breaks
              p({ children }) {
                // Pass the children through our helper function to preserve line breaks
                return (
                  <p className={styles.markdownParagraph}>
                    {typeof children === 'string' ? preserveLineBreaks(children) : children}
                  </p>
                );
              },
              
              // Handle line breaks directly
              br() {
                return <br />;
              },
              
              // Add proper heading wrapping
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
              
              // Preserve line breaks in list items but prevent excessive spacing
              li({ children, ...props }) {
                return (
                  <li {...props}>
                    {React.Children.map(children, child => {
                      // Only apply preserveLineBreaks to plain strings, not elements
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
            {content}
          </ReactMarkdown>
          {/* Add increased bottom padding to ensure last item is visible */}
          <div className={styles.bottomPadding}></div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MarkdownViewer;