import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './MarkdownViewer.module.css';
import MermaidDiagram from './MermaidDiagram';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  isDarkMode: boolean;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '', isDarkMode }) => {
  return (
    <ScrollArea className="h-full w-full">
      <div className={`${styles.markdownRoot} prose prose-invert max-w-none`}>
        <div className={styles.markdownContent}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                if (match && match[1] === 'mermaid') {
                  return <MermaidDiagram chart={String(children).trim()} isDarkMode={isDarkMode} />;
                }
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    wrapLongLines={true}
                    customStyle={{
                      margin: '1em 0',
                      //padding: '1em',
                      overflow: 'auto',
                      maxWidth: '100%'
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    className={className}
                    {...props}
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </ScrollArea>
  );
};

export default MarkdownViewer;