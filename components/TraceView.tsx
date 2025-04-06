'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useTrace } from '@/contexts/TraceContext';
import { processTraceData, TraceNode, TraceDataContextType } from '@/lib/traceProcessor';

interface TraceViewProps {
  repoPath: string;
  callTree?: TraceNode[];
  content?: string; // Direct content override
  className?: string;
}

export const TraceView: React.FC<TraceViewProps> = ({
  repoPath,
  callTree,
  content,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<TraceNode | string | null>(null);
  const { traceData } = useTrace();

  // Log on every render
  console.log('>>> TraceView Render - traceData from useTrace:', JSON.stringify(traceData, null, 2));

  useEffect(() => {
    console.log('--- TraceView useEffect Triggered ---');
    console.log('useEffect using traceData:', JSON.stringify(traceData, null, 2));
    console.log('useEffect inputs: repoPath=', repoPath, ', hasCallTree=', !!callTree, ', hasContent=', !!content);
    console.log('------------------------------------');

    // Reset states on dependency change
    setIsLoading(true);
    setError(null);
    setProcessedData(null);

    const loadTraceData = async () => {
      try {
        const result = await processTraceData({
          repoPath,
          callTree,
          content,
          traceData, // Pass the traceData from context
        });

        // Log the raw result from processTraceData
        console.log('[TraceView] Raw result from processTraceData:', result ? (typeof result === 'string' ? `String (length: ${result.length})` : `Object (id: ${result.id})`) : 'null');
        // console.log('[TraceView] Raw result details:', JSON.stringify(result, null, 2)); // Uncomment for full object details

        // Check if we need to wrap the result for display consistency
        let finalDataToSet: TraceNode | string | null = result;
        if (result && typeof result !== 'string' && callTree?.length === 1 && callTree[0]?.id === result.id) {
           // If processTraceData returned a single node and the input callTree was also a single node
           // (implying the input lacked the expected top-level wrapper), recreate the wrapper.
           console.log('[TraceView] Wrapping single root node result for display.');
           finalDataToSet = {
               id: `wrapper-${result.id}-${Date.now()}`, // Generate a unique wrapper ID
               text: `Trace: ${callTree[0].text}`, // Use original text for wrapper
               children: [result] // Put the actual result inside children
           };
           console.log('[TraceView] Wrapped data:', JSON.stringify(finalDataToSet, null, 2));
        }

        setProcessedData(finalDataToSet);

      } catch (err) {
        const errorMessage = `Error loading trace data: ${err instanceof Error ? err.message : String(err)}`;
        console.error('[TraceView] Error in loadTraceData:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Trigger loading only if there's potential data to load
    if (repoPath && (callTree || content)) {
      console.log('[TraceView] Calling loadTraceData...');
      loadTraceData();
    } else {
      console.log('[TraceView] Skipping loadTraceData (no repoPath or no callTree/content).');
      setIsLoading(false);
      setProcessedData(null); // Ensure it's cleared if inputs are insufficient
    }

  }, [repoPath, callTree, content, traceData]); // Dependencies

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

  if (processedData) {
    if (typeof processedData === 'string') {
      return (
        <div className={`trace-view-container ${className || ''}`}>
          <h2 className="text-xl font-bold mb-4">Trace Content</h2>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
              {processedData}
            </pre>
          </ScrollArea>
        </div>
      );
    }
    else {
      return (
        <div className={`trace-view-container ${className || ''}`}>
          <h2 className="text-xl font-bold mb-4">Trace Call Tree</h2>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <pre className="p-4 overflow-auto whitespace-pre-wrap break-all text-sm">
              {JSON.stringify(processedData, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      );
    }
  }

  return (
    <p className={`text-muted-foreground p-4 ${className || ''}`}>
      No trace information available or selected.
    </p>
  );
};

// export default TraceView; // Assuming this is handled elsewhere if needed