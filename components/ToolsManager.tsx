import React, { useEffect, useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Code, FileText, Settings, Play, Copy, ChevronRight, AlertCircle, CheckCircle, Info, Search, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [searchFilter, setSearchFilter] = useState('');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, any>>>({});

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

  // Filter tools based on search
  const filteredTools = tools.filter(tool => 
    tool.function.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    tool.function.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  let paramSchema: any = selectedTool?.function?.parameters;
  let variants: any[] = paramSchema?.oneOf || [];
  let hasVariants = variants.length > 0;
  let flatProperties: Record<string, { type: string; description?: string }> = {};
  let flatRequired: string[] = [];
  if (!hasVariants && paramSchema?.properties) {
    flatProperties = paramSchema.properties;
    flatRequired = paramSchema.required || [];
  }

  // Test tool functionality
  const handleTestTool = async (toolName: string) => {
    if (!selectedTool) return;
    
    setTestingTool(toolName);
    try {
      const toolParams = paramValues[toolName] || {};
      const response = await fetch('http://127.0.0.1:8000/test_tool/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_name: toolName,
          parameters: toolParams,
          tools_dir: `${currentEditPath.replace(/\/$/, '')}/tools`
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [toolName]: result }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [toolName]: { 
          error: err instanceof Error ? err.message : 'Test failed' 
        } 
      }));
    } finally {
      setTestingTool(null);
    }
  };

  // Handle parameter value changes
  const handleParamChange = (toolName: string, paramName: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [paramName]: value
      }
    }));
  };

  // Render input based on parameter type
  const renderParamInput = (toolName: string, param: any, value: any) => {
    const onChange = (newValue: any) => handleParamChange(toolName, param.name, newValue);
    
    switch (param.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          />
        );
      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            className="bg-gray-800 border-gray-600 text-white"
            placeholder="Enter number..."
          />
        );
      case 'array':
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : value || ''}
            onChange={(e) => onChange(e.target.value.split('\n').filter(v => v.trim()))}
            className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
            placeholder="Enter one item per line..."
          />
        );
      case 'object':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            className="bg-gray-800 border-gray-600 text-white min-h-[100px] font-mono text-sm"
            placeholder='Enter JSON object, e.g., {"key": "value"}'
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
            placeholder="Enter text..."
          />
        );
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Left: Tool List */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
          <div className="h-full bg-[#141414] border-r border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl text-white">Tools Manager</h1>
                  <p className="text-sm text-gray-400">{filteredTools.length} of {tools.length} tools</p>
                </div>
              </div>
              
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tools..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100%-140px)]">
              <div className="p-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-gray-400">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading tools...</span>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                {!loading && !error && filteredTools.length === 0 && searchFilter && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Filter className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-center">No tools match your search</p>
                    <p className="text-xs text-center mt-1">Try a different search term</p>
                  </div>
                )}

                {!loading && !error && tools.length === 0 && !searchFilter && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Code className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-center">No tools found in this directory</p>
                    <p className="text-xs text-center mt-1">Add some .py tool files to get started</p>
                  </div>
                )}

                <div className="space-y-2">
                  {filteredTools.map((tool, filteredIdx) => {
                    // Find the original index in the tools array
                    const originalIdx = tools.findIndex(t => t.function.name === tool.function.name);
                    return (
                      <Card
                        key={tool.function.name}
                        className={`cursor-pointer transition-all duration-200 border-0 ${
                          selectedToolIdx === originalIdx 
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 shadow-lg' 
                            : 'bg-[#1e1e1e] hover:bg-[#252525] hover:shadow-md'
                        }`}
                        onClick={() => setSelectedToolIdx(originalIdx)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              selectedToolIdx === originalIdx 
                                ? 'bg-blue-500/20 border border-blue-500/30' 
                                : 'bg-gray-700/50'
                            }`}>
                              <Wrench className={`h-4 w-4 ${
                                selectedToolIdx === originalIdx ? 'text-blue-400' : 'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-mono font-semibold text-sm truncate ${
                                selectedToolIdx === originalIdx ? 'text-white' : 'text-gray-200'
                              }`} title={tool.function.name}>
                                {tool.function.name}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1 overflow-hidden leading-relaxed" 
                                 style={{
                                   display: '-webkit-box',
                                   WebkitLineClamp: 2,
                                   WebkitBoxOrient: 'vertical'
                                 }}
                                 title={tool.function.description}>
                                {tool.function.description}
                              </p>
                            </div>
                            {selectedToolIdx === originalIdx && (
                              <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700 transition-colors" />
        
        {/* Right: Tool Details */}
        <ResizablePanel defaultSize={70} minSize={55}>
          <ScrollArea className="h-full">
            <div className="h-full">
              {selectedTool ? (
                <div className="h-full w-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
                  {/* Header Section */}
                  <div className="border-b border-gray-800 bg-[#141414]/80 backdrop-blur-sm">
                    <div className="p-8">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                          <Wrench className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-white">{selectedTool.function.name}</h1>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">
                            {selectedTool.function.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-gray-800/50 border-gray-700 hover:bg-gray-700"
                            onClick={() => handleTestTool(selectedTool.function.name)}
                            disabled={testingTool === selectedTool.function.name}
                          >
                            {testingTool === selectedTool.function.name ? (
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            {testingTool === selectedTool.function.name ? 'Testing...' : 'Test'}
                          </Button>
                          <Button variant="outline" size="sm" className="bg-gray-800/50 border-gray-700 hover:bg-gray-700">
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parameters Section */}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Settings className="h-6 w-6 text-blue-400" />
                      <h2 className="text-2xl font-bold text-white">Parameters</h2>
                    </div>

                    {/* Show all variants if present, otherwise flat schema */}
                    {hasVariants ? (
                      <div className="space-y-8">
                        {variants.map((variant, idx) => {
                          const properties = variant.properties || {};
                          const required = variant.required || [];
                          const opName = properties.op?.const || `Operation ${idx + 1}`;
                          return (
                            <Card key={idx} className="border-0 bg-[#1e1e1e] shadow-xl">
                              <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Code className="h-5 w-5 text-blue-400" />
                                  </div>
                                  <CardTitle className="text-xl text-blue-300">{opName}</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {Object.keys(properties).length === 0 ? (
                                  <div className="flex items-center gap-3 p-6 bg-gray-800/30 rounded-lg">
                                    <Info className="h-5 w-5 text-gray-400" />
                                    <span className="text-gray-400">No parameters required for this operation.</span>
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {Object.entries(properties).map(([param, info]) => {
                                      const paramInfo = info as { type: string; description?: string };
                                      const currentValue = paramValues[selectedTool.function.name]?.[param];
                                      return (
                                        <div key={param} className="group">
                                          <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                                            <div className="p-2 bg-gray-700/50 rounded-lg group-hover:bg-gray-600/50 transition-colors">
                                              <FileText className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                              <div className="flex items-center gap-3">
                                                <span className="text-lg font-mono font-semibold text-white">{param}</span>
                                                {required.includes(param) && (
                                                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-sm">
                                                    Required
                                                  </Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs font-mono bg-gray-800/50 border-gray-600 text-gray-300">
                                                  {paramInfo.type}
                                                </Badge>
                                              </div>
                                              {paramInfo.description && (
                                                <p className="text-gray-400 leading-relaxed text-sm" title={paramInfo.description}>
                                                  {paramInfo.description.length > 100 
                                                    ? `${paramInfo.description.substring(0, 100)}...` 
                                                    : paramInfo.description}
                                                </p>
                                              )}
                                              <div className="w-full">
                                                {renderParamInput(selectedTool.function.name, { name: param, type: paramInfo.type }, currentValue)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      Object.keys(flatProperties).length === 0 ? (
                        <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                          <CardContent className="p-8">
                            <div className="flex flex-col items-center gap-4 text-gray-400">
                              <div className="p-4 bg-gray-800/30 rounded-full">
                                <Info className="h-8 w-8" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-semibold mb-2">No Parameters Required</h3>
                                <p className="text-sm">This tool can be executed without any input parameters.</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                          <CardContent className="p-6">
                            <div className="space-y-6">
                              {Object.entries(flatProperties).map(([param, info]) => {
                                const paramInfo = info as { type: string; description?: string };
                                const currentValue = paramValues[selectedTool.function.name]?.[param];
                                return (
                                  <div key={param} className="group">
                                    <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                                      <div className="p-2 bg-gray-700/50 rounded-lg group-hover:bg-gray-600/50 transition-colors">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                          <span className="text-lg font-mono font-semibold text-white">{param}</span>
                                          {flatRequired.includes(param) && (
                                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-sm">
                                              Required
                                            </Badge>
                                          )}
                                          <Badge variant="outline" className="text-xs font-mono bg-gray-800/50 border-gray-600 text-gray-300">
                                            {paramInfo.type}
                                          </Badge>
                                        </div>
                                        {paramInfo.description && (
                                          <p className="text-gray-400 leading-relaxed text-sm" title={paramInfo.description}>
                                            {paramInfo.description.length > 100 
                                              ? `${paramInfo.description.substring(0, 100)}...` 
                                              : paramInfo.description}
                                          </p>
                                        )}
                                        <div className="w-full">
                                          {renderParamInput(selectedTool.function.name, { name: param, type: paramInfo.type }, currentValue)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>

                  {/* Test Results Section */}
                  {selectedTool && testResults[selectedTool.function.name] && (
                    <div className="p-8 pt-0">
                      <div className="flex items-center gap-3 mb-4">
                        <Play className="h-5 w-5 text-green-400" />
                        <h3 className="text-xl font-bold text-white">Test Results</h3>
                      </div>
                      <Card className="border-0 bg-[#1e1e1e] shadow-xl">
                        <CardContent className="p-6">
                          <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm">
                            <pre className="text-gray-300 whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(testResults[selectedTool.function.name], null, 2)}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-gray-800/30 rounded-full mx-auto w-fit">
                      <Wrench className="h-16 w-16 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-300 mb-2">Select a Tool</h3>
                      <p className="text-gray-500">Choose a tool from the left panel to view its details and parameters</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ToolsManager; 