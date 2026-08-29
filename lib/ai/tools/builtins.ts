import { toolRegistry } from './registry';

toolRegistry.register({
  name: 'web_search',
  description: 'Search the web for up-to-date information.',
  inputSchema: {
    query: { type: 'string', description: 'Search query' },
    maxResults: { type: 'number', description: 'Max number of results', default: 5 },
  },
  run: async (input) => {
    const { query, maxResults = 5 } = input as { query: string; maxResults: number };
    return {
      results: Array.from({ length: Math.min(maxResults, 3) }).map((_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://example.com/${i + 1}`,
        snippet: `This is a mock result ${i + 1} for the query "${query}".`,
      })),
    };
  },
});

toolRegistry.register({
  name: 'kb_search',
  description: 'Search your connected knowledge bases.',
  inputSchema: {
    query: { type: 'string' },
    kbIds: { type: 'array', items: { type: 'string' } },
  },
  run: async (input) => {
    const { query } = input as { query: string; kbIds?: string[] };
    return {
      chunks: [
        {
          id: 'c1',
          score: 0.92,
          content: `Relevant passage about "${query}" from the product docs.`,
          source: 'product-docs',
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'sql_generator',
  description: 'Generate and optionally execute SQL against a connected database.',
  inputSchema: {
    question: { type: 'string' },
    execute: { type: 'boolean', default: false },
  },
  run: async (input) => {
    const { question, execute = false } = input as { question: string; execute: boolean };
    return {
      sql: `-- Generated for: ${question}\nSELECT 1;`,
      executed: execute,
      rows: execute ? [] : null,
    };
  },
});

toolRegistry.register({
  name: 'chart_renderer',
  description: 'Render a chart from structured data.',
  inputSchema: {
    type: { type: 'string', enum: ['line', 'bar', 'pie', 'table'] },
    data: { type: 'object' },
  },
  run: async (input) => ({ rendered: true, spec: input }),
});

toolRegistry.register({
  name: 'ticket_create',
  description: 'Create a support ticket in the connected helpdesk.',
  inputSchema: {
    subject: { type: 'string' },
    body: { type: 'string' },
    priority: { type: 'string', default: 'medium' },
  },
  run: async (input) => ({ id: 'T-' + Math.random().toString(36).slice(2, 8), created: true, input }),
});