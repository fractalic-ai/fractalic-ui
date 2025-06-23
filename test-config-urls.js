#!/usr/bin/env node

// Simple test script to verify our URL configuration changes

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Backend URL Configuration Fixes\n');

// Test 1: Verify config.json exists and has correct structure
const configPath = path.join(__dirname, 'public', 'config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ config.json exists and contains:');
  console.log('   Backend URL:', config.api?.backend || 'MISSING');
  console.log('   AI Server URL:', config.api?.ai_server || 'MISSING');
  console.log('   MCP Manager URL:', config.api?.mcp_manager || 'MISSING');
} else {
  console.log('❌ config.json NOT FOUND');
}

// Test 2: Search for remaining relative URLs that should be fixed
const componentsToCheck = [
  'components/Editor.tsx',
  'components/FileTree.tsx', 
  'components/SettingsModal.tsx',
  'components/GitDiffViewer.tsx'
];

console.log('\n🔍 Checking for remaining problematic URLs...\n');

const problematicPatterns = [
  /fetch\(['"`]\/(?!api\/|config\.json)/g,  // Relative URLs that aren't /api/ or /config.json
  /fetch\(`\/(?!api\/|config\.json)/g,      // Template literal version
];

let foundIssues = false;

componentsToCheck.forEach(component => {
  const filePath = path.join(__dirname, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    problematicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`❌ Found problematic URL in ${component}:`);
        matches.forEach(match => {
          console.log(`   ${match}`);
        });
        foundIssues = true;
      }
    });
  }
});

if (!foundIssues) {
  console.log('✅ No problematic relative URLs found in checked components');
}

// Test 3: Check for getApiUrl usage
console.log('\n🔍 Checking for getApiUrl usage...\n');

componentsToCheck.forEach(component => {
  const filePath = path.join(__dirname, component);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('getApiUrl(\'backend\'')) {
      console.log(`✅ ${component} uses getApiUrl('backend')`);
    } else {
      console.log(`⚠️  ${component} does NOT use getApiUrl('backend')`);
    }
    
    if (content.includes('useAppConfig')) {
      console.log(`✅ ${component} imports useAppConfig`);
    } else {
      console.log(`⚠️  ${component} does NOT import useAppConfig`);
    }
  }
});

console.log('\n📋 Summary:');
console.log('- All backend file/directory operations should now use the backend URL from config');
console.log('- Frontend /api/ routes and /config.json continue to use relative URLs (correct)'); 
console.log('- Components should import useAppConfig and use getApiUrl(\'backend\', config)');
console.log('\n🚀 Ready to test with backend server running on configured port!');
