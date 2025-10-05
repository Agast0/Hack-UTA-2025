// page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Team, User, BugReport } from '@/types/bug';
import { ApiError, bugApi, teamApi, userApi } from '@/lib/api';
import axios from 'axios'; // <-- Import axios directly

export default function IntegrationTestPage() {
  // State for the original API integration tests
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState({
    teams: false,
    users: false,
    bugReports: false,
  });

  // --- STATE FOR THE AGENT AUDIT ---
  // We will manage the state for this specific action right here.
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  /**
   * This function makes the POST request directly to your backend.
   * It does not use the Zustand store.
   */
  const handleStartAudit = async () => {
    setAuditLoading(true); // 1. Set loading to true
    setAuditError(null);
    setAuditResult(null);

    // 2. Define the data to be sent
    const payload = {
      url: 'https://hackuta.org',
      teamId: '68e1e75f6cd386baee987650',
      contentType: 'text/plain',
      testCases: [
        {
          what_to_test: 'login using incorrect credentials: email: user123@gmail.com, password: jgfhdbsaokpl',
          expected_output: 'User should see an error message',
        },
      ],
    };

    try {
      // 3. Make the POST request using axios and wait for the response
      const response = await axios.post('http://localhost:8000/agent/', payload);

      // 4. If successful, store the result to display it
      console.log("Agent Response:", response.data);
      setAuditResult(response.data);

    } catch (err: any) {
      // 5. If it fails, store the error message
      console.error("Audit initiation failed:", err);
      const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred.";
      setAuditError(errorMessage);
    } finally {
      // 6. Set loading back to false
      setAuditLoading(false);
    }
  };

  // This function remains unchanged
  const runIntegrationTest = async () => {
    setLoading(true);
    setError(null);
    const results = { teams: false, users: false, bugReports: false };
    try {
      const teamsData = await teamApi.getTeams();
      setTeams(teamsData);
      results.teams = true;
      const usersData = await userApi.getUsers();
      setUsers(usersData);
      results.users = true;
      const bugReportsData = await bugApi.getBugReports();
      setBugReports(bugReportsData);
      results.bugReports = true;
      setTestResults(results);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runIntegrationTest();
  }, []);

  const allTestsPassed = testResults.teams && testResults.users && testResults.bugReports;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Frontend-Backend Integration Status
              <Badge variant={allTestsPassed ? 'default' : 'destructive'}>
                {allTestsPassed ? '✅ All Systems Operational' : '❌ Tests Failed'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button onClick={runIntegrationTest} disabled={loading}>
                  {loading ? 'Running Tests...' : 'Re-run Integration Tests'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleStartAudit}
                  disabled={auditLoading}
                >
                  {auditLoading ? 'Starting Audit...' : 'Start Agent Audit'}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-medium">An Error Occurred:</p>
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {/* --- New Section to Display Audit Status --- */}
              {auditLoading && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-md">
                  <p className="font-medium text-center">Agent is running, please wait...</p>
                </div>
              )}
              {auditError && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-medium">Agent Audit Failed:</p>
                  <p className="text-destructive text-sm">{auditError}</p>
                </div>
              )}
              {auditResult && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Agent Audit Result:</h3>
                  <pre className="text-sm bg-background p-2 rounded whitespace-pre-wrap">
                    {JSON.stringify(auditResult, null, 2)}
                  </pre>
                </div>
              )}
              {/* --- End of New Section --- */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ... The rest of your API health check cards ... */}
                <Card className={testResults.teams ? 'border-green-500' : 'border-red-500'}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Teams API {testResults.teams ? '✅' : '❌'}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Found {teams.length} teams</p></CardContent></Card>
                <Card className={testResults.users ? 'border-green-500' : 'border-red-500'}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Users API {testResults.users ? '✅' : '❌'}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Found {users.length} users</p></CardContent></Card>
                <Card className={testResults.bugReports ? 'border-green-500' : 'border-red-500'}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Bug Reports API {testResults.bugReports ? '✅' : '❌'}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Found {bugReports.length} reports</p></CardContent></Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}