import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('[save-tool API] Request received');
  try {
    const { name, path: toolPath, content, createToolsFolder, targetDirectory } = await request.json();
    console.log('[save-tool API] Parsed request data:', { name, toolPath, contentLength: content?.length, createToolsFolder, targetDirectory });
    
    if (!name || !toolPath || !content) {
      console.log('[save-tool API] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, path, and content are required' },
        { status: 400 }
      );
    }
    
    // Get the current working directory (where the user's project is)
    const cwd = process.cwd();
    
    // Determine the base directory for tools installation
    let toolsDir: string;
    if (targetDirectory) {
      // Use the provided target directory
      if (path.isAbsolute(targetDirectory)) {
        toolsDir = targetDirectory;
      } else {
        // For relative paths, resolve them relative to cwd
        toolsDir = path.resolve(cwd, targetDirectory);
      }
    } else {
      // Fallback to the old behavior: tools directory in project root
      toolsDir = path.join(cwd, 'tools');
    }

    console.log('Target tools directory:', toolsDir);
    
    // Create tools directory if it doesn't exist and createToolsFolder is true
    if (createToolsFolder) {
      try {
        await fs.mkdir(toolsDir, { recursive: true });
      } catch (error) {
        console.warn('Could not create tools directory:', error);
      }
    }
    
    // Ensure the tool path maintains its directory structure within tools/
    const fullToolPath = path.join(toolsDir, toolPath);
    const toolDir = path.dirname(fullToolPath);
    
    // Create nested directories if they don't exist
    try {
      await fs.mkdir(toolDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create tool directory:', error);
    }
    
    // Write the tool file
    console.log('[save-tool API] Attempting to write file to:', fullToolPath);
    try {
      await fs.writeFile(fullToolPath, content, 'utf8');
      console.log('[save-tool API] File written successfully');
      
      return NextResponse.json({
        success: true,
        savedPath: fullToolPath,
        message: `${name} installed successfully`
      });
      
    } catch (writeError) {
      console.error('[save-tool API] Failed to write tool file:', writeError);
      return NextResponse.json(
        { error: 'Failed to save tool file to filesystem' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Save tool API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}