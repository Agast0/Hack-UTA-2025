'use client';

import { useState } from 'react';
import { Plus, Bug, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
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
import { Switch } from '@/components/ui/switch';
import { useTeamStore } from '@/lib/store';
import { mockAgentRuns } from '@/lib/mock-data';
import { AgentRun } from '@/types/bug';
import { columns } from './audit-columns';
import { BugFindingsDropdown } from './bug-findings-dropdown';

export function MainContent() {
  const { selectedTeamId, teams } = useTeamStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [includeSubdomains, setIncludeSubdomains] = useState(false);

  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const teamRuns = selectedTeamId
    ? mockAgentRuns.filter((run) => run.teamId === selectedTeamId)
    : [];

  const handleCreateAudit = () => {
    if (targetUrl.trim()) {
      // In a real app, this would make an API call
      console.log('Creating audit for:', targetUrl);
      setTargetUrl('');
      setIsCreateDialogOpen(false);
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

  const auditColumns = [
    ...columns,
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(row.original.status)}
          {getStatusBadge(row.original.status)}
        </div>
      ),
    },
  ];

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
                {selectedTeam?.description || 'Team workspace'}
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
                  <div className="grid gap-2">
                    <Label htmlFor="depth">Max Depth</Label>
                    <Input
                      id="depth"
                      type="number"
                      min="1"
                      max="10"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="subdomains"
                      checked={includeSubdomains}
                      onCheckedChange={setIncludeSubdomains}
                    />
                    <Label htmlFor="subdomains">Include Subdomains</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={handleCreateAudit}
                    disabled={!targetUrl.trim()}
                  >
                    Start Audit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Bug Findings Access */}
          {teamRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Bug Findings Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamRuns.slice(0, 3).map((run) => (
                    <div key={run.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{run.targetUrl}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {run.bugFindings.length} bugs
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </p>
                      <BugFindingsDropdown 
                        run={run}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full">
                            View Bug Findings
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Past Audits</CardTitle>
            </CardHeader>
            <CardContent>
              {teamRuns.length > 0 ? (
                <DataTable
                  columns={auditColumns}
                  data={teamRuns}
                  filterColumnId="targetUrl"
                  filterPlaceholder="Filter URLs..."
                />
              ) : (
                <div className="text-center py-8">
                  <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audits yet. Create your first audit to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
