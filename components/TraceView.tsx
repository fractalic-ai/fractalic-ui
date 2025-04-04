'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
// Removed 'path' import as it seems primarily used for the legacy single-file display.
// import path from 'path';
import { useTrace } from '@/contexts/TraceContext';

// Define a more specific type for tree nodes if possible
interface TraceNode {
  id: string; // Assuming an ID exists or can be derived
  text: string; // Display text for the node
  trc_file?: string; // Optional trace file path
  trc_commit_hash?: string; // Optional commit hash for the trace file
  children?: TraceNode[]; // Child nodes
  // Added properties for fetched content or errors
  trace_content?: string;
  trace_error?: string;
}

interface TraceViewProps {
  repoPath: string;
  callTree?: TraceNode[]; // Use the more specific type
  // Removed legacy props unless absolutely necessary
  // traceFile?: string;
  // traceCommitHash?: string;
  content?: string; // Direct content override
  className?: string; // Class name for styling
}

export const TraceView: React.FC<TraceViewProps> = ({
  repoPath,
  callTree,
  content,
  className, // Added className to props destructuring
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedTree, setProcessedTree] = useState<TraceNode | null>(null); // Store the single root node with fetched content
  const [directContent, setDirectContent] = useState<string | null>(null);
  const { traceData } = useTrace();

  // Helper function to fetch trace content (checks context first)
  const fetchContentHelper = async (filePath: string, commitHash: string): Promise<{ content?: string; error?: string }> => {
    // 1. Check context cache
    if (traceData && traceData[commitHash] && traceData[commitHash].content) {
      // Assuming traceData is structured like: { [commitHash]: { content: '...' } }
      // Adjust the access logic if traceData structure is different (e.g., includes repo/file path)
      // If the cache key needs more than just commitHash (e.g., includes file path), modify this check.
      // For instance: const cacheKey = `${commitHash}:${filePath}`; if (traceData[cacheKey]) ...
      return { content: traceData[commitHash].content };
    }

    // 2. Fetch from API if not in cache
    try {
      const response = await fetch(
        `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
          repoPath
        )}&file_path=${encodeURIComponent(filePath)}&commit_hash=${encodeURIComponent(commitHash)}`
      );

      if (response.ok) {
        const fetchedContent = await response.text();
        // Optional: Update context cache here if needed, though context is usually read-only in consumers
        // Example: updateTraceData(commitHash, filePath, fetchedContent);
        return { content: fetchedContent };
      } else {
        return { error: `Failed to fetch trace file: ${response.status} ${response.statusText}` };
      }
    } catch (err) {
      return { error: `Network error fetching trace: ${err instanceof Error ? err.message : String(err)}` };
    }
  };

  // Recursive function to process the call tree and fetch content
  const processNode = async (node: TraceNode): Promise<TraceNode> => {
    const processedNode: TraceNode = {
      // Copy essential properties
      id: node.id || node.trc_file || node.text || `node-${Math.random()}`, // Ensure some unique ID
      text: node.text || node.trc_file || 'Unnamed Node',
    };

    // Fetch trace content if applicable
    if (node.trc_file && node.trc_commit_hash) {
      const result = await fetchContentHelper(node.trc_file, node.trc_commit_hash);
      if (result.content !== undefined) {
        processedNode.trace_content = result.content;
      } else {
        processedNode.trace_error = result.error;
      }
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
      // Use Promise.all for potentially parallel fetching of children
      processedNode.children = await Promise.all(
        node.children.map(child => processNode(child))
      );
    }

    return processedNode;
  };


  useEffect(() => {
    // Reset states on prop change
    setIsLoading(true);
    setError(null);
    setProcessedTree(null);
    setDirectContent(null);

    // 1. Handle direct content
    if (content) {
      setDirectContent(content);
      setIsLoading(false);
      return;
    }

    // 2. Handle call tree processing
    if (callTree && callTree.length > 0) {
      const processTree = async () => {
        try {
          // Assuming the callTree prop is an array containing the root node(s)
          // If there's always a single root, process callTree[0]
          // If there can be multiple roots, you might need a wrapper root or adjust logic
          if (callTree.length === 1) {
             const rootNode = callTree[0];
             const treeWithContent = await processNode(rootNode);
             setProcessedTree(treeWithContent);
          } else {
             // Handle multiple root nodes if necessary, e.g., wrap them
             const wrapperRoot: TraceNode = { id: 'virtual-root', text: 'Trace Root', children: [] };
             wrapperRoot.children = await Promise.all(callTree.map(node => processNode(node)));
             setProcessedTree(wrapperRoot);
             // Or set an error / handle differently if multiple roots aren't expected
             // setError("Multiple root nodes found in callTree, structure unclear.");
          }
        } catch (err) {
          const errorMessage = `Error processing call tree: ${err instanceof Error ? err.message : String(err)}`;
          console.error(errorMessage);
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };
      processTree();
    }
    // 3. No relevant data provided
    else {
       setIsLoading(false);
       // No error needed here, will fall through to the "No trace information" message
    }

    // Removed the legacy single trace file logic.
    // If you still need it, it could be added back as a lower priority condition.

  }, [repoPath, callTree, content, traceData]); // Added traceData dependency

  // --- Rendering Logic ---

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-40 ${className || ''}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading trace information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-100/10 text-red-400 rounded-md border border-red-300/20 ${className || ''}`}>
        {error}
      </div>
    );
  }

  // Display direct content if provided
  if (directContent) {
     return (
      <div className={`trace-view-container ${className || ''}`}>
        <h2 className="text-xl font-bold mb-4">Trace Content</h2>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
            {directContent}
          </pre>
        </ScrollArea>
      </div>
    );
  }

  // Display hierarchical trace files from processed tree
  if (processedTree) {
    return (
      <div className={`trace-view-container ${className || ''}`}>
        <h2 className="text-xl font-bold mb-4">Trace Call Tree</h2>
        {/* Consider a better way to display the tree than JSON.stringify for UX */}
        {/* For now, keeping it simple as requested */}
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(processedTree, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    );
  }

  // Fallback if no data is available
  return (
     <p className={`text-muted-foreground p-4 ${className || ''}`}>
       No trace information available.
     </p>
  );
};

export default TraceView;