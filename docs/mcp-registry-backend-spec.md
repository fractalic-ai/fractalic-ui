# MCP Registry Backend Endpoint Specification

This document outlines the backend endpoints needed to support the MCP Official Registry functionality in the UI.

## Required Endpoints

### 1. List MCP Registry Servers (Proxy)

**Endpoint:** `GET /mcp_registry/servers`

**Description:** Proxy endpoint to fetch servers from the MCP Registry API while handling CORS restrictions.

**Parameters:** 
- `after` (query, optional): Cursor for pagination (fetches servers after this cursor)
- `limit` (query, optional): Number of servers per page (default: 30, max: 50)

**Response:**
```json
{
  "servers": [
    {
      "name": "string",
      "description": "string",
      "status": "active|deprecated|deleted",
      "version": "string",
      "repository": {
        "url": "string",
        "source": "string",
        "id": "string",
        "subfolder": "string"
      },
      "packages": [...],
      "remotes": [...],
      "meta": {
        "official": {
          "id": "string",
          "publishedAt": "ISO_timestamp",
          "updatedAt": "ISO_timestamp",
          "isLatest": boolean
        }
      }
    }
  ],
  "metadata": {
    "count": number,
    "total": number
  }
}
```

**Implementation:**
- Proxy requests to `https://registry.modelcontextprotocol.io/v0/servers` with pagination support
- Forward `after` and `limit` query parameters for cursor-based pagination  
- Add CORS headers to allow frontend access
- Filter servers with `status: 'active'` as recommended by the registry docs
- Cache responses for 5-10 minutes to reduce API load
- Support fetching all pages automatically or return single page with next_cursor
- Registry contains 80-110+ active servers across multiple pages

### 2. Get MCP Server Details (Proxy)

**Endpoint:** `GET /mcp_registry/servers/{server_name}`

**Description:** Proxy endpoint to fetch detailed server information from the MCP Registry API.

**Parameters:**
- `server_name` (path): The name/ID of the server to fetch details for

**Response:**
```json
{
  // Full server details with expanded configuration
  "name": "string",
  "description": "string",
  "status": "active|deprecated|deleted",
  "packages": [...],
  "remotes": [...],
  // ... complete server configuration
}
```

**Implementation:**
- Proxy requests to `https://registry.modelcontextprotocol.io/v0/servers/{server_name}`
- Add CORS headers
- Handle URL encoding of server names
- Cache responses for 10-15 minutes

### 3. Install MCP Server

**Endpoint:** `POST /mcp/servers/install`

**Description:** Install an MCP server from the official registry.

**Request Body:**
```json
{
  "server_name": "string",
  "source": "string",
  "server_details": {
    // Raw mcp.json content from the server's repository
    "mcpServers": {
      "server_name": {
        "command": "string",
        "args": ["string"],
        "env": {
          "key": "value"
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "success": boolean,
  "message": "string",
  "server_id": "string",
  "installation_details": {
    "installed_at": "ISO_timestamp",
    "config_path": "string",
    "server_status": "active|inactive"
  }
}
```

**Implementation Notes:**

1. **Source Repository Cloning:**
   - Parse the `source` URL to extract GitHub repository information
   - Clone or download the repository to a temporary location
   - Look for `mcp.json` file in the root or `src/` directory

2. **Server Configuration:**
   - Extract server configuration from the `server_details.mcpServers` object
   - Update the local MCP servers configuration file (usually `mcp_servers.json`)
   - Ensure proper environment variable handling and command path resolution

3. **Dependency Installation:**
   - Check if the server requires Node.js packages (look for `package.json`)
   - Check if the server requires Python packages (look for `requirements.txt` or `pyproject.toml`)
   - Install dependencies using appropriate package managers

4. **Server Registration:**
   - Add the server to the active MCP servers list
   - Generate a unique server ID for tracking
   - Start the server process if configured for auto-start

### 2. List Installed MCP Servers (Optional Enhancement)

**Endpoint:** `GET /mcp/servers/installed`

**Description:** Get a list of currently installed MCP servers from the registry.

**Response:**
```json
{
  "servers": [
    {
      "server_id": "string",
      "server_name": "string",
      "source": "string",
      "installed_at": "ISO_timestamp",
      "status": "active|inactive|error",
      "version": "string"
    }
  ]
}
```

### 3. Uninstall MCP Server (Optional Enhancement)

**Endpoint:** `DELETE /mcp/servers/{server_id}`

**Description:** Remove an installed MCP server.

**Response:**
```json
{
  "success": boolean,
  "message": "string"
}
```

## Proxy Implementation Details

### CORS Configuration
The proxy endpoints must include proper CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Caching Strategy
Implement caching to reduce load on the MCP Registry API:
- Server list: Cache for 5-10 minutes
- Server details: Cache for 10-15 minutes
- Use HTTP ETag headers when available
- Implement graceful degradation if registry is unavailable

### Example Implementation (FastAPI)
```python
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/mcp_registry/servers")
async def get_registry_servers():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://registry.modelcontextprotocol.io/v0/servers")
            response.raise_for_status()
            data = response.json()
            
            # Filter to active servers only
            if "servers" in data:
                data["servers"] = [s for s in data["servers"] if s.get("status") == "active"]
            
            return data
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Registry unavailable: {str(e)}")

@app.get("/mcp_registry/servers/{server_name}")
async def get_server_details(server_name: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"https://registry.modelcontextprotocol.io/v0/servers/{server_name}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Server not found")
            raise HTTPException(status_code=503, detail="Registry unavailable")
```

## Error Handling

All endpoints should return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid server configuration)
- `404` - Server not found in registry
- `409` - Server already installed
- `500` - Internal server error (installation failed)

Error responses should include:
```json
{
  "error": "string",
  "details": "string",
  "code": "error_code"
}
```

## Security Considerations

1. **Repository Validation:**
   - Only allow installation from trusted sources (GitHub repositories in the official registry)
   - Validate repository URLs before cloning

2. **Sandboxing:**
   - Consider running installed servers in isolated environments
   - Limit file system access for server processes

3. **Configuration Validation:**
   - Validate `mcp.json` structure before installation
   - Sanitize command arguments and environment variables

## Integration with Existing MCP Manager

The installation process should integrate with the existing MCP manager system:
- Update the MCP servers configuration file
- Restart or reload the MCP manager if necessary
- Maintain compatibility with manually configured servers

## File System Structure

Suggested directory structure for registry-installed servers:
```
mcp_servers/
├── registry/
│   ├── {server_name}/
│   │   ├── source/          # Cloned repository
│   │   ├── config.json      # Installation metadata
│   │   └── .env            # Environment variables
│   └── installed_servers.json  # Registry installation tracking
└── mcp_servers.json        # Main MCP configuration
```

## Testing

Backend implementation should include:
1. Unit tests for server installation logic
2. Integration tests with sample MCP servers
3. Error handling tests for various failure scenarios
4. Configuration validation tests

## Future Enhancements

1. **Version Management:** Support for installing specific versions of servers
2. **Update Notifications:** Check for updates to installed servers
3. **Dependency Management:** Better handling of conflicting dependencies
4. **Server Health Monitoring:** Track server status and performance metrics