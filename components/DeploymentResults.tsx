"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Server, 
  FileText, 
  Terminal, 
  Heart,
  Globe
} from 'lucide-react';
import { DeploymentMetadata } from '@/utils/deployUtils';
import { useToast } from '@/hooks/use-toast';

interface DeploymentResultsProps {
  endpointUrl: string;
  metadata?: DeploymentMetadata;
}

export default function DeploymentResults({ endpointUrl, metadata }: DeploymentResultsProps) {
  const { toast } = useToast();

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

  // If no metadata available, show basic results
  if (!metadata) {
    return (
      <Card className="border-gray-700 bg-[#252525]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Deployment Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <span className="text-sm text-gray-400">Access URL:</span>
            <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
              <span className="text-sm font-mono text-blue-400 flex-1 break-all min-w-0">
                {endpointUrl}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(endpointUrl, "URL")}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(endpointUrl, '_blank')}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isServiceHealthy = (status: string) => {
    return status && status.toLowerCase().includes('healthy');
  };

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="border-green-700 bg-gradient-to-r from-green-950/40 to-blue-950/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-blue-600/10"></div>
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-green-400">🎉 Deployment Successful!</h3>
              <p className="text-sm text-gray-300">Your Fractalic AI Server is ready and accessible</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Server Access */}
      <Card className="border-blue-700 bg-gradient-to-r from-blue-950/30 to-purple-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            🤖 AI Server Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 text-sm">
            {metadata.ai_server && (
              <>
                <div className="flex justify-between items-center p-2 bg-blue-950/20 rounded-md border border-blue-800/30">
                  <span className="text-blue-300 font-medium">• Main Server:</span>
                  <div className="flex items-center gap-2">
                    <a 
                      href={metadata.ai_server.host} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline font-mono font-bold"
                    >
                      {metadata.ai_server.host}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metadata.ai_server.host, "Host URL")}
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(metadata.ai_server.host, '_blank')}
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {metadata.ai_server.health_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• Health Check:</span>
                    <div className="flex items-center gap-2">
                      <a 
                        href={metadata.ai_server.health_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 underline font-mono"
                      >
                        {metadata.ai_server.health_url}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(metadata.ai_server.health_url, '_blank')}
                        className="h-5 w-5 p-0 text-green-400 hover:text-green-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {metadata.ai_server.docs_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• API Documentation:</span>
                    <div className="flex items-center gap-2">
                      <a 
                        href={metadata.ai_server.docs_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 underline font-mono"
                      >
                        {metadata.ai_server.docs_url}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(metadata.ai_server.docs_url, '_blank')}
                        className="h-5 w-5 p-0 text-yellow-400 hover:text-yellow-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {metadata.api && metadata.api.endpoint && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-gray-400">• API Endpoint:</span>
                <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded text-xs">{metadata.api.endpoint}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployed Script */}
      {metadata.deployment && (
        <Card className="border-gray-700 bg-[#252525]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              📄 Deployed Script
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              {metadata.deployment.script_path && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400 flex-shrink-0">• File:</span>
                  <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs break-all">
                    {metadata.deployment.script_path}
                  </code>
                </div>
              )}
              {metadata.deployment.container_name && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400 flex-shrink-0">• Container:</span>
                  <div className="flex flex-col items-end gap-1">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                      {metadata.deployment.container_name}
                    </code>
                    {metadata.deployment.container_id && (
                      <code className="text-gray-400 bg-gray-800 px-2 py-1 rounded text-xs">
                        ID: {metadata.deployment.container_id}
                      </code>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Usage & Sample Commands */}
      {metadata.api && (
        <Card className="border-gray-700 bg-[#252525]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              📝 API Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample curl command */}
            {metadata.api.sample_curl && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 font-medium">Sample curl command:</div>
                <div className="relative">
                  <pre className="text-xs bg-gray-900 p-3 rounded-md overflow-x-auto text-gray-300 border border-gray-700">
                    <code>{metadata.api.sample_curl}</code>
                  </pre>
                  <Button
                    onClick={() => copyToClipboard(metadata.api.sample_curl, "Sample curl command")}
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    📋 Copy curl command
                  </Button>
                </div>
              </div>
            )}
            
            {/* Example payload */}
            {metadata.api.example_payload && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 font-medium">Example payload:</div>
                <div className="relative">
                  <pre className="text-xs bg-gray-900 p-3 rounded-md overflow-x-auto text-gray-300 border border-gray-700">
                    <code>{JSON.stringify(metadata.api.example_payload, null, 2)}</code>
                  </pre>
                  <Button
                    onClick={() => copyToClipboard(JSON.stringify(metadata.api.example_payload, null, 2), "Example payload")}
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    📋 Copy payload example
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Container Management */}
      {metadata.container && (
        <Card className="border-orange-700 bg-gradient-to-r from-orange-950/30 to-red-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
              <Server className="h-4 w-4" />
              🐳 Container Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 text-sm">
              {metadata.container.logs_command && (
                <div className="flex justify-between items-center p-2 bg-orange-950/20 rounded-md border border-orange-800/30">
                  <span className="text-orange-300 font-medium">• View logs:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                      {metadata.container.logs_command}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metadata.container.logs_command, "Logs command")}
                      className="h-5 w-5 p-0 text-orange-400 hover:text-orange-300"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {metadata.container.stop_command && (
                <div className="flex justify-between items-center p-2 bg-red-950/20 rounded-md border border-red-800/30">
                  <span className="text-red-300 font-medium">• Stop container:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                      {metadata.container.stop_command}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metadata.container.stop_command, "Stop command")}
                      className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {metadata.container.remove_command && (
                <div className="flex justify-between items-center p-2 bg-red-950/20 rounded-md border border-red-800/30">
                  <span className="text-red-300 font-medium">• Remove container:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                      {metadata.container.remove_command}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(metadata.container.remove_command, "Remove command")}
                      className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
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

      {/* Services Status */}
      {metadata.services && (
        <Card className="border-green-700 bg-gradient-to-r from-green-950/30 to-teal-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-400 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              🔧 Services Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 text-sm">
              {metadata.services.ai_server && (
                <div className="flex justify-between items-center p-2 bg-green-950/20 rounded-md border border-green-800/30">
                  <span className="text-green-300 font-medium">• AI Server:</span>
                  <div className="flex items-center gap-2">
                    {isServiceHealthy(metadata.services.ai_server) ? (
                      <>
                        <span className="text-green-400 font-semibold">✅ Healthy</span>
                        <Badge variant="outline" className="text-green-400 border-green-400 text-xs bg-green-950/20">
                          Online
                        </Badge>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-semibold">❌ Unhealthy</span>
                        <Badge variant="outline" className="text-red-400 border-red-400 text-xs bg-red-950/20">
                          Offline
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              )}
              {metadata.services.mcp_manager && (
                <div className="flex justify-between items-center p-2 bg-teal-950/20 rounded-md border border-teal-800/30">
                  <span className="text-teal-300 font-medium">• MCP Manager:</span>
                  <div className="flex items-center gap-2">
                    {isServiceHealthy(metadata.services.mcp_manager) ? (
                      <>
                        <span className="text-green-400 font-semibold">✅ Healthy (internal)</span>
                        <Badge variant="outline" className="text-green-400 border-green-400 text-xs bg-green-950/20">
                          Online
                        </Badge>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-semibold">❌ Unhealthy</span>
                        <Badge variant="outline" className="text-red-400 border-red-400 text-xs bg-red-950/20">
                          Offline
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
