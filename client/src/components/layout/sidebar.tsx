'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Shield, AlertCircle, MoreHorizontal, Trash2, UserPlus, X, Pencil, Bug } from 'lucide-react';
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
import { useTeamStore, useAuthStore, useBugsStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Team } from '@/types/bug';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';

export function Sidebar() {
  const router = useRouter();
  const { teams, selectedTeamId, setSelectedTeam, deleteTeam, addUserToTeam, removeUserFromTeam, getAvailableUsers, renameTeam, fetchTeams, createTeam, isLoading, error } = useTeamStore();
  const { user, syncUser } = useAuthStore();
  const { bugReports, fetchBugReports } = useBugsStore();
  const { user: auth0User, isAuthenticated } = useAuth0();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToAddUser, setTeamToAddUser] = useState<Team | null>(null);
  const [teamToRename, setTeamToRename] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState<'front-end' | 'back-end'>('front-end');
  const [isCreating, setIsCreating] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmedBugsCount, setConfirmedBugsCount] = useState(0);

  // Sync user with backend when Auth0 user is available
  useEffect(() => {
    if (isAuthenticated && auth0User && !user) {
      syncUser({
        sub: auth0User.sub || '',
        email: auth0User.email || '',
        name: auth0User.name,
        picture: auth0User.picture,
      }).catch(console.error);
    }
  }, [isAuthenticated, auth0User, user, syncUser]);

  // Fetch teams and approved bugs when user is available
  useEffect(() => {
    if (user) {
      fetchTeams().catch(console.error);
      // Fetch bugs with status 'approved' to populate the count
      fetchBugReports({ status: 'approved' });
    }
  }, [user, fetchTeams, fetchBugReports]);

  // Update the count whenever the bug reports in the store change
  useEffect(() => {
    // We filter here to ensure we only count the approved bugs
    const approvedBugs = bugReports.filter(bug => bug.is_approved);
    setConfirmedBugsCount(approvedBugs.length);
  }, [bugReports]);

  const handleCreateTeam = async () => {
    if (newTeamName.trim() && user?.auth0Id) {
      setIsCreating(true);
      try {
        await createTeam({
          name: newTeamName,
          team_type: newTeamType,
          creator_auth0Id: user.auth0Id,
        });
        setNewTeamName('');
        setIsCreateDialogOpen(false);
      } catch (error) {
        console.error('Failed to create team:', error);
      } finally {
        setIsCreating(false);
      }
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
                className="mlg-btn h-8 px-3 rounded-full transition-all duration-200 shadow-sm hover:-translate-y-1 hover:shadow-lg"
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
                  <Label htmlFor="type">Team Type</Label>
                  <select
                    id="type"
                    value={newTeamType}
                    onChange={(e) => setNewTeamType(e.target.value as 'front-end' | 'back-end')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="front-end">Front-end</option>
                    <option value="back-end">Back-end</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Team'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading teams...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            teams.map((team) => (
              <Card
                key={team.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTeamId === team.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedTeam(team.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {team.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {(team.members || []).length} members
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {team.team_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!isLoading && !error && teams.length === 0 && (
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
            {confirmedBugsCount} bugs
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
                  {confirmedBugsCount} bugs
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
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback>
                        {(user.name || user.email).split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name || user.email}</p>
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