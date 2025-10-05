import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentRun } from '@/types/bug';
import { BugFindingsDropdown } from './bug-findings-dropdown';

export const columns: ColumnDef<AgentRun>[] = [
  {
    accessorKey: 'targetUrl',
    header: 'Target URL',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('targetUrl')}</div>
    ),
  },
  {
    accessorKey: 'createdByName',
    header: 'Created By',
    cell: ({ row }) => {
      const name = row.getValue('createdByName') as string | undefined;
      return <div>{name || '—'}</div>;
    },
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
      return <BugFindingsDropdown run={run} />;
    },
  },
];
