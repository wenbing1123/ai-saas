export interface AgentState {
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
    content: string;
  }>;
  agentId: string;
  toolCalls: Array<{ name: string; input: unknown }>;
  finalResponse?: string;
  metadata?: Record<string, unknown>;
}

export type AgentNode = (state: AgentState) => Promise<Partial<AgentState>>;
export type AgentEdge = (state: AgentState) => string | null;

export interface AgentGraph {
  id: string;
  nodes: Record<string, AgentNode>;
  edges: Record<string, { to: string; condition?: AgentEdge }[]>;
  start: string;
  end: string | null;
}