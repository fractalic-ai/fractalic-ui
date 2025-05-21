import React, { useEffect, useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ToolsManagerProps {
  currentEditPath: string;
}

interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
}

const ToolsManager: React.FC<ToolsManagerProps> = ({ currentEditPath }) => {
  const [tools, setTools] = useState<ToolSchema[]>([]);
  const [selectedToolIdx, setSelectedToolIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      setError(null);
      setTools([]);
      try {
        const toolsDir = `${currentEditPath.replace(/\/$/, '')}/tools`;
        const url = `http://127.0.0.1:8000/tools_schema/?tools_dir=${encodeURIComponent(toolsDir)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setTools(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch tools');
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, [currentEditPath]);

  const selectedTool = selectedToolIdx !== null ? tools[selectedToolIdx] : null;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {/* Left: Tool List */}
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2 bg-[#181818] h-full">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-6 w-6 text-gray-300" />
              <span className="font-bold text-lg text-gray-100">Tools Manager</span>
            </div>
            {loading && <div className="text-gray-400">Loading tools...</div>}
            {error && <div className="text-red-400">{error}</div>}
            {!loading && !error && tools.length === 0 && <div className="text-gray-400">No tools found.</div>}
            <ul className="divide-y divide-gray-800">
              {tools.map((tool, idx) => (
                <li
                  key={tool.function.name}
                  className={`flex flex-col px-4 py-3 cursor-pointer hover:bg-[#232323] ${
                    selectedToolIdx === idx ? 'bg-[#232323] font-semibold' : ''
                  }`}
                  onClick={() => setSelectedToolIdx(idx)}
                >
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="flex-1 font-mono">{tool.function.name}</span>
                  </div>
                  <div className="ml-7 text-xs text-gray-500 truncate mt-1">{tool.function.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle />
      {/* Right: Tool Details */}
      <ResizablePanel defaultSize={75} minSize={40}>
        <ScrollArea className="h-full">
          <div className="p-8 h-full">
            {selectedTool ? (
              <Card className="w-full max-w-2xl mx-auto bg-[#20212b] border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-gray-400" />
                    <span>{selectedTool.function.name}</span>
                  </CardTitle>
                  <div className="text-gray-400 mt-2">{selectedTool.function.description}</div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-2 font-semibold text-gray-300">Parameters:</div>
                  {Object.keys(selectedTool.function.parameters.properties).length === 0 ? (
                    <div className="text-gray-400">No parameters.</div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(selectedTool.function.parameters.properties).map(([param, info]) => (
                        <div key={param} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base text-gray-200">{param}</span>
                            {selectedTool.function.parameters.required?.includes(param) && (
                              <Badge className="bg-blue-600 text-white ml-2">required</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{info.description || ''}</div>
                          <Input disabled value={info.type} className="w-32 text-xs bg-[#23232b] border-0 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-gray-400 text-lg flex items-center justify-center h-full">Select a tool to view details.</div>
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ToolsManager; 