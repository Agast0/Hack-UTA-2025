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

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  memberCount: z.number().default(1),
  members: z.array(UserSchema).default([]),
});

export type Team = z.infer<typeof TeamSchema>;
