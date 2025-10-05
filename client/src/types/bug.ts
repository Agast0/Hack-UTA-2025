import { z } from 'zod';

export const SeverityLevel = z.enum(['low', 'medium', 'high', 'critical']);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

export const BugFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  roast: z.string(),
  reproduction_steps: z.array(z.object({
    step_number: z.number(),
    text: z.string(),
    image_url: z.string(),
  })),
  status: z.enum(['pending', 'confirmed', 'rejected']).default('pending'),
  isEditing: z.boolean().optional().default(false),
});

export type BugFinding = z.infer<typeof BugFindingSchema>;

export const AgentRunSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  targetUrl: z.string(),
  createdBy: z.string(), // User ID who created/started the audit
  settings: z.object({
    includeSubdomains: z.boolean().default(false),
    customHeaders: z.record(z.string(), z.string()).optional(),
  }),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  bugFindings: z.array(BugFindingSchema),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  createdByName: z.string().optional(),
  createdByEmail: z.string().email().optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

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
