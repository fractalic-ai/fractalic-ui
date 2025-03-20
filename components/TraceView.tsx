import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import path from 'path';

interface TraceViewProps {
  repoPath: string;
  callTree?: any[];
  traceFile?: string;
  traceCommitHash?: string;
  content?: string;
  className?: string;
}

export const TraceView: React.FC<TraceViewProps> = ({
  repoPath,
  callTree,
  traceFile,
  traceCommitHash,
  content,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceContentTree, setTraceContentTree] = useState<any | null>(null);
  const [singleTraceContent, setSingleTraceContent] = useState<string | null>(null);

  useEffect(() => {
    // If direct content is provided, use it
    if (content) {
      setSingleTraceContent(content);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const fetchTraceContents = async () => {
      try {
        // Process call tree to get all trace files
        if (callTree && callTree.length > 0) {
          // Create a clean tree structure with just the root node
          const rootNode = callTree[0];
          const treeWithContents = await extractTraceContents(rootNode);
          setTraceContentTree(treeWithContents);
        } 
        // Legacy single trace file mode
        else if (traceFile && traceCommitHash) {
          const response = await fetch(
            `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
              repoPath
            )}&file_path=${encodeURIComponent(traceFile)}&commit_hash=${traceCommitHash}`
          );
          
          if (response.ok) {
            const content = await response.text();
            setSingleTraceContent(content);
          } else {
            throw new Error(`Failed to fetch trace file: ${response.statusText}`);
          }
        }
      } catch (err) {
        const errorMessage = `Error fetching trace content: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTraceContents();
  }, [repoPath, callTree, traceFile, traceCommitHash, content]);

  // Function to recursively extract trace file contents from the call tree
  const extractTraceContents = async (node: any): Promise<any> => {
    // Create a clean structure for this node
    const cleanNode: any = {
      id: node.id || node.filename || node.operation,
      text: node.text || node.filename || node.operation,
    };
    
    // If this node has a trace file, fetch it
    if (node.trc_file && node.trc_commit_hash) {
      try {
        const response = await fetch(
          `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
            repoPath
          )}&file_path=${encodeURIComponent(node.trc_file)}&commit_hash=${node.trc_commit_hash}`
        );
        
        if (response.ok) {
          cleanNode.trace_content = await response.text();
        } else {
          cleanNode.trace_error = `Failed to fetch trace file: ${response.status} ${response.statusText}`;
        }
      } catch (error) {
        cleanNode.trace_error = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    // Process children recursively
    if (node.children && node.children.length > 0) {
      cleanNode.children = [];
      
      for (const child of node.children) {
        const childWithContent = await extractTraceContents(child);
        cleanNode.children.push(childWithContent);
      }
    }
    
    return cleanNode;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading trace files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100/10 text-red-400 rounded-md border border-red-300/20">
        {error}
      </div>
    );
  }

  // Display hierarchical trace files
  if (traceContentTree) {
    return (
      <div className="trace-view-container">
        <h2 className="text-xl font-bold mb-4">Trace Files</h2>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(traceContentTree, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    );
  }

  // Display single trace file (legacy mode)
  if (singleTraceContent) {
    return (
      <div className="trace-view-container">
        <h2 className="text-xl font-bold mb-4">Trace File</h2>
        {traceFile && (
          <div className="mb-2 text-sm">
            <div><strong>File:</strong> {path.basename(traceFile)}</div>
            <div><strong>Commit Hash:</strong> {traceCommitHash}</div>
          </div>
        )}
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
            {singleTraceContent}
          </pre>
        </ScrollArea>
      </div>
    );
  }

  return <p className="text-muted-foreground p-4">No trace information available.</p>;
};

export default TraceView;