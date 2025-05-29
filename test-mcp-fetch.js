#!/usr/bin/env node

/**
 * Test script to verify MCP data fetching functionality
 * This script tests the same logic used in the MCPManager component
 */

const URLS = [
  'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md',
  'https://api.github.com/repos/punkpeye/awesome-mcp-servers/contents/README.md'
];

async function testFetch() {
  console.log('🧪 Testing MCP data fetching...\n');
  
  for (const url of URLS) {
    try {
      console.log(`🌐 Testing: ${url}`);
      
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
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`✅ Success: Received ${text.length} characters`);
        
        // Test basic parsing
        const serverMatches = text.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)/gm);
        console.log(`📦 Found ${serverMatches ? serverMatches.length : 0} potential server entries`);
        
        // Test for specific problematic entries
        const hasAtlassian = text.toLowerCase().includes('atlassian');
        const hasSooperset = text.toLowerCase().includes('sooperset');
        console.log(`🔍 Contains 'atlassian': ${hasAtlassian}`);
        console.log(`🔍 Contains 'sooperset': ${hasSooperset}`);
        
        console.log('✅ URL is working correctly\n');
        return { success: true, url, length: text.length };
      } else {
        console.log(`❌ Failed: HTTP ${response.status}\n`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.name === 'AbortError') {
        console.log('⏱️ Request timed out');
      }
      console.log();
    }
  }
  
  return { success: false };
}

// Run the test
testFetch().then(result => {
  if (result.success) {
    console.log('🎉 All tests passed! Data fetching should work correctly.');
  } else {
    console.log('⚠️ All URLs failed. The app will fall back to cached data.');
  }
}).catch(error => {
  console.error('💥 Test script failed:', error);
});
