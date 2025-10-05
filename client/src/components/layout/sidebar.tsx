'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Shield, AlertCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeamStore, useAuthStore } from '@/lib/store';
import { Team } from '@/types/bug';
import { useAuth0 } from '@auth0/auth0-react';

export function Sidebar() {
  const { teams, selectedTeamId, setSelectedTeam, fetchTeams, createTeam, isLoading, error } = useTeamStore();
  const { user, syncUser } = useAuthStore();
  const { user: auth0User, isAuthenticated } = useAuth0();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState<'front-end' | 'back-end'>('front-end');
  const [isCreating, setIsCreating] = useState(false);

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

  // Fetch teams when user is available
  useEffect(() => {
    if (user) {
      fetchTeams().catch(console.error);
    }
  }, [user, fetchTeams]);

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

  return (
    <div className="w-80 bg-background border-r border-border h-full overflow-y-auto hidden lg:block">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Teams</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
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
                      {team.members?.length || 0} members
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
    </div>
  );
}
