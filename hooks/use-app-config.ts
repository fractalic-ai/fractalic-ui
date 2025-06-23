import { useEffect, useState } from 'react';

export interface ApiConfig {
  backend: string;
  ai_server: string;
  mcp_manager: string;
}

export interface AppConfig {
  api: ApiConfig;
  container: {
    internal_ports: Record<string, number>;
    host_ports: Record<string, number>;
  };
  deployment: {
    type: string;
    container_name: string;
    build_timestamp: number;
  };
  paths: {
    default_git_path: string;
  };
}

let cachedConfig: AppConfig | null = null;

export function useAppConfig(): { config: AppConfig | null; loading: boolean; error: string | null } {
  const [config, setConfig] = useState<AppConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const response = await fetch('/config.json');
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.statusText}`);
        }
        const configData: AppConfig = await response.json();
        
        // Cache the config
        cachedConfig = configData;
        setConfig(configData);
        setError(null);
      } catch (err) {
        console.error('Failed to load app config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to environment variables
        const fallbackConfig: AppConfig = {
          api: {
            backend: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
            ai_server: process.env.NEXT_PUBLIC_AI_API_BASE_URL || 'http://localhost:8001',
            mcp_manager: process.env.NEXT_PUBLIC_MCP_API_BASE_URL || 'http://localhost:5859'
          },
          container: {
            internal_ports: { frontend: 3000, backend: 8000, ai_server: 8001, mcp_manager: 5859 },
            host_ports: { frontend: 3000, backend: 8000, ai_server: 8001, mcp_manager: 5859 }
          },
          deployment: {
            type: 'development',
            container_name: 'fractalic-dev',
            build_timestamp: Date.now()
          },
          paths: {
            default_git_path: '/'
          }
        };
        
        cachedConfig = fallbackConfig;
        setConfig(fallbackConfig);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}

// Utility function to get specific API URLs
export function getApiUrl(service: keyof ApiConfig, config?: AppConfig | null): string {
  if (config?.api?.[service]) {
    return config.api[service];
  }
  
  // Fallback to environment variables
  switch (service) {
    case 'backend':
      return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    case 'ai_server':
      return process.env.NEXT_PUBLIC_AI_API_BASE_URL || 'http://localhost:8001';
    case 'mcp_manager':
      return process.env.NEXT_PUBLIC_MCP_API_BASE_URL || 'http://localhost:5859';
    default:
      return 'http://localhost:8000';
  }
}
