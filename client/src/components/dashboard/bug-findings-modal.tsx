'use client';

import { useState } from 'react';
import { Bug, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AgentRun, BugFinding } from '@/types/bug';
import { SlamOnView } from '@/components/ui/slam-on-view';

interface BugFindingsModalProps {
  run: AgentRun;
}

export function BugFindingsModal({ run }: BugFindingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSeverityColor = (severity: BugFinding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: BugFinding['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] 2xl:max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Bug Findings - {run.targetUrl}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of security vulnerabilities found during the audit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {run.bugFindings.length === 0 ? (
            <div className="text-center py-8">
              <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bugs found in this audit</p>
            </div>
          ) : (
            run.bugFindings.map((finding, index) => (
              <Card key={finding.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {finding.title}
                      </CardTitle>
                      <p className="text-gray-600 mb-4">
                        {finding.description}
                      </p>
                    </div>
                    <Badge
                      variant={getSeverityColor(finding.severity)}
                      className="ml-4 flex items-center space-x-1"
                    >
                      {getSeverityIcon(finding.severity)}
                      <span className="capitalize">{finding.severity}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Steps to Reproduce:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      {finding.stepsToReproduce.map((step, stepIndex) => (
                        <li key={stepIndex}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <SlamOnView>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-1 dark:text-yellow-300">
                            Roast Message
                          </h4>
                          <p className="text-yellow-700 text-sm dark:text-yellow-200">
                            {finding.roastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SlamOnView>

                  {finding.screenshotUrls.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Screenshots:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {finding.screenshotUrls.map((url, urlIndex) => (
                          <div key={urlIndex} className="relative">
                            <img
                              src={url}
                              alt={`Screenshot ${urlIndex + 1}`}
                              className="w-full h-40 lg:h-48 object-cover rounded-lg border"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2"
                              onClick={() => window.open(url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Found on {new Date(finding.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {index < run.bugFindings.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
