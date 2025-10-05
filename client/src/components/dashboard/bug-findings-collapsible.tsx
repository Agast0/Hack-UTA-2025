'use client';

import { useState } from 'react';
import { Bug, ExternalLink, Calendar, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AgentRun, BugFinding } from '@/types/bug';
import { mockUsers } from '@/lib/mock-data';

interface BugFindingsCollapsibleProps {
  run: AgentRun;
}

export function BugFindingsCollapsible({ run }: BugFindingsCollapsibleProps) {
  const [bugFindings, setBugFindings] = useState<BugFinding[]>(run.bugFindings);

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  const getUser = (userId: string) => {
    return mockUsers.find(u => u.id === userId);
  };


  const handleConfirmBug = (bugId: string) => {
    setBugFindings(prev => 
      prev.map(bug => 
        bug.id === bugId 
          ? { 
              ...bug, 
              status: 'confirmed' as const,
              confirmedBy: 'current-user', // In real app, this would be the actual user ID
              confirmedAt: new Date(),
              rejectedBy: undefined,
              rejectedAt: undefined
            }
          : bug
      )
    );
  };

  const handleRejectBug = (bugId: string) => {
    setBugFindings(prev => 
      prev.map(bug => 
        bug.id === bugId 
          ? { 
              ...bug, 
              status: 'rejected' as const,
              rejectedBy: 'current-user', // In real app, this would be the actual user ID
              rejectedAt: new Date(),
              confirmedBy: undefined,
              confirmedAt: undefined
            }
          : bug
      )
    );
  };

  const handleResetBug = (bugId: string) => {
    setBugFindings(prev => 
      prev.map(bug => 
        bug.id === bugId 
          ? { 
              ...bug, 
              status: 'pending' as const,
              confirmedBy: undefined,
              confirmedAt: undefined,
              rejectedBy: undefined,
              rejectedAt: undefined
            }
          : bug
      )
    );
  };
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
    <div className="py-2 px-3">
      <div className="flex items-center space-x-2 mb-2">
        <Bug className="h-4 w-4" />
        <h3 className="text-base font-semibold">Bug Findings - {run.targetUrl}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Detailed analysis of security vulnerabilities found during the audit
      </p>

      <div className="space-y-6">
        {bugFindings.length === 0 ? (
          <div className="text-center py-3">
            <Bug className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">No bugs found in this audit</p>
          </div>
        ) : (
          bugFindings.map((finding, index) => (
            <Card key={finding.id} className="border-l-4 border-l-red-200">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-1">
                      {finding.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">
                      {finding.description}
                    </p>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-muted-foreground">Audit created by:</span>
                      {run.createdBy ? (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={getUser(run.createdBy)?.avatar} alt={getUserName(run.createdBy)} />
                            <AvatarFallback className="text-xs">
                              {getUserName(run.createdBy).split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <Badge variant="secondary" className="text-xs">
                            {getUserName(run.createdBy)}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Unknown
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={getSeverityColor(finding.severity)}
                    className="ml-3 flex items-center space-x-1 text-sm"
                  >
                    {getSeverityIcon(finding.severity)}
                    <span className="capitalize">{finding.severity}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div>
                  <h4 className="font-medium mb-1 text-sm">Steps to Reproduce:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {finding.stepsToReproduce.map((step, stepIndex) => (
                      <li key={stepIndex}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1 dark:text-yellow-300 text-sm">
                        Roast Message
                      </h4>
                      <p className="text-yellow-700 text-sm dark:text-yellow-200">
                        {finding.roastMessage}
                      </p>
                    </div>
                  </div>
                </div>

                {finding.screenshotUrls.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Screenshots:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {finding.screenshotUrls.map((url, urlIndex) => (
                        <div key={urlIndex} className="relative">
                          <img
                            src={url}
                            alt={`Screenshot ${urlIndex + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Always Available */}
                <div className="flex items-center space-x-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant={finding.status === 'confirmed' ? 'default' : 'outline'}
                    onClick={() => handleConfirmBug(finding.id)}
                    className={`flex items-center space-x-1 ${
                      finding.status === 'confirmed' 
                        ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirm</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={finding.status === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => handleRejectBug(finding.id)}
                    className={`flex items-center space-x-1 ${
                      finding.status === 'rejected' 
                        ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 hover:border-red-600'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </Button>
                  {finding.status !== 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetBug(finding.id)}
                      className="flex items-center space-x-1 text-muted-foreground"
                    >
                      <span>Reset</span>
                    </Button>
                  )}
                </div>


                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Found on {new Date(finding.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {index < bugFindings.length - 1 && (
                  <Separator className="my-2" />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
