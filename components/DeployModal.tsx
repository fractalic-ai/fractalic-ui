"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Rocket, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  FileText, 
  Box, 
  Play, 
  RotateCw,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAppConfig } from '@/hooks/use-app-config';
import { useToast } from '@/hooks/use-toast';
import {
  DeploymentStatus,
  DeploymentPayload,
  parseDeploymentEvent,
  createDeploymentPayload,
  getStageInfo,
  getProgressColor,
  getDeploymentApiUrl
} from '@/utils/deployUtils';

interface DeployModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentFilePath?: string;
  repoPath?: string;
}

const getStageIcon = (stage: string, isActive: boolean) => {
  const iconProps = {
    className: `h-4 w-4 ${isActive ? 'animate-pulse' : ''}`,
  };

  switch (stage) {
    case 'validating':
      return <CheckCircle {...iconProps} />;
    case 'pulling_image':
      return <Download {...iconProps} />;
    case 'preparing_files':
      return <FileText {...iconProps} />;
    case 'creating_container':
      return <Box {...iconProps} />;
    case 'starting_container':
      return <Play {...iconProps} />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock {...iconProps} />;
  }
};

export default function DeployModal({ isOpen, setIsOpen, currentFilePath, repoPath }: DeployModalProps) {
  const { config } = useAppConfig();
  const { toast } = useToast();
  
  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [deploymentPayload, setDeploymentPayload] = useState<DeploymentPayload | null>(null);
  
  // UI state
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Scroll logs to bottom when new logs are added
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Initialize deployment payload when modal opens
  useEffect(() => {
    if (isOpen && currentFilePath) {
      const payload = createDeploymentPayload(currentFilePath, repoPath);
      setDeploymentPayload(payload);
    }
  }, [isOpen, currentFilePath, repoPath]);

  // Cleanup event source on unmount or modal close
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Reset state after a delay to allow close animation
      setTimeout(() => {
        setIsDeploying(false);
        setDeploymentStatus(null);
        setLogs([]);
        setShowLogs(false);
      }, 300);
    }
  }, [isOpen]);

  const addLogMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const handleDeploymentError = useCallback((error: Event) => {
    console.error('Deployment SSE error:', error);
    setIsDeploying(false);
    setDeploymentStatus(prev => ({
      deployment_id: prev?.deployment_id || 'unknown',
      stage: 'error',
      progress: 100,
      message: '❌ Connection lost during deployment',
      timestamp: new Date().toISOString(),
      error: 'Connection error'
    }));
    addLogMessage('❌ Connection lost during deployment');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    toast({
      title: 'Deployment Error',
      description: 'Connection lost during deployment. Please try again.',
      variant: 'destructive',
    });
  }, [addLogMessage, toast]);

  const startDeployment = useCallback(async () => {
    if (!deploymentPayload || !config) {
      toast({
        title: 'Deployment Error',
        description: 'Missing deployment configuration or app config',
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

      // Create event source for streaming deployment updates
      const deploymentApiUrl = getDeploymentApiUrl(config);
      
      // Use fetch to POST the deployment payload, then stream the response
      const response = await fetch(`${deploymentApiUrl}/api/deploy/docker-registry/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(deploymentPayload),
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
          handleDeploymentError(new Event('error'));
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
  }, [deploymentPayload, config, addLogMessage, toast, handleDeploymentError]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to Clipboard',
        description: 'URL copied successfully',
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleClose = () => {
    if (isDeploying) {
      // Ask for confirmation if deployment is in progress
      const confirmClose = window.confirm(
        'Deployment is in progress. Are you sure you want to close this dialog? The deployment will continue in the background.'
      );
      if (!confirmClose) {
        return;
      }
    }
    setIsOpen(false);
  };

  if (!deploymentPayload) {
    return null;
  }

  const stageInfo = deploymentStatus ? getStageInfo(deploymentStatus.stage) : null;
  const progress = deploymentStatus?.progress || 0;
  const progressColor = deploymentStatus ? getProgressColor(deploymentStatus.stage, progress) : 'bg-blue-500';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-[#1a1a1a] border-gray-800 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b border-gray-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Rocket className="h-5 w-5 text-green-400" />
            Deploy to Docker Container
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Deploy your script to a Docker container using the Fractalic platform
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          <div className="space-y-6">
          {/* Script Information */}
          <Card className="border-gray-700 bg-[#252525]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300">Deployment Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-400 flex-shrink-0 min-w-0">Script Name:</span>
                <span className="text-white font-mono text-right break-all min-w-0">{deploymentPayload.script_name}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-400 flex-shrink-0 min-w-0">Script Directory:</span>
                <span className="text-white font-mono text-right break-all min-w-0">{deploymentPayload.script_folder}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-400 flex-shrink-0 min-w-0">Container Image:</span>
                <span className="text-white font-mono text-right break-all min-w-0">{deploymentPayload.image_name}:{deploymentPayload.image_tag}</span>
              </div>
            </CardContent>
          </Card>

          {/* Progress Section */}
          {(isDeploying || deploymentStatus) && (
            <Card className="border-gray-700 bg-[#252525]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                  {isDeploying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : deploymentStatus?.stage === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : deploymentStatus?.stage === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  Deployment Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {stageInfo ? stageInfo.label : 'Processing...'}
                    </span>
                    <span className="text-gray-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ease-out ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Current Stage Info */}
                {stageInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    {getStageIcon(deploymentStatus!.stage, isDeploying)}
                    <span className={stageInfo.color}>{stageInfo.description}</span>
                  </div>
                )}

                {/* Deployment ID */}
                {deploymentStatus?.deployment_id && (
                  <div className="text-xs text-gray-400">
                    Deployment ID: <span className="font-mono">{deploymentStatus.deployment_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {deploymentStatus?.result && (
            <Card className="border-gray-700 bg-[#252525]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Deployment Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deploymentStatus.result.endpoint_url && (
                  <div className="space-y-2">
                    <span className="text-sm text-gray-400">Access URL:</span>
                    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
                      <span className="text-sm font-mono text-blue-400 flex-1 break-all min-w-0">
                        {deploymentStatus.result.endpoint_url}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(deploymentStatus.result!.endpoint_url)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(deploymentStatus.result!.endpoint_url, '_blank')}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Deployment Successful
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Section */}
          {deploymentStatus?.error && (
            <Card className="border-red-800 bg-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Deployment Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-300 font-mono p-2 bg-red-950/30 rounded-md max-h-32 overflow-y-auto break-words">
                  {deploymentStatus.error}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                {showLogs ? 'Hide Logs' : 'Show Logs'} ({logs.length})
              </Button>
              
              {showLogs && (
                <Card className="border-gray-700 bg-[#1a1a1a]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-300">Deployment Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-48 p-4 bg-gray-900/50 overflow-y-auto">
                      <div className="space-y-1 text-xs font-mono">
                        {logs.map((log, index) => (
                          <div key={index} className="text-gray-300 break-words">
                            {log}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-800 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeploying}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Close
          </Button>
          
          <div className="flex gap-2">
            {deploymentStatus?.stage === 'error' && (
              <Button
                onClick={startDeployment}
                disabled={isDeploying}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            
            {!deploymentStatus && (
              <Button
                onClick={startDeployment}
                disabled={isDeploying || !deploymentPayload}
                className="bg-green-600 hover:bg-green-700"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
