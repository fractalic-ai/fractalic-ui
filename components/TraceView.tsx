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
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allTraceContents, setAllTraceContents] = useState<any | null>(null);
  const [singleTraceContent, setSingleTraceContent] = useState<string | null>(null);

  useEffect(() => {
    console.log("TraceView props:", {
      repoPath,
      hasCallTree: !!callTree,
      callTreeLength: callTree?.length || 0,
      traceFile,
      traceCommitHash,
      hasContent: !!content,
    });

    // If direct content is provided, use it
    if (content) {
      setSingleTraceContent(content);
      return;
    }

    // Process call tree or single file
    setIsLoading(true);
    setError(null);

    const fetchTraceFiles = async () => {
      try {
        // If callTree is provided, process all trace files in the tree
        if (callTree && callTree.length > 0) {
          console.log("Processing call tree with", callTree.length, "nodes");
          
          // Function to recursively collect all trc files from the tree
          const collectTraceFiles = async (nodes: any[]): Promise<Record<string, string>> => {
            const result: Record<string, string> = {};
            
            // Process each node
            for (const node of nodes) {
              console.log("Processing node:", node.id, node.text);
              
              // If this node has a trace file, fetch it
              if (node.trc_file && node.trc_commit_hash) {
                console.log(`Found trace file: ${node.trc_file}`);
                try {
                  const response = await fetch(
                    `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
                      repoPath
                    )}&file_path=${encodeURIComponent(node.trc_file)}&commit_hash=${node.trc_commit_hash}`
                  );
                  
                  if (response.ok) {
                    const content = await response.text();
                    console.log(`Retrieved trace file ${node.trc_file}, length:`, content.length);
                    result[node.trc_file] = content;
                  } else {
                    console.error(`Failed to fetch trace file: ${response.statusText}`);
                    result[node.trc_file] = `Error: ${response.statusText}`;
                  }
                } catch (err) {
                  console.error(`Error fetching trace file: ${err}`);
                  result[node.trc_file] = `Error: ${err}`;
                }
              }
              
              // Process children recursively if they exist
              if (node.children && node.children.length > 0) {
                console.log(`Node has ${node.children.length} children`);
                const childResults = await collectTraceFiles(node.children);
                
                // Merge child results into current result
                Object.assign(result, childResults);
              }
            }
            
            return result;
          };
          
          // Collect all trace files from the tree
          const traceFiles = await collectTraceFiles(callTree);
          console.log("All trace files collected:", Object.keys(traceFiles));
          setAllTraceContents(traceFiles);
        } 
        // Otherwise, just fetch the single trace file
        else if (traceFile && traceCommitHash) {
          console.log(`Fetching single trace file: ${traceFile}`);
          const response = await fetch(
            `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
              repoPath
            )}&file_path=${encodeURIComponent(traceFile)}&commit_hash=${traceCommitHash}`
          );
          
          if (response.ok) {
            const content = await response.text();
            console.log(`Single trace file fetched, length: ${content.length}`);
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

    fetchTraceFiles();
  }, [repoPath, callTree, traceFile, traceCommitHash, content]);

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

  // Display all trace files from the call tree
  if (allTraceContents) {
    const fileNames = Object.keys(allTraceContents);
    
    return (
      <div className="trace-view-container">
        <h2 className="text-xl font-bold mb-4">Trace Files ({fileNames.length})</h2>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4 p-4">
            {fileNames.map((fileName) => (
              <div key={fileName} className="mb-6 border border-border rounded-md">
                <div className="bg-muted p-2 font-medium border-b border-border">
                  {fileName}
                </div>
                <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
                  {allTraceContents[fileName]}
                </pre>
              </div>
            ))}
          </div>
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