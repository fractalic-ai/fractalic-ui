import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('MCP Registry API proxy called');
  
  try {
    const allServers: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    
    // Fetch all pages
    while (hasMore && pageCount < 10) {
      const url = cursor 
        ? `https://registry.modelcontextprotocol.io/v0/servers?after=${cursor}`
        : 'https://registry.modelcontextprotocol.io/v0/servers';
        
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
        allServers.push(...data.servers);
      }
      
      cursor = data.metadata?.next_cursor;
      hasMore = !!cursor;
      pageCount++;
      
      console.log(`Page ${pageCount} complete. Total servers: ${allServers.length}, Next cursor: ${cursor}, Has more: ${hasMore}`);
      
      // Add small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const activeServers = allServers.filter(s => s.status === 'active');
    
    console.log(`=== FINAL RESULT ===`);
    console.log(`Total pages fetched: ${pageCount}`);
    console.log(`Total servers collected: ${allServers.length}`);
    console.log(`Active servers: ${activeServers.length}`);
    if (pageCount === 1 && hasMore) {
      console.log(`⚠️  Only got first page - pagination failed on page 2`);
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