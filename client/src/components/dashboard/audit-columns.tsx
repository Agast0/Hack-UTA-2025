import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentRun } from '@/types/bug';
import { BugFindingsCollapsible } from './bug-findings-collapsible';

export const columns: ColumnDef<AgentRun>[] = [
  {
    accessorKey: 'targetUrl',
    header: 'Target URL',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('targetUrl')}</div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: 'bugFindings',
    header: 'Bug Findings',
    cell: ({ row }) => {
      const findings = row.getValue('bugFindings') as any[];
      return (
        <Badge variant="secondary">
          {findings.length} bugs found
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const run = row.original;
      return <BugFindingsCollapsible run={run} />;
    },
  },
];
