'use client';

import { Bug, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentRun } from '@/types/bug';
import { BugFindingsDropdown } from './bug-findings-dropdown';

interface BugFindingsExamplesProps {
  run: AgentRun;
}

export function BugFindingsExamples({ run }: BugFindingsExamplesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bug Findings Dropdown Examples</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Example 1: Custom Button */}
          <div className="space-y-2">
            <h4 className="font-medium">Custom Button Trigger</h4>
            <BugFindingsDropdown 
              run={run}
              trigger={
                <Button variant="default" className="w-full">
                  <Bug className="h-4 w-4 mr-2" />
                  View All Bugs
                </Button>
              }
            />
          </div>

          {/* Example 2: Badge Trigger */}
          <div className="space-y-2">
            <h4 className="font-medium">Badge Trigger</h4>
            <BugFindingsDropdown 
              run={run}
              trigger={
                <Badge 
                  variant="destructive" 
                  className="cursor-pointer hover:bg-destructive/90"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {run.bugFindings.length} Critical Issues
                </Badge>
              }
            />
          </div>

          {/* Example 3: Icon Button */}
          <div className="space-y-2">
            <h4 className="font-medium">Icon Button Trigger</h4>
            <BugFindingsDropdown 
              run={run}
              trigger={
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              }
            />
          </div>

          {/* Example 4: Text Link */}
          <div className="space-y-2">
            <h4 className="font-medium">Text Link Trigger</h4>
            <BugFindingsDropdown 
              run={run}
              trigger={
                <button className="text-blue-600 hover:text-blue-800 underline text-sm">
                  Click to view findings
                </button>
              }
            />
          </div>
        </div>

        {/* Example 5: Card with integrated dropdown */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Integrated Card Example</h4>
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium">{run.targetUrl}</h5>
                <p className="text-sm text-muted-foreground">
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {run.bugFindings.length} findings
                </Badge>
                <BugFindingsDropdown 
                  run={run}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
