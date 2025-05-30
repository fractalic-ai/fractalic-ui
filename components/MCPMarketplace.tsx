// MCP Marketplace extracted from MCPManager
// This component contains all marketplace logic and UI, refactored for standalone use

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Info, Filter, RotateCw, ChevronDown, ChevronRight, X, AlertCircle, Copy, Check } from 'lucide-react';
import type { MCPLibrary } from './MCPManager';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// --- Helper and fetch functions (from MCPManager) ---
const FALLBACK_MCP_LIBRARIES: MCPLibrary[] = [
  {
    name: "Tavily MCP Server",
    id: "tavily-mcp-server",
    description: "Enable real-time web search and data extraction capabilities for LLMs. Integrates Tavily's advanced search API for up-to-date information.",
    category: "Web Search",
    install: "npx @tavily-ai/tavily-mcp@latest",
    docs: "https://github.com/tavily-ai/tavily-mcp",
    icon: "https://github.com/tavily-ai.png?size=40",
    author: "tavily-ai",
    repository: "tavily-mcp",
    tags: ["search", "web", "api"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "tavily-mcp-server": {
          command: "npx",
          args: ["@tavily-ai/tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "your-tavily-api-key-here"
          }
        }
      }
    }
  },
  {
    name: "File Manager MCP",
    id: "file-manager-mcp",
    description: "Comprehensive file system operations including read, write, create, delete, and directory management capabilities.",
    category: "File System",
    install: "npx file-manager-mcp",
    docs: "https://github.com/example/file-manager-mcp",
    icon: "https://github.com/example.png?size=40",
    author: "example",
    repository: "file-manager-mcp",
    tags: ["files", "filesystem", "management"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "file-manager-mcp": {
          command: "npx",
          args: ["file-manager-mcp"],
          env: {}
        }
      }
    }
  },
  {
    name: "Database Connector",
    id: "database-connector",
    description: "Connect to various databases including PostgreSQL, MySQL, SQLite, and MongoDB with query execution capabilities.",
    category: "Database",
    install: "npm install database-connector-mcp",
    docs: "https://github.com/dbtools/database-connector",
    icon: "https://github.com/dbtools.png?size=40",
    author: "dbtools",
    repository: "database-connector",
    tags: ["database", "sql", "query"],
    version: "latest",
    license: "Apache-2.0",
    config: {
      mcpServers: {
        "database-connector": {
          command: "node",
          args: ["database-connector-mcp"],
          env: {
            DB_CONNECTION_STRING: "your-db-connection-string"
          }
        }
      }
    }
  },
  {
    name: "Web Scraper Pro",
    id: "web-scraper-pro",
    description: "Advanced web scraping capabilities with support for dynamic content, authentication, and data extraction.",
    category: "Web Search",
    install: "npx web-scraper-pro-mcp",
    docs: "https://github.com/webscraper/pro-mcp",
    icon: "https://github.com/webscraper.png?size=40",
    author: "webscraper",
    repository: "pro-mcp",
    tags: ["scraping", "web", "data"],
    version: "latest",
    license: "MIT",
    config: {
      mcpServers: {
        "web-scraper-pro": {
          command: "npx",
          args: ["web-scraper-pro-mcp"],
          env: {}
        }
      }
    }
  },
  {
    name: "System Monitor",
    id: "system-monitor",
    description: "Monitor system resources, processes, and performance metrics in real-time.",
    category: "System",
    install: "npx system-monitor-mcp",
    docs: "https://github.com/sysmon/system-monitor-mcp",
    icon: "https://github.com/sysmon.png?size=40",
    author: "sysmon",
    repository: "system-monitor-mcp",
    tags: ["system", "monitoring", "performance"],
    version: "latest",
    license: "GPL-3.0",
    config: {
      mcpServers: {
        "system-monitor": {
          command: "npx",
          args: ["system-monitor-mcp"],
          env: {}
        }
      }
    }
  }
];

const fetchMCPLibrariesFromAPI = async (): Promise<MCPLibrary[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch('/api/mcp-libraries', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'API returned error status');
    return data.libraries;
  } catch (error) {
    throw error;
  }
};

const fetchAwesomeMCPServers = async (): Promise<string> => {
  const urls = [
    'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md',
    'https://api.github.com/repos/punkpeye/awesome-mcp-servers/contents/README.md'
  ];
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': url.includes('api.github.com') ? 'application/vnd.github.v3.raw' : 'text/plain',
          'User-Agent': 'MCPMarketplace/1.0',
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      if (!text || text.length < 100) throw new Error('Received empty or invalid content');
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('All fetch attempts failed');
};

const parseMarkdownToMCPLibraries = (markdown: string): MCPLibrary[] => {
  const libraries: MCPLibrary[] = [];
  const lines = markdown.split('\n');
  
  console.log('Starting to parse markdown, total lines:', lines.length);
  
  let currentCategory = 'General';
  let inServerSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, HTML anchor tags, and other non-content lines
    if (!line || 
        line.startsWith('<a name=') || 
        line.startsWith('<a id=') ||
        line.startsWith('<!--') ||
        line.startsWith('[!') ||
        line.includes('🏎️') || 
        line.includes('📇') ||
        line.includes('Back to top')) {
      continue;
    }
    
    // Check if we're in the servers section - look for "Servers" in headers
    if (line.startsWith('## ') && line.toLowerCase().includes('server')) {
      inServerSection = true;
      currentCategory = 'Servers';
      console.log('Found servers section');
      continue;
    }
    
    // Skip table of contents and other sections before servers
    if (!inServerSection) continue;
    
    // Extract category from headers (### or #### level)
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      // Clean category name by removing emojis, HTML, and anchor links
      currentCategory = line
        .replace(/^#+\s*/, '')
        .replace(/[📁🔧⚡🌐🔍💾🛠️📊🎯🔒🎮📝🌍🏎️📇🏠☁️🍎🪟🐧🎨🎵🔗📈📄🌟]/g, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Skip if it looks like an anchor or empty
      if (currentCategory.includes('name=') || !currentCategory || currentCategory.length < 2) {
        continue;
      }
      
      console.log('Updated category to:', currentCategory);
      continue;
    }
    
    // Parse server entries - look for markdown links in list format
    const serverMatch = line.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*[-–—]?\s*(.*)$/);
    
    if (serverMatch) {
      const [, name, url, description] = serverMatch;
      
      // Skip entries that are clearly not MCP servers
      const skipPatterns = [
        /tutorials?/i,
        /quickstart/i,
        /reddit/i,
        /discord/i,
        /community/i,
        /setup.*claude/i,
        /getting.?started/i,
        /how.?to/i,
        /^docs?$/i,
        /^guide$/i
      ];
      
      const shouldSkip = skipPatterns.some(pattern => 
        pattern.test(name) || pattern.test(description)
      );
      
      if (shouldSkip) {
        console.log('Skipping non-server entry:', name);
        continue;
      }
      
      // Enhanced description cleaning
      let cleanDescription = description
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
        .replace(/�\s*/g, '') // Remove replacement characters
        .replace(/&[a-z]+;/gi, '') // Remove HTML entities
        .replace(/^\s*[-–—]\s*/, '') // Remove leading dashes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // If description is empty, unclear, or looks like HTML/anchor, use a default
      if (!cleanDescription || 
          cleanDescription.includes('name=') || 
          cleanDescription.length < 10 ||
          /^[^a-zA-Z]*$/.test(cleanDescription)) {
        cleanDescription = 'No description available';
      }
      
      console.log('Found server:', name, 'in category:', currentCategory);
      
      // Generate ID from name
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Check for duplicates before adding
      const duplicate = libraries.find(existing => 
        existing.name === name.trim() || 
        existing.docs === url ||
        existing.id === id
      );
      
      if (duplicate) {
        console.log('Skipping duplicate:', name.trim(), 'already exists as:', duplicate.name);
        continue;
      }
      
      // Generate install command based on GitHub URL
      let install = '';
      if (url.includes('github.com')) {
        const repoPath = url.replace('https://github.com/', '').replace(/\/$/, '');
        const repoParts = repoPath.split('/');
        if (repoParts.length >= 2) {
          // Use the repository name for npx command
          install = `npx ${repoParts[1]}`;
        }
      } else {
        install = `npm install ${id}`;
      }
      
      // Generate icon URL from GitHub
      let icon = '';
      let author = '';
      let repository = '';
      if (url.includes('github.com')) {
        const repoPath = url.replace('https://github.com/', '').replace(/\/$/, '');
        const repoParts = repoPath.split('/');
        if (repoParts.length >= 2) {
          author = repoParts[0];
          repository = repoParts[1];
          icon = `https://github.com/${repoParts[0]}.png?size=40`;
        }
      }
      
      // Generate sample config JSON
      const config = {
        mcpServers: {
          [id]: {
            command: install.startsWith('npx') ? install.split(' ')[1] : 'node',
            args: install.startsWith('npx') ? [] : [install.split(' ').slice(1).join(' ')],
            env: {}
          }
        }
      };
      
      libraries.push({
        name: name.trim(),
        id,
        description: cleanDescription,
        category: currentCategory,
        install,
        docs: url,
        icon,
        author,
        repository,
        config,
        tags: [currentCategory.toLowerCase()],
        version: "latest",
        license: "Unknown"
      });
      
      console.log('Added library:', name.trim(), 'ID:', id, 'Category:', currentCategory);
    }
  }
  
  console.log('Parsing complete. Found', libraries.length, 'libraries');
  return libraries;
};

// --- MCP Marketplace Component ---
const highlightMatch = (text: string, terms: string[]): React.ReactNode => {
  if (!terms.length || terms[0] === '*') return text;
  
  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  let result: React.ReactNode[] = [];
  let remainingText = text;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    let matchFound = false;
    let earliestMatchIndex = remainingText.length;
    let matchedTerm = '';
    let matchedLength = 0;

    // Find the earliest match among all terms
    for (const term of sortedTerms) {
      if (!term) continue;
      const lowerText = remainingText.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const matchIndex = lowerText.indexOf(lowerTerm);
      
      if (matchIndex !== -1 && matchIndex < earliestMatchIndex) {
        earliestMatchIndex = matchIndex;
        matchedTerm = remainingText.substr(matchIndex, term.length);
        matchedLength = term.length;
        matchFound = true;
      }
    }

    if (matchFound) {
      // Add text before the match
      if (earliestMatchIndex > 0) {
        result.push(remainingText.substring(0, earliestMatchIndex));
      }
      
      // Add the highlighted match
      result.push(
        <mark key={keyIndex++} className="bg-yellow-300 text-black rounded px-0.5">
          {matchedTerm}
        </mark>
      );
      
      // Update remaining text
      remainingText = remainingText.substring(earliestMatchIndex + matchedLength);
    } else {
      // No more matches, add remaining text
      result.push(remainingText);
      break;
    }
  }

  return result.length > 1 ? result : text;
};

const MCPMarketplace: React.FC = () => {
  const [search, setSearch] = useState("");
  const [libraries, setLibraries] = useState<MCPLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<MCPLibrary | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<'github' | 'fallback'>('fallback');
  const [copying, setCopying] = useState(false);
  const { toast } = useToast();

  // Copy to clipboard with proper error handling
  const handleCopyInstallCommand = useCallback(async (installCommand: string) => {
    if (copying) return;
    
    setCopying(true);
    try {
      await navigator.clipboard.writeText(installCommand);
      toast({
        title: "Copied!",
        description: "Install command copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please copy manually.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setCopying(false);
    }
  }, [copying, toast]);

  // Load libraries from API, then fallback to markdown, then fallback to hardcoded
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let libs = await fetchMCPLibrariesFromAPI();
        if (!libs || libs.length === 0) throw new Error('Empty API result');
        if (!cancelled) {
          setLibraries(libs);
          setDataSource('github');
        }
      } catch {
        try {
          const md = await fetchAwesomeMCPServers();
          const libs = parseMarkdownToMCPLibraries(md);
          if (!libs || libs.length === 0) throw new Error('Markdown parse failed');
          if (!cancelled) {
            setLibraries(libs);
            setDataSource('github');
          }
        } catch {
          if (!cancelled) {
            setLibraries(FALLBACK_MCP_LIBRARIES);
            setDataSource('fallback');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute unique categories (deduplication)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    libraries.forEach(lib => {
      if (lib.category) cats.add(lib.category);
    });
    return Array.from(cats).sort();
  }, [libraries]);

  // Filtered libraries with AND/wildcard logic
  const filteredLibraries = useMemo(() => {
    let libs = libraries;
    let terms = search.trim() === '*' ? [] : search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (search.trim() && search.trim() !== '*') {
      libs = libs.filter(lib => {
        // All terms must match somewhere (AND logic)
        return terms.every(term =>
          lib.name.toLowerCase().includes(term) ||
          (lib.description && lib.description.toLowerCase().includes(term)) ||
          (lib.tags && lib.tags.some(tag => tag.toLowerCase().includes(term)))
        );
      });
    }
    if (selectedCategories.length > 0) {
      libs = libs.filter(lib => selectedCategories.includes(lib.category));
    }
    return libs;
  }, [libraries, search, selectedCategories]);

  // UI rendering
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-[#18181b] to-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-800 bg-[#141414]">
        <Info className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white flex-1">MCP Marketplace</h2>
        {loading && <RotateCw className="h-5 w-5 animate-spin text-blue-400" />}
        {dataSource === 'fallback' && <Badge className="bg-yellow-700 text-yellow-200 ml-2">Offline Mode</Badge>}
      </div>
      {/* Filters/Search */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800 bg-[#18181b]">
        <Input
          placeholder="Search servers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Categories
              {selectedCategories.length > 0 && (
                <span className="ml-2 text-xs text-blue-400">({selectedCategories.length})</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-[#18181b] border-gray-700">
            <Command>
              <CommandInput placeholder="Filter categories..." />
              <CommandList>
                <CommandEmpty>No categories found.</CommandEmpty>
                <CommandGroup>
                  {categories.map(cat => (
                    <CommandItem key={cat} onSelect={() => {
                      setSelectedCategories(prev => prev.includes(cat)
                        ? prev.filter(c => c !== cat)
                        : [...prev, cat]);
                    }}>
                      <Checkbox checked={selectedCategories.includes(cat)} className="mr-2" />
                      {cat}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])}>
            Clear
          </Button>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-400 ml-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
      {/* Marketplace Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: List */}
        <ScrollArea className="w-1/3 h-full border-r border-gray-800 bg-[#18181b]">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RotateCw className="h-6 w-6 animate-spin mr-2" /> Loading...
              </div>
            ) : filteredLibraries.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400">No servers found.</div>
            ) : (
              filteredLibraries.map(lib => {
                let terms = search.trim() === '*' ? [] : search.trim().toLowerCase().split(/\s+/).filter(Boolean);
                return (
                  <Card
                    key={lib.id}
                    className={`cursor-pointer border-0 ${selectedLibrary?.id === lib.id ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-l-blue-500 shadow-lg' : 'bg-[#1e1e1e] hover:bg-[#252525] hover:shadow-md'}`}
                    onClick={() => setSelectedLibrary(lib)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {lib.icon && <img src={lib.icon} alt={lib.name} className="w-10 h-10 rounded" />}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{highlightMatch(lib.name, terms)}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{highlightMatch(lib.description || '', terms)}</p>
                        <p className="text-xs text-gray-500 mt-1">{highlightMatch(lib.category, terms)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
        {/* Right: Details */}
        <div className="flex-1 h-full overflow-y-auto bg-[#18181b]">
          {selectedLibrary ? (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                {selectedLibrary.icon && <img src={selectedLibrary.icon} alt={selectedLibrary.name} className="w-16 h-16 rounded" />}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{selectedLibrary.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-gray-800 text-gray-400 text-xs">{selectedLibrary.category}</Badge>
                    {selectedLibrary.tags && selectedLibrary.tags
                      .filter(tag => tag.toLowerCase() !== selectedLibrary.category.toLowerCase())
                      .map(tag => (
                        <Badge key={tag} className="bg-blue-900 text-blue-300 text-xs">{tag}</Badge>
                      ))}
                  </div>
                  <p className="text-gray-300 mb-2">{selectedLibrary.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {selectedLibrary.docs && (
                      <a href={selectedLibrary.docs} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">View Docs</a>
                    )}
                    {selectedLibrary.repository && (
                      <a href={`https://github.com/${selectedLibrary.author}/${selectedLibrary.repository}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">GitHub</a>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedLibrary(null)}>
                  <X className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-2">Install Command</h4>
                <Card className="border-0 bg-[#0f0f0f]">
                  <CardContent className="p-4">
                    <code className="text-blue-400 font-mono text-sm select-all">{selectedLibrary.install}</code>
                  </CardContent>
                </Card>
              </div>
              {selectedLibrary.config && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-2">Sample Config</h4>
                  <Card className="border-0 bg-[#0f0f0f]">
                    <CardContent className="p-4">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-60">{JSON.stringify(selectedLibrary.config, null, 2)}</pre>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex items-center gap-4 mt-8">
                <Button
                  variant="default"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => handleCopyInstallCommand(selectedLibrary.install)}
                  disabled={copying}
                >
                  {copying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Install Command
                    </>
                  )}
                </Button>
                {selectedLibrary.docs && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => window.open(selectedLibrary.docs, '_blank')}
                  >
                    Open Docs
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center space-y-4">
                <Info className="h-16 w-16 text-blue-400 mx-auto" />
                <h3 className="text-2xl font-semibold text-gray-300 mb-2">Select a Server</h3>
                <p className="text-gray-500">Choose a server from the left panel to view its details and install instructions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPMarketplace;
