export interface TraceNode {
  id: string;
  text: string;
  trc_file?: string;
  trc_commit_hash?: string;
  children?: TraceNode[];
  trace_content?: string;
  trace_error?: string;
}

export interface TraceDataContextType {
  [key: string]: {
    content: string;
    commitHash: string;
    filePath: string;
  };
}

interface ProcessTraceDataOptions {
  repoPath: string;
  callTree?: TraceNode[];
  content?: string;
  traceData?: TraceDataContextType;
}

// Helper function to fetch trace content
const fetchContentHelper = async (
  filePath: string,
  commitHash: string,
  repoPath: string,
  traceData: TraceDataContextType | undefined
): Promise<{ content?: string; error?: string }> => {
  // Check context cache first
  if (traceData && traceData[commitHash] && traceData[commitHash].content) {
    return { content: traceData[commitHash].content };
  }

  // Fetch from API if not in cache
  try {
    const response = await fetch(
      `http://localhost:8000/get_file_content/?repo_path=${encodeURIComponent(
        repoPath
      )}&file_path=${encodeURIComponent(filePath)}&commit_hash=${encodeURIComponent(commitHash)}`
    );

    if (response.ok) {
      const fetchedContent = await response.text();
      return { content: fetchedContent };
    } else {
      return { error: `Failed to fetch trace file: ${response.status} ${response.statusText}` };
    }
  } catch (err) {
    return { error: `Network error fetching trace: ${err instanceof Error ? err.message : String(err)}` };
  }
};

// Recursive function to process the call tree and fetch content
const processNode = async (
  node: TraceNode,
  repoPath: string,
  traceData: TraceDataContextType | undefined
): Promise<TraceNode> => {
  const processedNode: TraceNode = {
    // Copy essential properties
    id: node.id || node.trc_file || node.text || `node-${Math.random()}`, // Ensure unique ID
    text: node.text || node.trc_file || 'Unnamed Node',
  };

  // Fetch trace content if applicable
  if (node.trc_file && node.trc_commit_hash) {
    const result = await fetchContentHelper(
      node.trc_file,
      node.trc_commit_hash,
      repoPath,
      traceData
    );
    if (result.content !== undefined) {
      processedNode.trace_content = result.content;
    } else {
      processedNode.trace_error = result.error;
    }
  }

  // Recursively process children
  if (node.children && node.children.length > 0) {
    processedNode.children = await Promise.all(
      node.children.map(child => processNode(child, repoPath, traceData))
    );
  }

  return processedNode;
};

// Main exported function for processing trace data
export const processTraceData = async ({
  repoPath,
  callTree,
  content,
  traceData
}: ProcessTraceDataOptions): Promise<TraceNode | string | null> => {
  console.log('--- Executing processTraceData ---');
  console.log(' Options.repoPath:', repoPath);
  console.log(' Options.hasCallTree:', !!callTree);
  console.log(' Options.hasContent:', !!content);
  console.log(' Options.traceData received:', JSON.stringify(traceData, null, 2));
  console.log('---------------------------------');

  // 1. Handle direct content
  if (content) {
    console.log('processTraceData: Handling direct content.');
    return content;
  }

  // 2. Handle call tree processing
  if (callTree && callTree.length > 0) {
    console.log('processTraceData: Handling call tree.');
    try {
      // Process based on whether callTree is one root or multiple
      if (callTree.length === 1) {
        const rootNode = callTree[0];
        console.log(`processTraceData: Processing single root node: ${rootNode.id}`);
        
        // Create a wrapper to maintain consistency with trace structure
        const wrapper = {
          id: `wrapper-${rootNode.id}-${Date.now()}`,
          text: `Trace: ${rootNode.text}`,
          children: [rootNode]
        };
        
        // Process the tree recursively to fetch content
        const treeWithContentForWrapper = await Promise.all(
          wrapper.children.map(child => processNode(child, repoPath, traceData))
        );
        
        return {
          ...wrapper,
          children: treeWithContentForWrapper
        };
      } else {
        console.log(`processTraceData: Processing ${callTree.length} root nodes (creating virtual wrapper).`);
        // Handle multiple roots by creating a virtual root
        const wrapperRoot: TraceNode = { 
          id: 'virtual-root', 
          text: 'Trace Root', 
          children: [] 
        };
        
        wrapperRoot.children = await Promise.all(
          callTree.map(node => processNode(node, repoPath, traceData))
        );
        
        return wrapperRoot;
      }
    } catch (err) {
      console.error("processTraceData: Error processing call tree:", err);
      throw new Error(`Failed to process trace tree: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  // 3. No relevant data provided
  console.log('processTraceData: No content or callTree provided, returning null.');
  return null;
};

// Export types for use in other files
export type { TraceNode, TraceDataContextType };
