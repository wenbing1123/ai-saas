import type { AgentState, AgentNode } from '../types';

export const routerNode: AgentNode = async (state) => {
  const last = state.messages[state.messages.length - 1];
  const toolCalls: AgentState['toolCalls'] = [];

  if (last?.content.toLowerCase().match(/summar|research|find|search|latest|news/i)) {
    toolCalls.push({ name: 'web_search', input: { query: last.content } });
  }
  if (last?.content.toLowerCase().match(/kb|doc|article|help|policy/i)) {
    toolCalls.push({ name: 'kb_search', input: { query: last.content } });
  }
  if (last?.content.toLowerCase().match(/sql|query|revenue|count|chart|graph/i)) {
    toolCalls.push({ name: 'sql_generator', input: { question: last.content } });
  }

  return { toolCalls: [...state.toolCalls, ...toolCalls] };
};

export const plannerNode: AgentNode = async (state) => {
  const last = state.messages[state.messages.length - 1];
  return {
    metadata: {
      ...state.metadata,
      plan: [
        'Understand user intent',
        last ? `Gather context for: ${last.content.slice(0, 60)}` : 'No content',
        state.toolCalls.length ? `Run ${state.toolCalls.length} tool(s)` : 'Answer directly',
        'Synthesize response',
      ],
    },
  };
};

export const synthesizerNode: AgentNode = async (state) => {
  const last = state.messages[state.messages.length - 1];
  const toolResults = state.toolCalls.length;
  const response =
    toolResults > 0
      ? `Based on ${toolResults} tool call(s), here's what I found for "${last?.content ?? ''}":\n\n• Key insight derived from the combined tool outputs\n• Next step suggested based on confidence\n\nWould you like me to go deeper on any specific point?`
      : `Here's a thoughtful response to "${last?.content ?? ''}".\n\nI've considered the context and will happily iterate if you need a different angle or more detail.`;

  return {
    finalResponse: response,
    messages: [...state.messages, { role: 'assistant', content: response, id: 'a-' + Date.now() }],
  };
};

export const toolExecutorNode: AgentNode = async (state) => {
  const results: string[] = [];
  for (const call of state.toolCalls.slice(-3)) {
    results.push(`[mock result from ${call.name}]`);
  }
  return {
    metadata: {
      ...state.metadata,
      toolResults: results,
    },
  };
};