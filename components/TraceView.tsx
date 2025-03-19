import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface TraceViewProps {
  className?: string;
  traceContent?: string;
}

export default function TraceView({ className = '', traceContent = '' }: TraceViewProps) {
  return (
    <ScrollArea className={`h-full w-full ${className}`}>
      <div className="p-4">
        {traceContent ? (
          <pre className="whitespace-pre-wrap font-mono text-sm">{traceContent}</pre>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-4">Trace View</h2>
            <p className="text-muted-foreground">
              This is a placeholder for the Trace view functionality.
              No trace data is currently available for this file.
            </p>
          </>
        )}
      </div>
    </ScrollArea>
  );
}