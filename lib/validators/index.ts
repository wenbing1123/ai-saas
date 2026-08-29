import { z } from 'zod';

export const ChatRequestSchema = z.object({
  agentId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system', 'tool', 'developer']),
      content: z.string(),
      id: z.string().optional(),
    }),
  ),
  stream: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const AgentCreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional(),
  systemPrompt: z.string().min(10),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  tools: z.array(z.string()).default([]),
});
export type AgentCreateInput = z.infer<typeof AgentCreateSchema>;

export const KnowledgeCreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional(),
  files: z.array(z.string()).default([]),
});
export type KnowledgeCreateInput = z.infer<typeof KnowledgeCreateSchema>;