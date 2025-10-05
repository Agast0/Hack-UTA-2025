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
