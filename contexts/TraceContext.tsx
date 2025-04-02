'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TraceContextType {
  traceData: {
    [key: string]: {
      content: string;
      commitHash: string;
      filePath: string;
    };
  };
  setTraceData: (data: { [key: string]: { content: string; commitHash: string; filePath: string } }) => void;
  clearTraceData: () => void;
}

const TraceContext = createContext<TraceContextType | undefined>(undefined);

export function TraceProvider({ children }: { children: ReactNode }) {
  const [traceData, setTraceData] = useState<{
    [key: string]: {
      content: string;
      commitHash: string;
      filePath: string;
    };
  }>({});

  const clearTraceData = () => {
    setTraceData({});
  };

  return (
    <TraceContext.Provider value={{ traceData, setTraceData, clearTraceData }}>
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