import type { AgentGraph, AgentState } from '../types';
import { plannerNode, routerNode, synthesizerNode, toolExecutorNode } from '../nodes/core';

export function createDefaultAgentGraph(): AgentGraph {
  return {
    id: 'default-agent',
    nodes: {
      planner: plannerNode,
      router: routerNode,
      executor: toolExecutorNode,
      synthesizer: synthesizerNode,
    },
    edges: {
      planner: [{ to: 'router' }],
      router: [
        {
          to: 'executor',
          condition: (state) => (state.toolCalls.length > 0 ? 'executor' : 'synthesizer'),
        },
      ],
      executor: [{ to: 'synthesizer' }],
      synthesizer: [],
    },
    start: 'planner',
    end: null,
  };
}

export async function runGraph(
  graph: AgentGraph,
  initialState: Omit<AgentState, 'toolCalls' | 'messages'> & { messages: AgentState['messages'] },
): Promise<AgentState> {
  let state: AgentState = {
    messages: initialState.messages,
    agentId: initialState.agentId,
    toolCalls: [],
    metadata: initialState.metadata,
  };

  let current = graph.start;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = graph.nodes[current];
    if (!node) break;

    const updates = await node(state);
    state = { ...state, ...updates };

    const transitions = graph.edges[current] ?? [];
    let next: string | null = null;
    for (const edge of transitions) {
      if (edge.condition) {
        const target = edge.condition(state);
        if (target) {
          next = target;
          break;
        }
      } else {
        next = edge.to;
        break;
      }
    }

    if (!next || next === current) break;
    current = next;
  }

  return state;
}

export function streamGraph(
  graph: AgentGraph,
  initialState: { messages: AgentState['messages']; agentId: string },
): AsyncIterable<{ type: 'node' | 'message' | 'done'; node?: string; content?: string; state?: AgentState }> {
  const state: AgentState = {
    messages: initialState.messages,
    agentId: initialState.agentId,
    toolCalls: [],
  };

  const events: Array<{ type: 'node' | 'message' | 'done'; node?: string; content?: string; state?: AgentState }> = [];

  (async () => {
    let current = graph.start;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
      visited.add(current);
      events.push({ type: 'node', node: current, state: { ...state } });

      const node = graph.nodes[current];
      if (!node) break;
      const updates = await node(state);
      Object.assign(state, updates);

      if (updates.messages && updates.messages.length) {
        const last = updates.messages[updates.messages.length - 1];
        if (last?.role === 'assistant') {
          events.push({ type: 'message', content: last.content });
        }
      }

      const transitions = graph.edges[current] ?? [];
      let next: string | null = null;
      for (const edge of transitions) {
        if (edge.condition) {
          const target = edge.condition(state);
          if (target) {
            next = target;
            break;
          }
        } else {
          next = edge.to;
          break;
        }
      }
      if (!next || next === current) break;
      current = next;
    }
    events.push({ type: 'done', state: { ...state } });
  })();

  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (i < events.length) {
            return { value: events[i++], done: false };
          }
          await new Promise((r) => setTimeout(r, 20));
          if (i < events.length) {
            return { value: events[i++], done: false };
          }
          return { done: true, value: undefined };
        },
      };
    },
  };
}