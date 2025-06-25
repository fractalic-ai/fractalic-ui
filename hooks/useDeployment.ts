import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppConfig, getApiUrl } from '@/hooks/use-app-config';
import {
  DeploymentStatus,
  DeploymentPayload,
  parseDeploymentEvent,
  getDeploymentApiUrl,
} from '@/utils/deployUtils';

export interface UseDeploymentReturn {
  isDeploying: boolean;
  deploymentStatus: DeploymentStatus | null;
  logs: string[];
  startDeployment: (payload: DeploymentPayload) => Promise<void>;
  resetDeployment: () => void;
}

export function useDeployment(): UseDeploymentReturn {
  const { config } = useAppConfig();
  const { toast } = useToast();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLogMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const resetDeployment = useCallback(() => {
    setIsDeploying(false);
    setDeploymentStatus(null);
    setLogs([]);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startDeployment = useCallback(async (payload: DeploymentPayload) => {
    if (!config) {
      toast({
        title: 'Deployment Error',
        description: 'App configuration not available',
        variant: 'destructive',
      });
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus(null);
    setLogs([]);
    addLogMessage('🚀 Starting deployment...');

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const deploymentApiUrl = getDeploymentApiUrl(config);
      
      // Use fetch to POST the deployment payload, then stream the response
      const response = await fetch(`${deploymentApiUrl}/api/deploy/docker-registry/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            // Process complete messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const eventData = line.substring(6);
                if (eventData.trim()) {
                  const status = parseDeploymentEvent(eventData);
                  if (status) {
                    setDeploymentStatus(status);
                    addLogMessage(status.message);
                    
                    // Handle completion or error
                    if (status.stage === 'completed' || status.stage === 'error') {
                      setIsDeploying(false);
                      
                      // Show toast notification
                      toast({
                        title: status.stage === 'completed' ? 'Deployment Successful' : 'Deployment Failed',
                        description: status.message,
                        variant: status.stage === 'completed' ? 'default' : 'destructive',
                      });
                      return;
                    }
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error('Stream reading error:', streamError);
          setIsDeploying(false);
          setDeploymentStatus({
            deployment_id: 'error',
            stage: 'error',
            progress: 100,
            message: '❌ Connection lost during deployment',
            timestamp: new Date().toISOString(),
            error: 'Connection error'
          });
          addLogMessage('❌ Connection lost during deployment');
          
          toast({
            title: 'Deployment Error',
            description: 'Connection lost during deployment. Please try again.',
            variant: 'destructive',
          });
        }
      };

      readStream();

    } catch (error) {
      console.error('Deployment failed:', error);
      setIsDeploying(false);
      setDeploymentStatus({
        deployment_id: 'error',
        stage: 'error',
        progress: 100,
        message: `❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      addLogMessage(`❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [config, addLogMessage, toast]);

  return {
    isDeploying,
    deploymentStatus,
    logs,
    startDeployment,
    resetDeployment,
  };
}
