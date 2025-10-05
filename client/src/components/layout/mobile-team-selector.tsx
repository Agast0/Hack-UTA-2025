'use client';

import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamStore } from '@/lib/store';

export function MobileTeamSelector() {
  const { teams, selectedTeamId, setSelectedTeam } = useTeamStore();
  const [isOpen, setIsOpen] = useState(false);

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  return (
    <div className="lg:hidden p-4 border-b border-gray-800 bg-black">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{selectedTeam?.name || 'Select Team'}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => {
                setSelectedTeam(team.id);
                setIsOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>{team.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {team.memberCount}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
