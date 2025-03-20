import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import path from 'path';

interface TraceViewProps {
  content?: string;
  className?: string;
  repoPath?: string;
  traceFile?: string;
  traceCommitHash?: string;
}

export const TraceView: React.FC<TraceViewProps> = ({ 
  content, 
  className, 
  repoPath, 
  traceFile, 
  traceCommitHash 
}) => {
  const [traceContent, setTraceContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraceContent = async () => {
      if (!repoPath || !traceFile || !traceCommitHash) {
        setError("Missing required trace information (repo path, trace file, or commit hash)");
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching trace file: ${traceFile} at commit: ${traceCommitHash}`);
        const response = await fetch(
          `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
            repoPath
          )}&file_path=${encodeURIComponent(traceFile)}&commit_hash=${traceCommitHash}`
        );
        
        if (response.ok) {
          const data = await response.text();
          setTraceContent(data);
        } else {
          setError(`Failed to fetch trace file: ${response.statusText}`);
        }
      } catch (error) {
        setError(`Error fetching trace content: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Error fetching trace content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Clear previous content
    setTraceContent(null);

    // Use direct content if provided, otherwise fetch from API
    if (content) {
      setTraceContent(content);
    } else {
      fetchTraceContent();
    }
  }, [repoPath, traceFile, traceCommitHash, content]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className={`p-4 flex-1 ${className || ''}`}>
        <h2 className="text-xl font-bold mb-4">Trace File</h2>
        
        {traceFile && (
          <div className="mb-4 text-sm">
            <div><strong>File:</strong> {path.basename(traceFile || '')}</div>
            <div><strong>Commit Hash:</strong> {traceCommitHash}</div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2">Loading trace file...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        ) : (
          traceContent ? (
            <ScrollArea className="h-[calc(100%-5rem)] pr-2">
              <pre className="p-4 bg-muted rounded-md whitespace-pre-wrap overflow-x-auto text-sm font-mono">
                {traceContent}
              </pre>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">No trace information available.</p>
          )
        )}
      </div>
    </div>
  );
};

export default TraceView;