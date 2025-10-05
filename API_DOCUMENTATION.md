# BugZooka API Documentation

## Overview

This document outlines the REST API endpoints required for the BugZooka application. All endpoints should return JSON responses and follow RESTful conventions.

## Base URL
```
http://localhost:8000/api
```

## Authentication

All endpoints require authentication via Auth0 JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Data Models

### User
```typescript
{
  id: string,
  email: string,
  name: string,
  avatar?: string
}
```

### Team
```typescript
{
  id: string,
  name: string,
  description?: string,
  createdAt: Date,
  memberCount: number,
  members: User[]
}
```

### Bug Finding
```typescript
{
  id: string,
  title: string,
  description: string,
  roast: string,
  reproduction_steps: Array<{
    step_number: number,
    text: string,
    image_url: string
  }>,
  status: 'pending' | 'confirmed' | 'rejected',
  isEditing: boolean
}
```

### Agent Run (Audit)
```typescript
{
  id: string,
  teamId: string,
  targetUrl: string,
  createdBy: string,
  settings: {
    includeSubdomains: boolean,
    customHeaders?: Record<string, string>
  },
  status: 'pending' | 'running' | 'completed' | 'failed',
  bugFindings: BugFinding[],
  createdAt: Date,
  completedAt?: Date
}
```

---

## Team Management APIs

### GET /api/teams
Get all teams for the authenticated user.

**Response:**
```json
{
  "teams": [
    {
      "id": "team-1",
      "name": "Security Team Alpha",
      "description": "Primary security testing team",
      "createdAt": "2024-01-15T10:00:00Z",
      "memberCount": 3,
      "members": [
        {
          "id": "user-1",
          "email": "john.doe@company.com",
          "name": "John Doe",
          "avatar": "https://example.com/avatar1.jpg"
        }
      ]
    }
  ]
}
```

### POST /api/teams
Create a new team.

**Request Body:**
```json
{
  "name": "New Security Team",
  "description": "Team description"
}
```

**Response:**
```json
{
  "id": "team-2",
  "name": "New Security Team",
  "description": "Team description",
  "createdAt": "2024-01-15T10:00:00Z",
  "memberCount": 1,
  "members": []
}
```

### PUT /api/teams/{teamId}
Update team details.

**Request Body:**
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

### DELETE /api/teams/{teamId}
Delete a team.

**Response:**
```json
{
  "message": "Team deleted successfully"
}
```

### POST /api/teams/{teamId}/members
Add a user to a team.

**Request Body:**
```json
{
  "userId": "user-2"
}
```

### DELETE /api/teams/{teamId}/members/{userId}
Remove a user from a team.

---

## Audit Management APIs

### GET /api/audits
Get all audits for a team.

**Query Parameters:**
- `teamId` (required): Team ID to filter audits

**Response:**
```json
{
  "audits": [
    {
      "id": "run-1",
      "teamId": "team-1",
      "targetUrl": "https://example.com",
      "createdBy": "user-1",
      "settings": {
        "includeSubdomains": false,
        "customHeaders": {}
      },
      "status": "completed",
      "bugFindings": [],
      "createdAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /api/audits
Create a new audit.

**Request Body:**
```json
{
  "teamId": "team-1",
  "targetUrl": "https://example.com",
  "settings": {
    "includeSubdomains": false,
    "customHeaders": {
      "User-Agent": "BugZooka/1.0"
    }
  },
  "testCases": [
    {
      "id": "test-1",
      "test": "Test login functionality",
      "expectedOutput": "Should redirect to dashboard"
    }
  ]
}
```

**Response:**
```json
{
  "id": "run-2",
  "teamId": "team-1",
  "targetUrl": "https://example.com",
  "createdBy": "user-1",
  "settings": {
    "includeSubdomains": false,
    "customHeaders": {}
  },
  "status": "running",
  "bugFindings": [],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### GET /api/audits/{auditId}
Get a specific audit.

### PUT /api/audits/{auditId}/status
Update audit status.

**Request Body:**
```json
{
  "status": "completed"
}
```

---

## Bug Finding Management APIs

### GET /api/bugs/confirmed
Get all confirmed bugs across all teams.

**Response:**
```json
{
  "bugs": [
    {
      "id": "bug-1",
      "title": "XSS in Search Function",
      "description": "The search functionality is vulnerable to cross-site scripting attacks.",
      "roast": "This search is so vulnerable, it might as well be a public bulletin board...",
      "reproduction_steps": [
        {
          "step_number": 1,
          "text": "Navigate to the search page",
          "image_url": "https://example.com/step1.png"
        }
      ],
      "status": "confirmed",
      "isEditing": false
    }
  ]
}
```

### GET /api/bugs/{bugId}
Get a specific bug finding.

### PUT /api/bugs/{bugId}/status
Update bug status (confirm/reject).

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "id": "bug-1",
  "status": "confirmed",
  "message": "Bug status updated successfully"
}
```

---

## Export Integration APIs

### POST /api/export/jira
Export a confirmed bug to Jira.

**Request Body:**
```json
{
  "bugId": "bug-1",
  "jiraProject": "SEC",
  "jiraIssueType": "Bug",
  "jiraLabels": ["security", "xss"],
  "jiraPriority": "High"
}
```

**Response:**
```json
{
  "jiraTicketId": "SEC-123",
  "jiraUrl": "https://company.atlassian.net/browse/SEC-123",
  "message": "Bug successfully exported to Jira"
}
```

### POST /api/export/github
Export a confirmed bug to GitHub.

**Request Body:**
```json
{
  "bugId": "bug-1",
  "githubRepo": "company/security-issues",
  "githubLabels": ["bug", "security", "xss"],
  "githubMilestone": "Q1-2024"
}
```

**Response:**
```json
{
  "githubIssueId": 456,
  "githubUrl": "https://github.com/company/security-issues/issues/456",
  "message": "Bug successfully exported to GitHub"
}
```

---

## User Management APIs

### GET /api/users
Get all users in the system.

**Response:**
```json
{
  "users": [
    {
      "id": "user-1",
      "email": "john.doe@company.com",
      "name": "John Doe",
      "avatar": "https://example.com/avatar1.jpg"
    }
  ]
}
```

### GET /api/users/me
Get current authenticated user.

**Response:**
```json
{
  "id": "user-1",
  "email": "john.doe@company.com",
  "name": "John Doe",
  "avatar": "https://example.com/avatar1.jpg"
}
```

---

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

```json
{
  "error": "Bad Request",
  "message": "Invalid request body",
  "statusCode": 400
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Implementation Notes

### Database Schema
- **Users Table**: id, email, name, avatar, created_at
- **Teams Table**: id, name, description, created_at
- **Team_Members Table**: team_id, user_id
- **Audits Table**: id, team_id, target_url, created_by, status, settings, created_at, completed_at
- **Bug_Findings Table**: id, audit_id, title, description, roast, status, reproduction_steps, created_at
- **Reproduction_Steps Table**: id, bug_id, step_number, text, image_url

### Security Considerations
- All endpoints require valid JWT tokens
- Team access is restricted to team members
- Audit access is restricted to team members
- Input validation using Zod schemas
- Rate limiting on export endpoints
- CORS configuration for frontend domain

### Integration Requirements
- **Jira Integration**: Requires Jira API credentials and project access
- **GitHub Integration**: Requires GitHub API token and repository access
- **Auth0 Integration**: JWT token validation middleware
- **File Upload**: For screenshot images in reproduction steps

---

## Frontend Integration

The frontend currently uses mock data. To integrate with these APIs:

1. Replace mock data calls with actual API calls
2. Implement error handling for API responses
3. Add loading states for async operations
4. Implement proper authentication flow
5. Add retry logic for failed requests

### Example Frontend Integration

```typescript
// Replace mock data with API call
const fetchConfirmedBugs = async () => {
  const response = await fetch('/api/bugs/confirmed', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Export to Jira
const exportToJira = async (bugId: string) => {
  const response = await fetch('/api/export/jira', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      bugId,
      jiraProject: 'SEC',
      jiraIssueType: 'Bug'
    })
  });
  return response.json();
};
```

---

This API documentation provides the complete backend requirements for the BugZooka application, including all the confirmed bugs functionality and export integrations.
