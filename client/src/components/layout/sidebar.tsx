'use client';

import { useState } from 'react';
import { Plus, Users, Shield, MoreHorizontal, Trash2, UserPlus, X, Pencil, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamStore } from '@/lib/store';
import { Team } from '@/types/bug';
import { useRouter } from 'next/navigation';

export function Sidebar() {
  const router = useRouter();
  const { teams, selectedTeamId, setSelectedTeam, addTeam, deleteTeam, addUserToTeam, removeUserFromTeam, getAvailableUsers, renameTeam } = useTeamStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToAddUser, setTeamToAddUser] = useState<Team | null>(null);
  const [teamToRename, setTeamToRename] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      addTeam({
        name: newTeamName,
        description: newTeamDescription,
        memberCount: 1,
        members: [],
      });
      setNewTeamName('');
      setNewTeamDescription('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTeam = () => {
    if (teamToDelete) {
      deleteTeam(teamToDelete.id);
      setTeamToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddUser = (team: Team) => {
    setTeamToAddUser(team);
    setIsAddUserDialogOpen(true);
  };

  const handleAddUserToTeam = (user: any) => {
    if (teamToAddUser) {
      addUserToTeam(teamToAddUser.id, user);
      setTeamToAddUser(null);
      setIsAddUserDialogOpen(false);
    }
  };

  const handleRemoveUser = (teamId: string, userId: string) => {
    removeUserFromTeam(teamId, userId);
  };

  const confirmRenameTeam = () => {
    if (teamToRename && renameValue.trim()) {
      renameTeam(teamToRename.id, renameValue.trim());
      setTeamToRename(null);
      setRenameValue('');
    }
  };

  return (
    <div className="w-80 bg-background border-r border-border h-full overflow-y-auto hidden lg:block">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Teams</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 px-3 rounded-full transition-all duration-200 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Add a new team to organize your bug hunting efforts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter team name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter team description"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                >
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-1.5">
          {teams.map((team) => (
            <Card
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`group transition-all hover:shadow-md py-2 gap-1 cursor-pointer ${
                selectedTeamId === team.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
            >
              <CardHeader className="pb-1 px-3 gap-0.5">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-1.5 flex-1"
                  >
                    <div className="bg-primary/10 rounded-lg p-1">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium">
                      {team.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {team.memberCount} members
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full transition-colors duration-150 hover:bg-primary/30 hover:text-primary-foreground dark:hover:bg-primary/35 focus-visible:ring-2 focus-visible:ring-primary/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setTeamToRename(team);
                          setRenameValue(team.name);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Rename Team</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                            handleDeleteTeam(team);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent 
                className="pt-0 px-3 py-0.5"
              >
                {/* Description removed for a slimmer card */}

                {/* Team Members */}
                <div className="space-y-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs leading-none font-medium text-muted-foreground">Members</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 rounded-full transition-colors duration-150 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddUser(team);
                      }}
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-0.5">
                    {(team.members || []).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-1 bg-muted rounded-full px-1.5 py-0.5 text-[10px]"
                      >
                        <Avatar className="h-3 w-3">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback className="text-[10px]">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px]">{member.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 rounded-full transition-colors duration-150 hover:bg-destructive/25 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUser(team.id, member.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teams.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No teams yet. Create your first team to get started!
            </p>
          </div>
        )}
      </div>

      {/* Confirmed Bugs Section */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Confirmed Bugs</h2>
          <Badge variant="secondary" className="text-xs">
            0 bugs
          </Badge>
        </div>
        
        <div className="space-y-1.5">
          <Card
            onClick={() => {
              router.push('/confirmed-bugs');
            }}
            className="group transition-all hover:shadow-md py-2 gap-1 cursor-pointer hover:bg-accent"
          >
            <CardHeader className="pb-1 px-3 gap-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 flex-1">
                  <div className="bg-primary/10 rounded-lg p-1">
                    <Bug className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-medium">
                    All Confirmed Bugs
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  0 bugs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-3 py-0.5">
              <p className="text-xs text-muted-foreground">
                View and manage all confirmed bug reports
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{teamToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTeam}
            >
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add User to Team</DialogTitle>
            <DialogDescription>
              Select a user to add to "{teamToAddUser?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {teamToAddUser && getAvailableUsers(teamToAddUser.id).length > 0 ? (
                getAvailableUsers(teamToAddUser.id).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleAddUserToTeam(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No available users to add to this team.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddUserDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Team Dialog */}
      <Dialog open={!!teamToRename} onOpenChange={(open) => {
        if (!open) {
          setTeamToRename(null);
          setRenameValue('');
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
            <DialogDescription>
              Update the name for "{teamToRename?.name || ''}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-team">New Team Name</Label>
            <Input
              id="rename-team"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new team name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTeamToRename(null);
                setRenameValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRenameTeam}
              disabled={!renameValue.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
