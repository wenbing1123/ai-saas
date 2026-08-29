import { appConfig } from '@/config/app';

export interface LangGraphClientConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface RunInput {
  agentId: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export interface RunOutput {
  runId: string;
  message: string;
  trace: Array<{ node: string; status: 'ok' | 'err' }>;
}

export interface LangGraphClient {
  run(input: RunInput): Promise<RunOutput>;
  stream(input: RunInput): AsyncIterable<{ type: string; data: unknown }>;
  listAgents(): Promise<Array<{ id: string; name: string }>>;
}

export function createLangGraphClient(config?: Partial<LangGraphClientConfig>): LangGraphClient {
  const cfg: LangGraphClientConfig = {
    apiUrl: config?.apiUrl ?? appConfig.langgraph.apiUrl,
    apiKey: config?.apiKey ?? appConfig.langgraph.apiKey,
  };

  async function run(input: RunInput): Promise<RunOutput> {
    const res = await fetch(`${cfg.apiUrl}/threads/${input.agentId}/runs/wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        input: { messages: input.messages },
        assistant_id: input.agentId,
      }),
    });

    if (!res.ok) {
      throw new Error(`LangGraph API error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const messages = (data.messages ?? []) as Array<{ content: string; role: string }>;
    const last = messages.filter((m) => m.role === 'assistant').pop();

    return {
      runId: (data.run_id as string) ?? 'unknown',
      message: last?.content ?? '',
      trace: [],
    };
  }

  async function* stream(input: RunInput) {
    const res = await fetch(`${cfg.apiUrl}/threads/${input.agentId}/runs/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        input: { messages: input.messages },
        assistant_id: input.agentId,
        stream_mode: 'messages',
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`LangGraph stream error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const match = line.match(/^data:\s*(.+)$/m);
        if (match) {
          yield { type: 'event', data: match[1] };
        }
      }
    }
  }

  async function listAgents() {
    const res = await fetch(`${cfg.apiUrl}/assistants`, {
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
    });
    if (!res.ok) return [];
    return (await res.json()) as Array<{ id: string; name: string }>;
  }

  return { run, stream, listAgents };
}

export const langgraphClient = createLangGraphClient();