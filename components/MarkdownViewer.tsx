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

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  content, 
  className = '', 
  isDarkMode = true 
}) => {
  return (
    <ScrollArea className="h-full w-full relative pb-8" scrollHideDelay={0}>
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
                          marginTop: '0.75rem',
                          marginBottom: '0.75rem', 
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
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
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
                    style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
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
              
              // Ensure paragraphs have proper spacing and word wrapping
              p({ children }) {
                return (
                  <p className={styles.markdownParagraph}>
                    {children}
                  </p>
                );
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
              }
            }}
          >
            {content}
          </ReactMarkdown>
          {/* Add bottom padding to ensure last item is visible */}
          <div className={styles.bottomPadding}></div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MarkdownViewer;