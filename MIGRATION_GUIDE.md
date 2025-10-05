# Migration from Mock Data to API Integration

## Overview
This document outlines the changes made to transition the client-side code from using mock data to fetching data from the Atlas cluster using the backend API.

## Changes Made

### 1. API Client Setup (`/client/src/lib/api.ts`)
- Created a comprehensive API client utility
- Implemented error handling with custom `ApiError` class
- Added functions for all backend endpoints:
  - User management (create, get, list)
  - Team management (create, join, list)
  - Bug report CRUD operations
- Configured to use environment variable `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)

### 2. Updated TypeScript Types (`/client/src/types/bug.ts`)
- Modified `Team` type to match backend API structure:
  - Added `team_type` field (`'front-end' | 'back-end'`)
  - Changed `members` to array of user objects
  - Removed `description` and `memberCount` fields
- Updated `User` type to match backend API:
  - Added `auth0Id` field
  - Changed `avatar` to `picture`
  - Added optional `team` reference
- Added `BugReport` type for backend integration
- Fixed Zod schema validation for `customHeaders`

### 3. Store Updates (`/client/src/lib/store.ts`)
- **Auth Store**: 
  - Added `syncUser` function to integrate Auth0 with backend
  - Added loading and error states
  - Removed mock user dependency
- **Team Store**:
  - Replaced mock teams with API calls
  - Added `fetchTeams`, `createTeam`, `joinTeam` functions
  - Added loading and error states
  - Updated team creation to use backend API structure

### 4. Component Updates

#### Sidebar (`/client/src/components/layout/sidebar.tsx`)
- Integrated Auth0 user sync with backend
- Added team type selection (front-end/back-end)
- Implemented loading states and error handling
- Updated team display to show member count from API
- Added team type badge display

#### Main Content (`/client/src/components/dashboard/main-content.tsx`)
- Removed dependency on `mockAgentRuns`
- Added placeholder for agent runs (backend doesn't support this yet)
- Updated team display to show team type instead of description
- Added TODO comments for future agent run integration

#### Dashboard Page (`/client/src/app/dashboard/page.tsx`)
- Added Auth0 user sync integration
- Imported and used auth store for user management

## Backend API Endpoints Used

### User Endpoints
- `POST /api/create` - Sync Auth0 user with backend
- `GET /api/user/{auth0Id}` - Get user by Auth0 ID
- `GET /api/users` - List all users

### Team Endpoints
- `GET /api/teams` - List all teams (with optional type filter)
- `POST /api/teams` - Create new team
- `POST /api/teams/{teamId}/join` - Join existing team

### Bug Report Endpoints
- `GET /api/bugs` - List bug reports (with optional filters)
- `POST /api/bugs` - Create bug report
- `GET /api/bugs/{bugId}` - Get specific bug report
- `PUT /api/bugs/{bugId}` - Update bug report
- `DELETE /api/bugs/{bugId}` - Delete bug report

## Environment Configuration

Create a `.env.local` file in the client directory with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## What's Still Needed

### Backend Development Required
1. **Agent Run Endpoints**: The backend doesn't currently support agent runs and bug findings. These need to be implemented:
   - `POST /api/agent-runs` - Create new agent run
   - `GET /api/agent-runs` - List agent runs for a team
   - `GET /api/agent-runs/{runId}` - Get specific agent run
   - `PUT /api/agent-runs/{runId}` - Update agent run status

2. **Bug Finding Endpoints**: For the security audit results:
   - `GET /api/agent-runs/{runId}/findings` - Get bug findings for a run
   - `POST /api/agent-runs/{runId}/findings` - Add bug finding to run

### Frontend Integration
Once backend endpoints are available, update:
- `MainContent` component to fetch and display agent runs
- Add agent run creation functionality
- Implement bug findings display

## Testing the Integration

1. **Start the backend server**:
   ```bash
   cd server
   python main.py
   ```

2. **Start the frontend**:
   ```bash
   cd client
   npm run dev
   ```

3. **Test the flow**:
   - Sign in with Auth0
   - Create a team
   - Join a team
   - Verify data is persisted in MongoDB Atlas

## Error Handling

The implementation includes comprehensive error handling:
- API errors are caught and displayed to users
- Loading states prevent multiple simultaneous requests
- Network errors are handled gracefully
- Auth0 integration errors are logged but don't break the app

## Benefits of This Migration

1. **Real Data Persistence**: Teams and users are now stored in MongoDB Atlas
2. **Multi-user Support**: Multiple users can create and join teams
3. **Scalability**: Backend can handle multiple concurrent users
4. **Data Integrity**: All data operations go through validated API endpoints
5. **Error Recovery**: Proper error handling and loading states
6. **Auth0 Integration**: Seamless authentication with user sync to backend
