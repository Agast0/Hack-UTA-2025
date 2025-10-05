import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Team } from '@/types/bug';
import { userApi, teamApi, ApiError } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  syncUser: (auth0Data: { sub: string; email: string; name?: string; picture?: string }) => Promise<void>;
}

interface TeamState {
  teams: Team[];
  selectedTeamId: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedTeam: (teamId: string | null) => void;
  fetchTeams: () => Promise<void>;
  createTeam: (teamData: { name: string; team_type: 'front-end' | 'back-end'; creator_auth0Id: string }) => Promise<void>;
  joinTeam: (teamId: string, userAuth0Id: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email: string, password: string) => {
        // This is now handled by Auth0, but keeping for compatibility
        set({ isLoading: true, error: null });
        try {
          // In a real app, Auth0 handles authentication
          // This is just a placeholder
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false });
          return false;
        }
      },
      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },
      syncUser: async (auth0Data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await userApi.createUser(auth0Data);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          const errorMessage = error instanceof ApiError ? error.message : 'Failed to sync user';
          set({ 
            error: errorMessage, 
            isLoading: false,
            isAuthenticated: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],
      selectedTeamId: null,
      isLoading: false,
      error: null,
      setSelectedTeam: (teamId: string | null) => {
        set({ selectedTeamId: teamId });
      },
      fetchTeams: async () => {
        set({ isLoading: true, error: null });
        try {
          const teams = await teamApi.getTeams();
          set({ teams, isLoading: false, error: null });
        } catch (error) {
          const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch teams';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      createTeam: async (teamData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await teamApi.createTeam(teamData);
          set((state) => ({
            teams: [...state.teams, response.team],
            isLoading: false,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof ApiError ? error.message : 'Failed to create team';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      joinTeam: async (teamId: string, userAuth0Id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await teamApi.joinTeam(teamId, userAuth0Id);
          // Update the teams list with the updated team
          set((state) => ({
            teams: state.teams.map(team => 
              team.id === teamId ? response.team : team
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof ApiError ? error.message : 'Failed to join team';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'team-storage',
    }
  )
);
