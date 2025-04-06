'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Define specific types for trace data
interface TraceEntry {
  content: string;
  commitHash: string;
  filePath: string;
}
interface TraceDataType {
  [commitHash: string]: TraceEntry;
}

// Update context type to use updateTraceEntry
interface TraceContextType {
  traceData: TraceDataType;
  updateTraceEntry: (commitHash: string, entry: TraceEntry) => void;
  clearTraceData: () => void;
}

const TraceContext = createContext<TraceContextType | undefined>(undefined);

export function TraceProvider({ children }: { children: ReactNode }) {
  // Initialize state with the specific type
  const [traceData, setTraceDataInternal] = useState<TraceDataType>({});

  // Implement updateTraceEntry with useCallback and functional setState for merging
  const updateTraceEntry = useCallback((commitHash: string, entry: TraceEntry) => {
    setTraceDataInternal(prevData => {
      console.log(`[TraceProvider] Updating entry for commit: ${commitHash}`);
      console.log(" > Previous state:", prevData);
      const newState = { ...prevData, [commitHash]: entry };
      console.log(" > New state:", newState);
      return newState;
    });
  }, []); // No dependencies needed as setTraceDataInternal is stable

  // Implement clearTraceData with useCallback
  const clearTraceData = useCallback(() => {
    console.log("[TraceProvider] Clearing all trace data.");
    setTraceDataInternal({});
  }, []); // No dependencies needed as setTraceDataInternal is stable

  // Provide the correct context value
  const contextValue = { traceData, updateTraceEntry, clearTraceData };

  return (
    <TraceContext.Provider value={contextValue}>
      {children}
    </TraceContext.Provider>
  );
}

export function useTrace() {
  const context = useContext(TraceContext);
  if (context === undefined) {
    throw new Error('useTrace must be used within a TraceProvider');
  }
  return context;
} 