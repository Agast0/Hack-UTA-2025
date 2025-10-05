// lib/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Team, AgentRun, BugReport } from '@/types/bug';
import { userApi, teamApi, ApiError, bugApi, auditsApi } from '@/lib/api';

// --- Interfaces for State ---
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
  deleteTeam: (teamId: string) => void;
  addUserToTeam: (teamId: string, user: User) => void;
  removeUserFromTeam: (teamId: string, userId: string) => void;
  getAvailableUsers: (teamId: string) => User[];
  renameTeam: (teamId: string, name: string) => void;
}

interface BugsState {
  bugReports: BugReport[];
  bugsLoading: boolean;
  bugsError: string | null;
  // --- FIX: Added 'team_id' to the allowed parameters ---
  fetchBugReports: (params?: { status?: 'approved' | 'not_approved'; team_type?: 'front-end' | 'back-end'; team_id?: string }) => Promise<void>;
  getBugReportsByTeamId: (teamId: string) => BugReport[];
}

interface RunsState {
  runs: AgentRun[];
  addRun: (run: AgentRun) => void;
  updateRun: (runId: string, patch: Partial<AgentRun>) => void;
  startAudit: (params: { url: string; teamId: string; testCases?: Array<{ what_to_test: string; expected_output?: string }>; contentType?: string }) => Promise<void>;
}


// --- Store Implementations (No changes below this line in this file) ---

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async () => {
        set({ isLoading: false });
        return false;
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
    { name: 'auth-storage' }
  )
);

export const useRunsStore = create<RunsState>()(
  persist(
    (set, get) => ({
      runs: [],
      addRun: (run) => set((state) => ({ runs: [run, ...state.runs] })),
      updateRun: (runId, patch) =>
        set((state) => ({
          runs: state.runs.map((r) => (r.id === runId ? { ...r, ...patch } : r)),
        })),
      
      startAudit: async ({ url, teamId, testCases, contentType }) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticRun: AgentRun = {
          id: tempId,
          teamId,
          targetUrl: url,
          createdBy: 'current_user',
          settings: {},
          status: 'running',
          bugFindings: [],
          createdAt: new Date(),
        } as unknown as AgentRun;
        set((state) => ({ runs: [optimisticRun, ...state.runs] }));

        try {
          const res = await auditsApi.createAudit({
            url,
            content_type: contentType ?? 'text/plain',
            team_id: teamId,
            test_cases: (testCases || []).map(tc => ({
              what_to_test: tc.what_to_test,
              expected_output: tc.expected_output,
            })),
          });
          get().updateRun(tempId, {
            status: res.success ? 'completed' : 'failed',
            settings: { response: res.response } as any,
          });
        } catch (e: any) {
          get().updateRun(tempId, { status: 'failed' });
          console.error("Failed to start audit:", e);
          throw e;
        }
      },
    }),
    { name: 'runs-storage' }
  )
);

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
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
      deleteTeam: (teamId: string) => {
        set((state) => {
          const newTeams = state.teams.filter(team => team.id !== teamId);
          const newSelectedTeamId = state.selectedTeamId === teamId ? null : state.selectedTeamId;
          return {
            teams: newTeams,
            selectedTeamId: newSelectedTeamId,
          };
        });
      },
      addUserToTeam: (teamId: string, user: User) => {
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId
              ? {
                  ...team,
                  members: [...(team.members || []), user],
                }
              : team
          ),
        }));
      },
      removeUserFromTeam: (teamId: string, userId: string) => {
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId
              ? {
                  ...team,
                  members: (team.members || []).filter(member => member.id !== userId),
                }
              : team
          ),
        }));
      },
      getAvailableUsers: (_teamId: string) => {
        return [];
      },
      renameTeam: (teamId: string, name: string) => {
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId ? { ...team, name } : team
          ),
        }));
      },
    }),
    {
      name: 'team-storage',
    }
  )
);

export const useBugsStore = create<BugsState>()(
  (set, get) => ({
    bugReports: [],
    bugsLoading: false,
    bugsError: null,
    fetchBugReports: async (params) => {
      set({ bugsLoading: true, bugsError: null });
      try {
        const bugs = await bugApi.getBugReports(params);
        set({ bugReports: bugs, bugsLoading: false, bugsError: null });
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch bug reports';
        set({ bugsError: errorMessage, bugsLoading: false });
        throw error;
      }
    },
    getBugReportsByTeamId: (teamId: string) => {
      return (get().bugReports || []).filter((b) => {
        const t = (b as any).team;
        return t && (t.id === teamId || t._id === teamId);
      });
    },
  }),
);