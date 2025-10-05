'use client';

import { useState, useEffect } from 'react';
import { Plus, Bug, Clock, CheckCircle, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuditTable } from './audit-table';
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
import { useTeamStore, useBugsStore } from '@/lib/store';
import { mockUsers } from '@/lib/mock-data';
import { AgentRun, BugFinding } from '@/types/bug'; // Ensure BugFinding is exported from your types
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// This is a simplified display component for the "Running" state.
function RunningAuditCard({ run }: { run: AgentRun }) {
  const getUserName = (userId: string) => mockUsers.find(u => u.id === userId)?.name || userId;
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-blue-600 animate-spin" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{run.targetUrl}</h3>
            {run.createdBy && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-muted-foreground">Created by:</span>
                <Badge variant="outline" className="text-xs">{getUserName(run.createdBy)}</Badge>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">Running</Badge>
        </div>
      </CardHeader>
    </Card>
  );
}


export function MainContent() {
  const { selectedTeamId, teams } = useTeamStore();
  const { user } = useAuth0();
  const { bugReports, fetchBugReports, bugsLoading } = useBugsStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [testCases, setTestCases] = useState<Array<{ id: string; test: string; expectedOutput: string }>>([]);
  const [runningAudits, setRunningAudits] = useState<AgentRun[]>([]);
  
  const [tableData, setTableData] = useState<AgentRun[]>([]);

  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  
  useEffect(() => {
    if (selectedTeamId) {
      fetchBugReports({ team_id: selectedTeamId });
    } else {
      setTableData([]);
    }
  }, [selectedTeamId, fetchBugReports]);

  // --- FIX: Correctly transform the API data to match the full AgentRun and BugFinding types ---
  useEffect(() => {
    const notApprovedAudits = bugReports.filter(report => !report.is_approved);
    
    const transformedData: AgentRun[] = notApprovedAudits.map((report: any) => {
      // Create a single BugFinding object that matches the type definition
      const bugFinding: BugFinding = {
        // --- Properties that were missing ---
        id: report._id || report.id, // The bug finding's ID is the report's ID in this case
        status: 'pending',           // Since it's not approved, 'pending' is a sensible default
        isEditing: false,            // This is a UI state, so it should default to false

        // --- Properties that were mismatched or needed defaults ---
        reproduction_steps: report.reproduction_steps || [], // Correct property name
        
        // --- Properties that were already correct ---
        title: report.title,
        description: report.description,
        roast: report.roast || '', // Provide a fallback for optional fields
      };

      // Now create the AgentRun object with the correctly typed BugFinding
      return {
        id: report._id || report.id,
        teamId: report.team_id,
        targetUrl: report.title, 
        status: 'completed', 
        createdBy: 'BugZooka Agent', 
        createdAt: report.createdAt ? new Date(report.createdAt) : new Date(), 
        bugFindings: [bugFinding], // Embed the fully-typed bug finding here
        settings: { 
            includeSubdomains: false 
        },
      };
    });

    setTableData(transformedData);
  }, [bugReports]);


  const addTestCase = () => setTestCases([...testCases, { id: `test-${Date.now()}`, test: '', expectedOutput: '' }]);
  const removeTestCase = (id: string) => setTestCases(testCases.filter(tc => tc.id !== id));
  const updateTestCase = (id: string, field: 'test' | 'expectedOutput', value: string) => {
    setTestCases(testCases.map(tc => (tc.id === id ? { ...tc, [field]: value } : tc)));
  };

  const handleCreateAudit = async () => {
    if (isCreatingAudit) return;
    if (!targetUrl.trim()) {
      toast.error('Please enter a target URL');
      return;
    }
    try { new URL(targetUrl.trim()); } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setIsCreatingAudit(true);

    const payload = {
      url: targetUrl.trim(),
      team_id: selectedTeamId || '',
      content_type: 'text/plain',
      test_cases: testCases
        .filter(tc => tc.test.trim())
        .map(tc => ({
          what_to_test: tc.test,
          expected_output: tc.expectedOutput,
      })),
    };

    const optimisticRun: AgentRun = {
      id: `run-${Date.now()}`,
      teamId: selectedTeamId || '',
      targetUrl: targetUrl.trim(),
      createdBy: user?.sub || 'user-1',
      status: 'running',
      createdAt: new Date(),
      bugFindings: [],
      settings: {
        includeSubdomains: false,
      }
    };
    setRunningAudits(prev => [optimisticRun, ...prev]);
    
    setTargetUrl('');
    setTestCases([]);
    setIsCreateDialogOpen(false);

    try {
      await axios.post('http://localhost:8000/agent/', payload);
      toast.success(`Audit finished for ${payload.url}. It will appear in past audits soon.`);
      if (selectedTeamId) {
        fetchBugReports({ team_id: selectedTeamId });
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail?.[0]?.msg || error.response?.data?.error || error.message || "An unknown error occurred.";
      toast.error('Audit failed.', { description: errorMessage });
      
    } finally {
      setRunningAudits(prev => prev.filter(run => run.id !== optimisticRun.id));
      setIsCreatingAudit(false);
    }
  };

  if (!selectedTeamId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Bug className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Select a Team</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedTeam?.name}</h1>
            <p className="text-muted-foreground">{selectedTeam?.team_type || 'Team workspace'}</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Agent Audit</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Agent Audit</DialogTitle>
                <DialogDescription>Configure and start a new automated security audit.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="url">Target URL</Label>
                  <Input id="url" placeholder="https://example.com" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Specific Test Cases</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {testCases.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">No specific test cases added.</p>
                  </div>
                ) : (
                  <div className="space-y-3">{testCases.map((tc, index) => (
                    <div key={tc.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Test {index + 1}</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTestCase(tc.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor={`test-${tc.id}`} className="text-xs">Test Description</Label>
                          <Input id={`test-${tc.id}`} placeholder="e.g., Test SQL injection" value={tc.test} onChange={(e) => updateTestCase(tc.id, 'test', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor={`expected-${tc.id}`} className="text-xs">Expected Output</Label>
                          <Input id={`expected-${tc.id}`} placeholder="e.g., Should return error" value={tc.expectedOutput} onChange={(e) => updateTestCase(tc.id, 'expectedOutput', e.target.value)} className="mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}</div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreateAudit} disabled={!targetUrl.trim() || isCreatingAudit}>
                  {isCreatingAudit ? 'Starting...' : 'Start Audit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-blue-600" />
                <span>Running Audits</span>
                {runningAudits.length > 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-800">{runningAudits.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runningAudits.length > 0 ? (
                <div className="space-y-4">{runningAudits.map((run) => <RunningAuditCard key={run.id} run={run} />)}</div>
              ) : (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No running audits.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Past Audits (Not Approved)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bugsLoading ? (
                 <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading past audits...</p>
                </div>
              ) : (
                <AuditTable data={tableData} filterPlaceholder="Filter by title..." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}