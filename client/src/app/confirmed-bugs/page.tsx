'use client';

import { useState, useEffect } from 'react';
import { Bug, ExternalLink, CheckCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Header } from '@/components/layout/header';
import { mockAgentRuns, mockUsers } from '@/lib/mock-data';
import { BugFinding } from '@/types/bug';
import { useRouter } from 'next/navigation';

export default function ConfirmedBugsPage() {
  const router = useRouter();
  const [bugFindings, setBugFindings] = useState<BugFinding[]>([]);

  // Get all confirmed bugs from all runs
  const confirmedBugs = mockAgentRuns
    .flatMap(run => run.bugFindings)
    .filter(bug => bug.status === 'confirmed');

  // Initialize bugFindings with confirmed bugs
  useEffect(() => {
    setBugFindings(confirmedBugs);
  }, []);

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  const getUser = (userId: string) => {
    return mockUsers.find(u => u.id === userId);
  };

  const handleSaveAsJira = (bugId: string) => {
    console.log('Save as Jira ticket:', bugId);
    // TODO: Implement Jira integration
  };

  const handleSaveAsGitHub = (bugId: string) => {
    console.log('Save as GitHub issue:', bugId);
    // TODO: Implement GitHub integration
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="w-full">
        {/* Page Header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Bug className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Confirmed Bugs</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and integrate confirmed bug reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 max-w-6xl mx-auto">
          {bugFindings.length === 0 ? (
            <div className="text-center py-12">
              <Bug className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Confirmed Bugs
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Confirmed bugs will appear here for integration with Jira or GitHub
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go to Dashboard</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {bugFindings.length} Confirmed Bug{bugFindings.length !== 1 ? 's' : ''}
                </h2>
              </div>

              <div className="grid gap-6">
                {bugFindings.map((bug, index) => (
                  <Card key={bug.id} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">
                            {bug.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">
                            {bug.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div>
                        <h4 className="font-medium mb-1 text-sm">Reproduction Steps:</h4>
                        <div className="space-y-4">
                          {bug.reproduction_steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {step.step_number}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-foreground mb-2">{step.text}</p>
                                <img 
                                  src={step.image_url} 
                                  alt={`Step ${step.step_number} screenshot`}
                                  className="w-full max-w-md h-32 object-cover rounded border"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <div className="flex items-start space-x-2">
                          <Bug className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-yellow-800 mb-1 dark:text-yellow-300 text-sm">
                              Roast Message
                            </h4>
                            <p className="text-yellow-700 text-sm dark:text-yellow-200">
                              {bug.roast}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center space-x-3">
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmed
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                                <span>Save as</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleSaveAsJira(bug.id)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Jira Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSaveAsGitHub(bug.id)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                GitHub Issue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {index < bugFindings.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}