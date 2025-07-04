import { AppConfig, getApiUrl } from '@/hooks/use-app-config';

export interface DeploymentMetadata {
  ai_server: {
    host: string;
    port: number;
    health_url: string;
    docs_url: string;
  };
  deployment: {
    script_name: string;
    script_path: string;
    container_name: string;
    container_id: string;
  };
  api: {
    endpoint: string;
    sample_curl: string;
    example_payload: {
      filename: string;
      parameter_text?: string;
    };
  };
  container: {
    logs_command: string;
    stop_command: string;
    remove_command: string;
  };
  services: {
    ai_server: string;
    mcp_manager: string;
  };
}

export interface DeploymentStatus {
  deployment_id: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
  error?: string;
  result?: {
    success: boolean;
    deployment_id: string;
    endpoint_url: string;
    metadata?: DeploymentMetadata;
  };
}

export interface DeploymentPayload {
  image_name: string;
  image_tag: string;
  script_name: string;
  script_folder: string;
}

/**
 * Parse deployment event data from Server-Sent Events
 */
export function parseDeploymentEvent(data: string): DeploymentStatus | null {
  try {
    // Handle empty or malformed data
    if (!data || typeof data !== 'string' || data.trim() === '') {
      return null;
    }

    // Remove "data: " prefix if present
    const cleanData = data.startsWith('data: ') ? data.substring(6) : data;
    
    // Additional validation for clean data
    if (!cleanData || cleanData.trim() === '') {
      return null;
    }

    // Parse JSON with additional safety check
    let parsed;
    try {
      parsed = JSON.parse(cleanData.trim());
    } catch (jsonError) {
      console.warn('JSON parse error:', jsonError, 'Data:', cleanData);
      return null;
    }
    
    // Validate parsed data is an object
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Parsed data is not an object:', parsed);
      return null;
    }
    
    // Validate required fields
    if (!parsed.deployment_id || !parsed.stage || typeof parsed.progress !== 'number') {
      console.warn('Invalid deployment event structure:', parsed);
      return null;
    }

    return parsed as DeploymentStatus;
  } catch (error) {
    console.error('Failed to parse deployment event:', error, 'Data:', data);
    return null;
  }
}

/**
 * Extract script name from file path
 */
export function getScriptNameFromPath(filePath: string): string {
  if (!filePath || filePath === '/') {
    return 'unknown';
  }

  // Get filename without extension
  const fileName = filePath.split('/').pop() || 'unknown';
  const nameWithoutExt = fileName.split('.').slice(0, -1).join('.') || fileName;
  
  // Replace spaces and special characters with hyphens
  return nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'script';
}

/**
 * Get script directory from file path
 */
export function getScriptDirectory(filePath: string): string {
  if (!filePath || filePath === '/') {
    return '/';
  }

  const directory = filePath.split('/').slice(0, -1).join('/');
  return directory || '/';
}

/**
 * Create deployment payload for the API
 */
export function createDeploymentPayload(filePath: string, repoPath?: string): DeploymentPayload {
  const scriptName = getScriptNameFromPath(filePath);
  const scriptFolder = getScriptDirectory(filePath);

  return {
    image_name: 'ghcr.io/fractalic-ai/fractalic',
    image_tag: 'latest',
    script_name: scriptName,
    script_folder: repoPath || scriptFolder,
  };
}

/**
 * Get stage-specific information
 */
export function getStageInfo(stage: string): { label: string; color: string; description: string } {
  switch (stage) {
    case 'validating':
      return {
        label: 'Validating',
        color: 'text-blue-400',
        description: 'Checking deployment configuration and requirements'
      };
    case 'pulling_image':
      return {
        label: 'Pulling Image',
        color: 'text-purple-400',
        description: 'Downloading Docker image from registry'
      };
    case 'preparing_files':
      return {
        label: 'Preparing Files',
        color: 'text-yellow-400',
        description: 'Preparing script files for deployment'
      };
    case 'creating_container':
      return {
        label: 'Creating Container',
        color: 'text-orange-400',
        description: 'Setting up Docker container configuration'
      };
    case 'starting_container':
      return {
        label: 'Starting Container',
        color: 'text-green-400',
        description: 'Launching the deployed application'
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-green-500',
        description: 'Deployment completed successfully'
      };
    case 'error':
      return {
        label: 'Error',
        color: 'text-red-500',
        description: 'Deployment failed'
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-400',
        description: 'Processing deployment step'
      };
  }
}

/**
 * Get the deployment API URL - uses the backend URL from config
 */
export function getDeploymentApiUrl(config?: AppConfig | null): string {
  return getApiUrl('backend', config);
}

/**
 * Get progress bar color based on stage and progress
 */
export function getProgressColor(stage: string, progress: number): string {
  if (stage === 'error') {
    return 'bg-red-500';
  }
  if (stage === 'completed' && progress === 100) {
    return 'bg-green-500';
  }
  return 'bg-blue-500';
}
