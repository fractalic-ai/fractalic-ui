import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Normalize the path to handle both absolute and relative paths
    const normalizedPath = path.normalize(filePath);
    console.log('Attempting to read file at path:', normalizedPath);

    // Ensure the file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('File not found at path:', normalizedPath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the file content
    const content = fs.readFileSync(normalizedPath, 'utf-8');
    console.log('Successfully read file content, length:', content.length);
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file content' },
      { status: 500 }
    );
  }
} 