// Test file for deployment utilities
// This is a simple test to verify our utility functions work correctly

import {
  parseDeploymentEvent,
  getScriptNameFromPath,
  getScriptDirectory,
  createDeploymentPayload,
  getStageInfo,
  getProgressColor,
  getDeploymentApiUrl
} from './deployUtils';

// Test parseDeploymentEvent
console.log('Testing parseDeploymentEvent...');

const testEventData = JSON.stringify({
  deployment_id: 'test-123',
  stage: 'validating',
  progress: 10,
  message: 'Starting validation',
  timestamp: '2025-06-25T10:00:00Z'
});

const parsedEvent = parseDeploymentEvent(`data: ${testEventData}`);
console.log('Parsed event:', parsedEvent);

// Test getScriptNameFromPath
console.log('Testing getScriptNameFromPath...');
console.log('/path/to/my-script.py ->', getScriptNameFromPath('/path/to/my-script.py'));
console.log('/path/to/Complex Script Name.js ->', getScriptNameFromPath('/path/to/Complex Script Name.js'));
console.log('script.py ->', getScriptNameFromPath('script.py'));

// Test getScriptDirectory
console.log('Testing getScriptDirectory...');
console.log('/path/to/script.py ->', getScriptDirectory('/path/to/script.py'));
console.log('script.py ->', getScriptDirectory('script.py'));

// Test createDeploymentPayload
console.log('Testing createDeploymentPayload...');
const payload = createDeploymentPayload('/home/user/projects/my-app/main.py', '/home/user/projects/my-app');
console.log('Deployment payload:', payload);

// Test getStageInfo
console.log('Testing getStageInfo...');
console.log('validating ->', getStageInfo('validating'));
console.log('completed ->', getStageInfo('completed'));
console.log('error ->', getStageInfo('error'));

// Test getProgressColor
console.log('Testing getProgressColor...');
console.log('validating, 50% ->', getProgressColor('validating', 50));
console.log('completed, 100% ->', getProgressColor('completed', 100));
console.log('error, 100% ->', getProgressColor('error', 100));

// Test getDeploymentApiUrl
console.log('Testing getDeploymentApiUrl...');
const mockConfig = {
  api: {
    backend: 'http://localhost:8000',
    ai_server: 'http://localhost:8001',
    mcp_manager: 'http://localhost:5859'
  },
  container: {
    internal_ports: {},
    host_ports: {}
  },
  deployment: {
    type: 'development',
    container_name: 'test',
    build_timestamp: Date.now()
  },
  paths: {
    default_git_path: '/'
  }
};

console.log('Deployment API URL ->', getDeploymentApiUrl(mockConfig));

export {};
