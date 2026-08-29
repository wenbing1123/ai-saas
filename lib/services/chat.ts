import { createDefaultAgentGraph, runGraph, streamGraph } from '@/lib/ai/graphs/default';
import { langgraphClient } from '@/lib/ai/client';
import type { Agent } from '@/lib/types';

export interface ChatServiceResponse {
  message: string;
  runId?: string;
  trace: Array<{ node: string; status: 'ok' | 'err' }>;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface StreamChunk {
  type: 'node' | 'message' | 'done';
  node?: string;
  content?: string;
}

export interface ChatService {
  chat(agent: Agent, messages: Array<{ role: string; content: string }>): Promise<ChatServiceResponse>;
  stream(agent: Agent, messages: Array<{ role: string; content: string }>): AsyncIterable<StreamChunk>;
}

type ChatMessages = Array<{ role: string; content: string }>;

class MockChatService implements ChatService {
  async chat(agent: Agent, messages: ChatMessages): Promise<ChatServiceResponse> {
    const state = await runGraph(createDefaultAgentGraph(), {
      agentId: agent.id,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool' | 'developer',
        content: m.content,
      })),
    });

    const lastAssistant = state.messages.filter((m) => m.role === 'assistant').pop();
    const plan = state.metadata?.plan as string[] | undefined;
    const trace: Array<{ node: string; status: 'ok' | 'err' }> =
      plan?.map((node) => ({ node, status: 'ok' as const })) ?? [];

    return {
      message: lastAssistant?.content ?? state.finalResponse ?? 'No response',
      trace,
      usage: {
        promptTokens: messages.reduce((acc, m) => acc + m.content.length, 0),
        completionTokens: (state.finalResponse ?? '').length,
      },
    };
  }

  async *stream(agent: Agent, messages: ChatMessages): AsyncGenerator<StreamChunk> {
    const iter = streamGraph(createDefaultAgentGraph(), {
      agentId: agent.id,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool' | 'developer',
        content: m.content,
      })),
    });

    for await (const event of iter) {
      yield {
        type: event.type,
        node: event.node,
        content: event.content,
      };
    }
  }
}

class RemoteChatService implements ChatService {
  async chat(agent: Agent, messages: ChatMessages): Promise<ChatServiceResponse> {
    const result = await langgraphClient.run({
      agentId: agent.graphId ?? agent.id,
      messages,
    });
    return {
      message: result.message,
      runId: result.runId,
      trace: result.trace,
    };
  }

  async *stream(agent: Agent, messages: ChatMessages): AsyncGenerator<StreamChunk> {
    for await (const event of langgraphClient.stream({
      agentId: agent.graphId ?? agent.id,
      messages,
      stream: true,
    })) {
      yield { type: 'message', content: String(event.data ?? '') };
    }
  }
}

export function createChatService(mode: 'mock' | 'remote' = (process.env.NEXT_PUBLIC_AI_MODE as 'mock' | 'remote') ?? 'mock'): ChatService {
  return mode === 'remote' ? new RemoteChatService() : new MockChatService();
}

export const chatService = createChatService();