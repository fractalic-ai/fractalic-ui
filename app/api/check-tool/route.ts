import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { expectedPath, toolName } = await request.json();
    
    if (!expectedPath || !toolName) {
      return NextResponse.json(
        { error: 'Missing required fields: expectedPath and toolName are required' },
        { status: 400 }
      );
    }
    
    // Get the current working directory (where the user's project is)
    const cwd = process.cwd();
    
    // Create the expected full path
    const expectedFullPath = path.join(cwd, expectedPath);
    
    try {
      // Check if file exists at expected location
      await fs.access(expectedFullPath);
      
      return NextResponse.json({
        status: 'installed-correct',
        actualPath: expectedPath,
        exists: true
      });
      
    } catch (expectedError) {
      // File doesn't exist at expected location, search for it elsewhere
      try {
        // Search for the tool file in the entire project directory
        const foundPath = await findToolInDirectory(cwd, `${toolName}.py`);
        
        if (foundPath) {
          // File found but in wrong location
          const relativePath = path.relative(cwd, foundPath);
          return NextResponse.json({
            status: 'installed-wrong-location',
            actualPath: relativePath,
            exists: true
          });
        } else {
          // File not found anywhere
          return NextResponse.json({
            status: 'not-installed',
            exists: false
          });
        }
        
      } catch (searchError) {
        console.warn('Error searching for tool:', searchError);
        return NextResponse.json({
          status: 'not-installed',
          exists: false
        });
      }
    }
    
  } catch (error) {
    console.error('Check tool API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to recursively search for a file
async function findToolInDirectory(dir: string, fileName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and hidden directories
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const found = await findToolInDirectory(fullPath, fileName);
        if (found) return found;
      } else if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }
    }
    
    return null;
  } catch (error) {
    // Permission denied or other errors - skip this directory
    return null;
  }
}