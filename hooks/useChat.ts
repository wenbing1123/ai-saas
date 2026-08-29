'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent } from '@/lib/types';

export interface UseChatOptions {
  agent: Agent;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function useChat({ agent, initialMessages = [] }: UseChatOptions) {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      setError(null);
      setMessages((prev) => [...prev, { role: 'user', content }]);
      setIsLoading(true);

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            messages: [...messages, { role: 'user', content }],
            stream: true,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) throw new Error('Request failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const evt of events) {
            const match = evt.match(/^data:\s*(.+)$/m);
            if (!match) continue;
            if (match[1] === '[DONE]') continue;
            try {
              const data = JSON.parse(match[1]) as { content?: string; type?: string; message?: string };
              if (data.content) accumulated += data.content;
              if (data.message) accumulated += data.message;
            } catch {
              // ignore non-JSON events
            }
          }

          if (accumulated) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { role: 'assistant', content: accumulated }];
              }
              return [...prev, { role: 'assistant', content: accumulated }];
            });
          }
        }

        if (!accumulated) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Sorry, no response was generated.' },
          ]);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [agent.id, isLoading, messages],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, isLoading, error, send, reset };
}