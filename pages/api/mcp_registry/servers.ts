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
    const maxPages = 10; // Limit pages since pagination is broken

    // Fetch all pages with limit=100 to get more servers per request
    while (hasMore && pageCount < maxPages) {
      const url = cursor
        ? `https://registry.modelcontextprotocol.io/v0/servers?limit=100&after=${cursor}`
        : 'https://registry.modelcontextprotocol.io/v0/servers?limit=100';

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
        next_cursor: data.metadata?.next_cursor,
        has_metadata: !!data.metadata
      });
      
      if (data.servers) {
        // Deduplicate servers as we collect them
        for (const server of data.servers) {
          if (!serverNames.has(server.name)) {
            serverNames.add(server.name);
            allServers.push(server);
          }
        }
      }
      
      previousCursor = cursor;
      cursor = data.metadata?.next_cursor;

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
    console.log(`Total unique servers collected: ${allServers.length}`);
    console.log(`Active servers: ${activeServers.length}`);

    // Note about API limitations
    if (allServers.length < 100) {
      console.log(`⚠️  MCP Registry API pagination is currently broken - only ${allServers.length} servers available`);
    }

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