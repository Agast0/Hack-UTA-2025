'use client';

import { useState } from 'react';
import { Plus, Bug, Clock, CheckCircle, AlertCircle, X, Play, Pause, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuditTable } from './audit-table';
import { BugFindingsCollapsible } from './bug-findings-collapsible';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useTeamStore, useRunsStore } from '@/lib/store';
import { mockAgentRuns, mockUsers } from '@/lib/mock-data';
import { AgentRun } from '@/types/bug';
import { columns } from './audit-columns';
import { BugFindingsModal } from './bug-findings-modal';
import { useAuth0 } from '@auth0/auth0-react';

// Running Audit Card Component
function RunningAuditCard({ run, testCases }: { run: AgentRun; testCases?: Array<{ id: string; test: string; expectedOutput: string }> }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  // Use provided test cases or generate default ones
  const auditTestCases = testCases && testCases.length > 0 ? testCases.map((tc, index) => ({
    id: tc.id,
    name: tc.test || `Test Case ${index + 1}`,
    expectedOutput: tc.expectedOutput || '',
    status: index === 0 ? 'running' : 'queued',
    progress: index === 0 ? 45 : 0,
  })) : [
    { id: 'test-1', name: 'SQL Injection Test', expectedOutput: 'Should detect SQL injection vulnerabilities', status: 'running', progress: 45 },
    { id: 'test-2', name: 'XSS Vulnerability Scan', expectedOutput: 'Should identify XSS attack vectors', status: 'queued', progress: 0 },
    { id: 'test-3', name: 'Authentication Bypass', expectedOutput: 'Should test authentication mechanisms', status: 'queued', progress: 0 },
    { id: 'test-4', name: 'CSRF Protection Check', expectedOutput: 'Should verify CSRF protection', status: 'queued', progress: 0 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-gray-500 animate-spin" />;
      case 'queued':
        return <Pause className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'queued':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="space-y-3">
          {/* Large URL Display - Clickable to expand/collapse */}
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
            onClick={toggleExpanded}
          >
            <Clock className="h-6 w-6 text-blue-600 animate-spin" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">{run.targetUrl}</h3>
              {run.createdBy && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-muted-foreground">Created by:</span>
                  <Badge variant="outline" className="text-xs">
                    {getUserName(run.createdBy)}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                Running
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expandable Test Cases */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">Test Cases Progress</h4>
              <Badge variant="outline" className="text-sm">
                {auditTestCases.filter(t => t.status === 'running').length} running, {auditTestCases.filter(t => t.status === 'queued').length} queued
              </Badge>
            </div>
            
            <div className="space-y-3">
              {auditTestCases.map((testCase) => (
                <div key={testCase.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(testCase.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-base font-medium text-foreground">{testCase.name}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-sm ${getStatusColor(testCase.status)}`}
                      >
                        {testCase.status === 'running' ? 'Currently Running' : 'Queued'}
                      </Badge>
                    </div>
                    
                    {testCase.expectedOutput && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Expected:</strong> {testCase.expectedOutput}
                      </p>
                    )}
                    
                    {testCase.status === 'running' && (
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${testCase.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {testCase.progress}% complete
                        </p>
                      </div>
                    )}
                    
                    {testCase.status === 'queued' && (
                      <p className="text-sm text-muted-foreground">
                        Waiting to start...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function MainContent() {
  const { selectedTeamId, teams } = useTeamStore();
  const { runs, addRun } = useRunsStore();
  const { user } = useAuth0();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [testCases, setTestCases] = useState<Array<{ id: string; test: string; expectedOutput: string }>>([]);
  const [createdAudits, setCreatedAudits] = useState<AgentRun[]>([]);

  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const teamRuns = selectedTeamId
    ? runs.filter((run) => run.teamId === selectedTeamId)
    : [];

  // Combine mock data with created audits
  const allAudits = [...teamRuns, ...createdAudits];
  const runningAudits = allAudits.filter((run) => run.status === 'running');
  const completedAudits = allAudits.filter((run) => run.status === 'completed' || run.status === 'failed');
  

  const addTestCase = () => {
    const newTestCase = {
      id: `test-${Date.now()}`,
      test: '',
      expectedOutput: '',
    };
    setTestCases([...testCases, newTestCase]);
  };

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(testCase => testCase.id !== id));
  };

  const updateTestCase = (id: string, field: 'test' | 'expectedOutput', value: string) => {
    setTestCases(testCases.map(testCase => 
      testCase.id === id ? { ...testCase, [field]: value } : testCase
    ));
  };

  const handleCreateAudit = async () => {
    if (isCreatingAudit) return; // Prevent multiple submissions
    
    if (!targetUrl.trim()) {
      toast.error('Please enter a target URL');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(targetUrl.trim());
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    
    setIsCreatingAudit(true);
    
    try {
      // Create a new audit run
      const newRun: AgentRun = {
        id: `run-${Date.now()}`,
        teamId: selectedTeamId || '',
        targetUrl: targetUrl.trim(),
        createdBy: user?.sub || 'user-1', // Use Auth0 user ID
        createdByName: user?.name,
        createdByEmail: (user as any)?.email,
        status: 'running',
        createdAt: new Date(),
        completedAt: undefined,
        bugFindings: [],
        settings: {
          includeSubdomains: false,
          customHeaders: {},
        },
      };

      // Store test cases with the audit (we'll add this to the audit object)
      const auditWithTestCases = {
        ...newRun,
        testCases: testCases.length > 0 ? testCases : []
      };

      // Add the new audit to the created audits state
      setCreatedAudits(prev => [...prev, auditWithTestCases]);

      // In a real app, this would make an API call to create the audit
      console.log('Creating audit for:', targetUrl);
      console.log('Test cases:', testCases);
      console.log('New run created:', newRun);
      
      // In a real app, this would start the actual audit process
      console.log('Audit started for:', targetUrl);
      console.log('Audit will continue running until manually stopped');
    
      // Reset form
      setTargetUrl('');
      setTestCases([]);
      setIsCreateDialogOpen(false);
      
      // Show success message
      const testCasesText = testCases.length > 0 ? ` with ${testCases.length} specific test case${testCases.length > 1 ? 's' : ''}` : '';
      toast.success(`Audit started for ${targetUrl}!`, {
        description: `Check the Past Audits section to see progress.${testCasesText}`,
        duration: 4000,
      });
    } catch (error) {
      toast.error('Failed to start audit. Please try again.');
      console.error('Error creating audit:', error);
    } finally {
      setIsCreatingAudit(false);
    }
  };

  const getStatusIcon = (status: AgentRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: AgentRun['status']) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      failed: 'destructive',
      pending: 'outline',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  // Removed auditColumns as we're now using AuditTable component

  if (!selectedTeamId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Bug className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Select a Team
          </h3>
          <p className="text-muted-foreground">
            Choose a team from the sidebar to start hunting bugs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedTeam?.name}
              </h1>
              <p className="text-muted-foreground">
                {selectedTeam?.team_type || 'Team workspace'}
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Agent Audit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Agent Audit</DialogTitle>
                  <DialogDescription>
                    Configure and start a new automated security audit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="url">Target URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                    />
                  </div>
                </div>

                {/* Specific Test Cases Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Specific Test Cases</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTestCase}
                      className="flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Test Case</span>
                    </Button>
                  </div>
                  
                  {testCases.length === 0 ? (
                    <div className="text-center py-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        No specific test cases added. Click "Add Test Case" to add custom tests.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testCases.map((testCase, index) => (
                        <div key={testCase.id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              Specific Test {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTestCase(testCase.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor={`test-${testCase.id}`} className="text-xs">
                                Test Description
                              </Label>
                              <Input
                                id={`test-${testCase.id}`}
                                placeholder="e.g., Test SQL injection on login form"
                                value={testCase.test}
                                onChange={(e) => updateTestCase(testCase.id, 'test', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`expected-${testCase.id}`} className="text-xs">
                                Expected Output
                              </Label>
                              <Input
                                id={`expected-${testCase.id}`}
                                placeholder="e.g., Should return error message, not execute query"
                                value={testCase.expectedOutput}
                                onChange={(e) => updateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleCreateAudit}
                    disabled={!targetUrl.trim() || isCreatingAudit}
                  >
                    {isCreatingAudit ? 'Starting Audit...' : 'Start Audit'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          {/* Running Audits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-blue-600" />
                <span>Running Audits</span>
                {runningAudits.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {runningAudits.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runningAudits.length > 0 ? (
                <div className="space-y-4">
                  {runningAudits.map((run) => (
                    <RunningAuditCard key={run.id} run={run} testCases={(run as any).testCases} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No running audits. Start a new audit to see it here!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Audits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Past Audits</span>
                {completedAudits.length > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {completedAudits.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedAudits.length > 0 ? (
                <AuditTable
                  data={completedAudits}
                  filterColumnId="targetUrl"
                  filterPlaceholder="Filter URLs..."
                />
              ) : (
                <div className="text-center py-8">
                  <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed audits yet. Create your first audit to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
