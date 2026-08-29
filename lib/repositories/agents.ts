import type { Agent, Conversation, KnowledgeBase } from '@/lib/types';
import type { BaseRepository } from './base';

const agentsStore: Agent[] = [];
const conversationsStore: Conversation[] = [];
const knowledgeBasesStore: KnowledgeBase[] = [];

let agentSeq = 1;
let convSeq = 1;
let kbSeq = 1;

function delay<T>(value: T, ms = 50): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const agentRepository: BaseRepository<
  Agent,
  {
    workspaceId: number;
    name: string;
    description?: string;
    systemPrompt: string;
    model: string;
    temperature?: number;
    tools?: string[];
    graphId?: string;
    status?: Agent['status'];
  },
  Partial<Agent> & { workspaceId?: number }
> = {
  async list(filter) {
    await delay(null);
    if (filter?.workspaceId) return agentsStore.filter((a) => a.id.startsWith(`${filter.workspaceId}-`));
    return [...agentsStore];
  },
  async getById(id) {
    await delay(null);
    return agentsStore.find((a) => a.id === String(id)) ?? null;
  },
  async create(input) {
    await delay(null);
    const agent: Agent = {
      id: `${input.workspaceId}-${agentSeq++}`,
      name: input.name,
      description: input.description ?? '',
      systemPrompt: input.systemPrompt,
      model: input.model,
      temperature: input.temperature ?? 0.7,
      tools: input.tools ?? [],
      status: input.status ?? 'draft',
      graphId: input.graphId,
    };
    agentsStore.push(agent);
    return agent;
  },
  async update(id, patch) {
    await delay(null);
    const idx = agentsStore.findIndex((a) => a.id === String(id));
    if (idx === -1) return null;
    agentsStore[idx] = { ...agentsStore[idx], ...patch };
    return agentsStore[idx];
  },
  async delete(id) {
    await delay(null);
    const idx = agentsStore.findIndex((a) => a.id === String(id));
    if (idx === -1) return false;
    agentsStore.splice(idx, 1);
    return true;
  },
};

export const conversationRepository: BaseRepository<
  Conversation,
  {
    workspaceId: number;
    agentId: number;
    userId: number;
    title?: string;
    messages?: Conversation['messages'];
  }
> = {
  async list() {
    await delay(null);
    return [...conversationsStore];
  },
  async getById(id) {
    await delay(null);
    return conversationsStore.find((c) => c.id === String(id)) ?? null;
  },
  async create(input) {
    await delay(null);
    const conv: Conversation = {
      id: `${convSeq++}`,
      title: input.title ?? 'Untitled',
      agentId: String(input.agentId),
      messages: input.messages ?? [],
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    conversationsStore.push(conv);
    return conv;
  },
  async update(id, patch) {
    await delay(null);
    const idx = conversationsStore.findIndex((c) => c.id === String(id));
    if (idx === -1) return null;
    conversationsStore[idx] = { ...conversationsStore[idx], ...patch, updatedAt: Date.now() };
    return conversationsStore[idx];
  },
  async delete(id) {
    await delay(null);
    const idx = conversationsStore.findIndex((c) => c.id === String(id));
    if (idx === -1) return false;
    conversationsStore.splice(idx, 1);
    return true;
  },
};

export const knowledgeBaseRepository: BaseRepository<
  KnowledgeBase,
  {
    workspaceId: number;
    name: string;
    description?: string;
    status?: KnowledgeBase['status'];
  }
> = {
  async list() {
    await delay(null);
    return [...knowledgeBasesStore];
  },
  async getById(id) {
    await delay(null);
    return knowledgeBasesStore.find((k) => k.id === String(id)) ?? null;
  },
  async create(input) {
    await delay(null);
    const kb: KnowledgeBase = {
      id: `${kbSeq++}`,
      name: input.name,
      description: input.description ?? '',
      documents: 0,
      size: '0 MB',
      status: input.status ?? 'empty',
      updatedAt: Date.now(),
    };
    knowledgeBasesStore.push(kb);
    return kb;
  },
  async update(id, patch) {
    await delay(null);
    const idx = knowledgeBasesStore.findIndex((k) => k.id === String(id));
    if (idx === -1) return null;
    knowledgeBasesStore[idx] = { ...knowledgeBasesStore[idx], ...patch, updatedAt: Date.now() };
    return knowledgeBasesStore[idx];
  },
  async delete(id) {
    await delay(null);
    const idx = knowledgeBasesStore.findIndex((k) => k.id === String(id));
    if (idx === -1) return false;
    knowledgeBasesStore.splice(idx, 1);
    return true;
  },
};