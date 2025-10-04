import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Team } from '@/types/bug';
import { mockUser, mockTeams } from './mock-data';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

interface TeamState {
  teams: Team[];
  selectedTeamId: string | null;
  setSelectedTeam: (teamId: string | null) => void;
  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Fake authentication - accept any email/password
        if (email && password) {
          set({ user: mockUser, isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
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
      teams: mockTeams,
      selectedTeamId: null,
      setSelectedTeam: (teamId: string | null) => {
        set({ selectedTeamId: teamId });
      },
      addTeam: (teamData: Omit<Team, 'id' | 'createdAt'>) => {
        const newTeam: Team = {
          ...teamData,
          id: `team-${Date.now()}`,
          createdAt: new Date(),
        };
        set((state) => ({
          teams: [...state.teams, newTeam],
        }));
      },
    }),
    {
      name: 'team-storage',
    }
  )
);
