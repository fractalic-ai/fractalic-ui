import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { serverId } = req.query;
  
  if (!serverId || typeof serverId !== 'string') {
    return res.status(400).json({ error: 'Server ID is required' });
  }
  
  console.log('Fetching server details for:', serverId);
  
  try {
    // The serverId comes already URL-encoded from the client, so don't double-encode
    const url = `https://registry.modelcontextprotocol.io/v0/servers/${serverId}`;
    console.log('Registry URL:', url);
    
    const response = await fetch(url);
    console.log('Registry response status:', response.status);
    
    if (!response.ok) {
      console.error(`Server details API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Registry API returned ${response.status}: ${response.statusText}` 
      });
    }
    
    const data = await response.json();
    console.log('Server details received for:', serverId);
    res.status(200).json(data);
  } catch (error) {
    console.error('Registry server details proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch server details from MCP Registry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}