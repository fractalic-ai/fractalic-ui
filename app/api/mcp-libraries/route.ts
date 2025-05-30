import { NextResponse } from 'next/server';

interface MCPLibrary {
  name: string;
  id: string;
  description: string;
  category: string;
  install: string;
  docs: string;
  icon?: string;
  author?: string;
  repository?: string;
  config?: Record<string, unknown>;
  tags?: string[];
  version?: string;
  license?: string;
  lastUpdated?: string;
}

// Function to fetch markdown content from awesome-mcp-servers with multiple fallbacks
const fetchAwesomeMCPServers = async (): Promise<string> => {
  const urls = [
    'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md',
    'https://api.github.com/repos/punkpeye/awesome-mcp-servers/contents/README.md'
  ];
  
  for (const url of urls) {
    try {
      console.log(`[API] Attempting to fetch from: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': url.includes('api.github.com') ? 'application/vnd.github.v3.raw' : 'text/plain',
          'User-Agent': 'MCPMarketplace/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[API] Response from ${url}:`, response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      if (!text || text.length < 100) {
        throw new Error('Received empty or invalid content');
      }
      
      console.log(`[API] Successfully fetched ${text.length} characters from ${url}`);
      return text;
      
    } catch (error) {
      console.warn(`[API] Failed to fetch from ${url}:`, error);
      if (error.name === 'AbortError') {
        console.warn('[API] Request timed out');
      }
      // Continue to next URL
    }
  }
  
  throw new Error('All fetch attempts failed');
};

// Function to parse markdown and extract MCP server information
const parseMarkdownToMCPLibraries = (markdown: string): MCPLibrary[] => {
  const libraries: MCPLibrary[] = [];
  const lines = markdown.split('\n');
  
  console.log('[API] Starting to parse markdown, total lines:', lines.length);
  
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
      console.log('[API] Found servers section');
      continue;
    }
    
    // Skip table of contents and other sections before servers
    if (!inServerSection) continue;
    
    // Extract category from headers (### or #### level)
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      // Clean category name by removing emojis, HTML, and anchor links
      currentCategory = line
        .replace(/^#+\s*/, '')
        // Remove all emoji characters, symbols, and replacement characters more comprehensively
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
        // Remove common technical symbols and other problematic unicode
        .replace(/[⚡🔧📁🌐🔍💾🛠️📊🎯🔒🎮📝🌍🏎️📇🏠☁️🍎🪟🐧🎨🎵🔗📈📄🌟♂️♀️⭐🎉🔥💡🚀🎊]/g, '')
        // Remove replacement characters and other problematic symbols
        .replace(/[\uFFFD\u25A0-\u25FF\u2190-\u21FF\u2000-\u206F]/g, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Skip if it looks like an anchor or empty
      if (currentCategory.includes('name=') || !currentCategory || currentCategory.length < 2) {
        continue;
      }
      
      console.log('[API] Updated category to:', currentCategory);
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
        console.log('[API] Skipping non-server entry:', name);
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
      
      console.log('[API] Found server:', name, 'in category:', currentCategory);
      
      // Generate ID from name
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Check for duplicates before adding
      const duplicate = libraries.find(existing => 
        existing.name === name.trim() || 
        existing.docs === url ||
        existing.id === id
      );
      
      if (duplicate) {
        console.log('[API] Skipping duplicate:', name.trim(), 'already exists as:', duplicate.name);
        continue;
      }
      
      // Generate install command based on GitHub URL - improved logic
      let install = '';
      if (url.includes('github.com')) {
        const repoPath = url.replace('https://github.com/', '').replace(/\/$/, '');
        const repoParts = repoPath.split('/');
        if (repoParts.length >= 2) {
          const owner = repoParts[0];
          const repo = repoParts[1];
          
          // Try to generate more accurate install commands based on common patterns
          if (repo.includes('mcp-server') || repo.includes('mcp')) {
            // Check if it's likely an npm package
            if (owner === 'modelcontextprotocol' || owner === 'mcp-server' || repo.startsWith('@')) {
              install = `npx @modelcontextprotocol/${repo}`;
            } else if (repo.endsWith('-mcp-server') || repo.endsWith('-mcp')) {
              install = `npx ${repo}`;
            } else {
              install = `git clone ${url} && cd ${repo} && npm install && npm start`;
            }
          } else {
            // Generic GitHub repo - assume it needs to be cloned and built
            install = `git clone ${url} && cd ${repo} && npm install && npm start`;
          }
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
    }
  }
  
  console.log('[API] Total libraries parsed:', libraries.length);
  return libraries;
};

export async function GET() {
  try {
    console.log('[API] MCP Libraries API called');
    
    // Fetch the markdown content
    const markdown = await fetchAwesomeMCPServers();
    
    if (!markdown || markdown.length < 100) {
      throw new Error('Received empty or invalid markdown content');
    }
    
    // Parse the libraries
    const libraries = parseMarkdownToMCPLibraries(markdown);
    
    if (libraries.length === 0) {
      throw new Error('No libraries were parsed from the markdown');
    }
    
    console.log(`[API] Successfully parsed ${libraries.length} libraries`);
    
    // Return the libraries with proper headers
    return NextResponse.json({ 
      libraries: libraries,
      success: true,
      count: libraries.length,
      timestamp: new Date().toISOString(),
      source: 'github'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    });
    
  } catch (error) {
    console.error('[API] Error in MCP Libraries API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({ 
      error: errorMessage,
      success: false,
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}
