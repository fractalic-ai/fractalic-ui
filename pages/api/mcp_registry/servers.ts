import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('MCP Registry API proxy called');
  
  try {
    const allServers: any[] = [];
    const serverNames = new Set<string>(); // Track unique server names for deduplication
    let cursor: string | null = null;
    let previousCursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20; // Increased limit to handle larger registry (20 * 100 = 2000 servers max)

    // Fetch all pages with limit=100 to get more servers per request
    // Use version=latest to filter only latest versions of each server
    while (hasMore && pageCount < maxPages) {
      const url = cursor
        ? `https://registry.modelcontextprotocol.io/v0/servers?limit=100&version=latest&cursor=${cursor}`
        : 'https://registry.modelcontextprotocol.io/v0/servers?limit=100&version=latest';

      console.log(`Fetching page ${pageCount + 1} from: ${url}`);
      const response = await fetch(url);
      console.log(`Page ${pageCount + 1} response status:`, response.status);
      
      if (!response.ok) {
        console.error(`Page ${pageCount + 1} API error:`, response.status, response.statusText);
        
        // Check if it's a known database issue
        if (response.status === 500) {
          const errorText = await response.text();
          if (errorText.includes('conn busy') || errorText.includes('database')) {
            console.error('Registry database connection issue detected');
            return res.status(503).json({ 
              error: 'MCP Registry is temporarily unavailable',
              details: 'The registry is experiencing database issues. Please try again later.',
              servers: [],
              metadata: {
                count: 0,
                total: 0,
                registry_status: 'database_error'
              }
            });
          }
        }
        
        if (allServers.length === 0) {
          return res.status(response.status).json({ 
            error: `Registry API returned ${response.status}: ${response.statusText}` 
          });
        }
        break; // If we have some servers, return what we have
      }
      
      const data = await response.json();
      console.log(`Page ${pageCount + 1} data:`, {
        servers_count: data.servers?.length || 0,
        next_cursor: data.metadata?.nextCursor || data.metadata?.next_cursor,
        has_metadata: !!data.metadata
      });

      if (data.servers) {
        // Deduplicate servers as we collect them
        // New API structure: { server: {...}, _meta: {...} }
        for (const item of data.servers) {
          const server = item.server || item; // Support both old and new structure
          const meta = item._meta;

          // Merge server data with metadata
          const serverWithMeta = {
            ...server,
            _meta: meta,
            // Extract status from new location for easier access
            status: meta?.['io.modelcontextprotocol.registry/official']?.status || server.status || 'unknown'
          };

          if (!serverNames.has(serverWithMeta.name)) {
            serverNames.add(serverWithMeta.name);
            allServers.push(serverWithMeta);
          }
        }
      }

      previousCursor = cursor;
      // API changed from snake_case to camelCase
      cursor = data.metadata?.nextCursor || data.metadata?.next_cursor;

      // Check if pagination is broken (same cursor returned)
      if (cursor === previousCursor && cursor !== null) {
        console.log(`Pagination broken - same cursor returned. Stopping.`);
        hasMore = false;
      } else {
        hasMore = !!cursor;
      }

      pageCount++;

      console.log(`Page ${pageCount} complete. Total unique servers: ${allServers.length}, Next cursor: ${cursor}, Has more: ${hasMore}`);
      
      // Add small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const activeServers = allServers.filter(s => s.status === 'active');

    console.log(`=== FINAL RESULT ===`);
    console.log(`Total pages fetched: ${pageCount}`);
    console.log(`Total unique servers (latest versions): ${allServers.length}`);
    console.log(`Active servers: ${activeServers.length}`);
    console.log(`==================`);
    
    // Return the complete dataset in the expected format
    res.status(200).json({
      servers: allServers,
      metadata: {
        count: allServers.length,
        total: allServers.length,
        pages_fetched: pageCount,
        partial_data: pageCount === 1 && hasMore // Indicate if we only got partial data
      }
    });
  } catch (error) {
    console.error('Registry API proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from MCP Registry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}