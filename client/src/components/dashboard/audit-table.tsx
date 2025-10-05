'use client';

import { useState } from 'react';
import { AgentRun } from '@/types/bug';
import { BugFindingsCollapsible } from './bug-findings-collapsible';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { mockUsers } from '@/lib/mock-data';

interface AuditTableProps {
  data: AgentRun[];
  filterColumnId?: string;
  filterPlaceholder?: string;
}

export function AuditTable({ 
  data, 
  filterColumnId = 'targetUrl', 
  filterPlaceholder = 'Filter URLs...' 
}: AuditTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  const filteredData = data.filter((run) => {
    if (!searchTerm) return true;
    return run.targetUrl.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleRow = (runId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status: AgentRun['status']) => {
    switch (status) {
      case 'completed':
        return <div className="h-2 w-2 bg-green-500 rounded-full" />;
      case 'running':
        return <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />;
      case 'failed':
        return <div className="h-2 w-2 bg-red-500 rounded-full" />;
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
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

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={filterPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Audit Rows */}
      <div className="space-y-1">
        {filteredData.map((run) => {
          const isExpanded = expandedRows.has(run.id);
          
          return (
            <Card key={run.id} className="overflow-hidden">
              {/* Main Row - Clickable */}
              <div 
                className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleRow(run.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {/* URL */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-base">{run.targetUrl}</h3>
                      <p className="text-sm text-muted-foreground">
                      </p>
                      {run.createdBy && (
                        <p className="text-xs text-muted-foreground">
                          Created by: {getUserName(run.createdBy)}
                        </p>
                      )}
                    </div>

                    {/* Bug Count */}
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-sm">
                        {run.bugFindings.length} bugs
                      </Badge>
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(run.status)}
                      {getStatusBadge(run.status)}
                    </div>

                    {/* Expand Icon */}
                    <div className="flex items-center space-x-1 text-sm">
                      <span>Details</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-muted/30">
                  <BugFindingsCollapsible run={run} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'No audits match your search.' : 'No audits found.'}
          </p>
        </div>
      )}
    </div>
  );
}
