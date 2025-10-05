import { z } from 'zod';

export const SeverityLevel = z.enum(['low', 'medium', 'high', 'critical']);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

export const BugFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  stepsToReproduce: z.array(z.string()),
  severity: SeverityLevel,
  roastMessage: z.string(),
  screenshotUrls: z.array(z.string()),
  createdAt: z.date(),
});

export type BugFinding = z.infer<typeof BugFindingSchema>;

export const AgentRunSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  targetUrl: z.string(),
  settings: z.object({
    maxDepth: z.number().default(3),
    includeSubdomains: z.boolean().default(false),
    customHeaders: z.record(z.string(), z.string()).optional(),
  }),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  bugFindings: z.array(BugFindingSchema),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

// Updated Team type to match backend API
export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  team_type: z.enum(['front-end', 'back-end']),
  members: z.array(z.object({
    id: z.string(),
    auth0Id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    picture: z.string().optional(),
  })).default([]).optional(),
});

export type Team = z.infer<typeof TeamSchema>;

// Updated User type to match backend API
export const UserSchema = z.object({
  id: z.string(),
  auth0Id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    team_type: z.enum(['front-end', 'back-end']),
  }).optional(),
});

export type User = z.infer<typeof UserSchema>;

// Bug Report type to match backend API
export const BugReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  is_approved: z.boolean(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    team_type: z.enum(['front-end', 'back-end']),
  }),
});

export type BugReport = z.infer<typeof BugReportSchema>;
