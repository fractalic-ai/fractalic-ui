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
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

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

  useEffect(() => {
    setSelectedVariantIndex(0);
  }, [selectedToolIdx]);

  const selectedTool = selectedToolIdx !== null ? tools[selectedToolIdx] : null;

  let paramSchema: any = selectedTool?.function?.parameters;
  let variants: any[] = paramSchema?.oneOf || [];
  let hasVariants = variants.length > 0;
  let flatProperties: Record<string, { type: string; description?: string }> = {};
  let flatRequired: string[] = [];
  if (!hasVariants && paramSchema?.properties) {
    flatProperties = paramSchema.properties;
    flatRequired = paramSchema.required || [];
  }

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
          <div className="h-full">
            {selectedTool ? (
              <div className="h-full w-full flex flex-col bg-[#20212b] p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Wrench className="h-8 w-8 text-gray-400" />
                  <span className="text-3xl font-extrabold">{selectedTool.function.name}</span>
                </div>
                <div className="text-xl text-gray-300 mb-6">{selectedTool.function.description}</div>
                <div className="text-lg font-semibold text-gray-200 mb-3">Parameters:</div>
                {/* Show all variants if present, otherwise flat schema */}
                {hasVariants ? (
                  <div className="space-y-10">
                    {variants.map((variant, idx) => {
                      const properties = variant.properties || {};
                      const required = variant.required || [];
                      const opName = properties.op?.const || `Operation ${idx + 1}`;
                      return (
                        <div key={idx} className="border border-gray-700 rounded-lg p-4 bg-[#23232b]">
                          <div className="text-base font-bold text-blue-300 mb-3">{opName}</div>
                          {Object.keys(properties).length === 0 ? (
                            <div className="text-gray-400 text-base">No parameters.</div>
                          ) : (
                            <div className="space-y-6">
                              {Object.entries(properties).map(([param, info]) => {
                                const paramInfo = info as { type: string; description?: string };
                                return (
                                  <div key={param} className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg font-mono text-gray-100">{param}</span>
                                      {required.includes(param) && (
                                        <Badge className="bg-blue-600 text-white ml-2 text-base px-2 py-1">required</Badge>
                                      )}
                                    </div>
                                    <div className="text-base text-gray-400">{paramInfo.description || ''}</div>
                                    <Input disabled value={paramInfo.type} className="w-40 text-base bg-[#23232b] border-0 text-gray-400" />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  Object.keys(flatProperties).length === 0 ? (
                    <div className="text-gray-400 text-base">No parameters.</div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(flatProperties).map(([param, info]) => {
                        const paramInfo = info as { type: string; description?: string };
                        return (
                          <div key={param} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-mono text-gray-100">{param}</span>
                              {flatRequired.includes(param) && (
                                <Badge className="bg-blue-600 text-white ml-2 text-base px-2 py-1">required</Badge>
                              )}
                            </div>
                            <div className="text-base text-gray-400">{paramInfo.description || ''}</div>
                            <Input disabled value={paramInfo.type} className="w-40 text-base bg-[#23232b] border-0 text-gray-400" />
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-2xl flex items-center justify-center h-full font-semibold">Select a tool to view details.</div>
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ToolsManager; 