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
  Loader2,
  Globe,
  Terminal
} from 'lucide-react';
import { useAppConfig } from '@/hooks/use-app-config';
import { useToast } from '@/hooks/use-toast';
import DeploymentResults from './DeploymentResults';
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
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard`,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
      <DialogContent className="max-w-[1200px] max-h-[90vh] bg-[#1a1a1a] border-gray-600 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b border-gray-600 pb-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Rocket className="h-5 w-5 text-blue-400" />
            Deploy to Docker Container
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Deploy your script to a Docker container using the Fractalic platform
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0 p-4">
          {/* Left Panel - Configuration and Results */}
          <div className="w-96 flex flex-col space-y-4 overflow-y-auto">
            
            {/* Deploy Button and Configuration Block */}
            <Card className="border-gray-600 bg-[#252525]">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Deploy Button */}
                  <div className="flex justify-center pb-4 border-b border-gray-600">
                    {deploymentStatus?.stage === 'error' ? (
                      <Button
                        onClick={startDeployment}
                        disabled={isDeploying}
                        size="lg"
                        className="bg-orange-600 hover:bg-orange-700 text-white px-8"
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Retry Deployment
                      </Button>
                    ) : !deploymentStatus ? (
                      <Button
                        onClick={startDeployment}
                        disabled={isDeploying || !deploymentPayload}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                      >
                        {isDeploying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Deploy Script
                          </>
                        )}
                      </Button>
                    ) : deploymentStatus?.stage === 'completed' ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Deployment Successful</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Configuration Info */}
                  <div className="space-y-3 text-sm">
                    <h3 className="text-gray-300 font-medium">Configuration</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Script:</span>
                        <div className="text-white font-mono text-xs px-2 py-1 mt-1">
                          {deploymentPayload.script_name}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Directory:</span>
                        <div className="text-white font-mono text-xs px-2 py-1 mt-1 break-all">
                          {deploymentPayload.script_folder}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Image:</span>
                        <div className="text-white font-mono text-xs px-2 py-1 mt-1">
                          {deploymentPayload.image_name}:{deploymentPayload.image_tag}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  {(isDeploying || deploymentStatus) && (
                    <div className="space-y-3 pt-4 border-t border-gray-600">
                      <h3 className="text-gray-300 font-medium">Progress</h3>
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
                        {stageInfo && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {getStageIcon(deploymentStatus!.stage, isDeploying)}
                            <span>{stageInfo.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deployment ID */}
                  {deploymentStatus?.deployment_id && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-600">
                      ID: <span className="font-mono">{deploymentStatus.deployment_id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* API Endpoints and Documentation */}
            {deploymentStatus?.result && (
              <Card className="border-gray-600 bg-[#252525]">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-gray-300 font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      API Endpoints
                    </h3>
                    
                    {/* Main Endpoint */}
                    <div className="space-y-2">
                      <span className="text-gray-400 text-sm">Main URL:</span>
                      <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-md">
                        <span className="text-blue-400 font-mono text-sm flex-1 break-all">
                          {deploymentStatus.result.endpoint_url}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(deploymentStatus.result!.endpoint_url, "URL")}
                          className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(deploymentStatus.result!.endpoint_url, '_blank')}
                          className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Additional endpoints from metadata */}
                    {deploymentStatus.result.metadata?.api?.endpoint && (
                      <div className="space-y-2">
                        <span className="text-gray-400 text-sm">API Endpoint:</span>
                        <div className="text-white font-mono text-sm bg-gray-700 px-3 py-2 rounded-md">
                          {deploymentStatus.result.metadata.api.endpoint}
                        </div>
                      </div>
                    )}

                    {/* Swagger Documentation */}
                    {deploymentStatus.result.metadata?.ai_server?.docs_url && (
                      <div className="space-y-2">
                        <span className="text-gray-400 text-sm">API Documentation (Swagger):</span>
                        <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-md">
                          <span className="text-yellow-400 font-mono text-sm flex-1 break-all">
                            {deploymentStatus.result.metadata.ai_server.docs_url}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(deploymentStatus.result.metadata!.ai_server.docs_url, '_blank')}
                            className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* cURL Command */}
                    {deploymentStatus.result.metadata?.api?.sample_curl && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">Sample cURL command:</span>
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-600">
                            For Bash
                          </Badge>
                        </div>
                        <div className="relative">
                          <pre className="text-xs bg-gray-800 p-3 rounded-md overflow-x-auto text-gray-300 border border-gray-600">
                            {deploymentStatus.result.metadata.api.sample_curl}
                          </pre>
                          <Button
                            onClick={() => copyToClipboard(deploymentStatus.result.metadata!.api.sample_curl, "cURL command")}
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-300"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Example Payload */}
                    {deploymentStatus.result.metadata?.api?.example_payload && (
                      <div className="space-y-2">
                        <span className="text-gray-400 text-sm">Example Payload:</span>
                        <div className="relative">
                          <pre className="text-xs bg-gray-800 p-3 rounded-md overflow-x-auto text-gray-300 border border-gray-600">
                            {JSON.stringify(deploymentStatus.result.metadata.api.example_payload, null, 2)}
                          </pre>
                          <Button
                            onClick={() => copyToClipboard(JSON.stringify(deploymentStatus.result.metadata!.api.example_payload, null, 2), "Payload")}
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-300"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Section */}
            {deploymentStatus?.error && (
              <Card className="border-red-600 bg-red-950/20">
                <CardContent className="p-6">
                  <h3 className="text-red-400 font-medium flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    Deployment Error
                  </h3>
                  <div className="text-sm text-red-300 font-mono p-3 bg-red-950/30 rounded-md max-h-32 overflow-y-auto break-words border border-red-800">
                    {deploymentStatus.error}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Installation Logs */}
          <div className="flex-1 flex flex-col min-w-0">
            <Card className="border-gray-600 bg-[#1e1e1e] flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 border-b border-gray-600 flex-shrink-0">
                <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Installation Logs
                  {logs.length > 0 && (
                    <Badge variant="outline" className="text-xs text-gray-500 border-gray-600">
                      {logs.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 p-4 bg-gray-900/30 overflow-y-auto min-h-0">
                  <div className="space-y-1 text-xs font-mono">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        No logs yet...
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="text-gray-300 break-words">
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-600 flex-shrink-0 px-4 pb-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeploying}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
