import { z } from 'zod';

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool', 'developer']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  messages: ChatMessage[];
  updatedAt: number;
  createdAt: number;
}

export const AgentStatusSchema = z.enum(['active', 'draft', 'archived']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  tools: string[];
  status: AgentStatus;
  graphId?: string;
  metadata?: Record<string, unknown>;
}

export const KnowledgeStatusSchema = z.enum(['ready', 'processing', 'error', 'empty']);
export type KnowledgeStatus = z.infer<typeof KnowledgeStatusSchema>;

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documents: number;
  size: string;
  status: KnowledgeStatus;
  updatedAt: number;
}

export const SourceStatusSchema = z.enum(['ready', 'processing', 'error']);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export interface KnowledgeSource {
  id: string;
  title: string;
  type: string;
  status: SourceStatus;
  chunks: number;
  tokens: number;
  progress: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  usage: {
    tokens: number;
    requests: number;
    agents: number;
  };
}