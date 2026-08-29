'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Send, Bot, User, Sparkles, Paperclip, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/dashboard/AppShell';
import type { Agent, ChatMessage } from '@/lib/types';
import { AGENT_CATALOG } from '@/lib/mock-data';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const t = useTranslations('chat');
  const [activeAgent, setActiveAgent] = React.useState<Agent>(AGENT_CATALOG[0]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [selectedAgentId, setSelectedAgentId] = React.useState(AGENT_CATALOG[0].id);

  const suggestions = [
    t('suggestionSummarize'),
    t('suggestionEmail'),
    t('suggestionAnalyze'),
    t('suggestionSQL'),
  ];

  React.useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        content: t('welcomeMessage', { agentName: activeAgent.name, description: activeAgent.description }),
        createdAt: Date.now(),
      },
    ]);
  }, [activeAgent, t]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    setTimeout(() => {
      const reply = generateReply(content, activeAgent.name);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: reply, createdAt: Date.now() },
      ]);
      setIsStreaming(false);
    }, 900);
  }

  function handleSelectAgent(id: string) {
    const agent = AGENT_CATALOG.find((a) => a.id === id);
    if (!agent) return;
    setActiveAgent(agent);
    setSelectedAgentId(id);
  }

  return (
    <>
      <AppHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="flex flex-1 overflow-hidden">
        {/* Thread list */}
        <div className="hidden w-64 shrink-0 border-r bg-card/30 md:block">
          <div className="border-b p-4">
            <Button variant="outline" className="w-full justify-start">
              <Sparkles className="h-4 w-4" />
              {t('newConversation')}
            </Button>
          </div>
        </div>

        {/* Main chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b bg-card/50 p-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {AGENT_CATALOG.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    selectedAgentId === agent.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {agent.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} agent={activeAgent} />
              ))}
              {isStreaming && <TypingIndicator />}
            </div>
          </div>

          {/* Input area */}
          <div className="border-t bg-card/30 p-4">
            <div className="mx-auto max-w-3xl">
              {messages.length <= 1 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">{t('tryAsking')}</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('messagePlaceholder', { agentName: activeAgent.name })}
                  className="min-h-[40px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  rows={1}
                  disabled={isStreaming}
                />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isStreaming}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  {t('model')}: <span className="font-medium text-foreground">{activeAgent.model}</span>
                  <span className="mx-2">·</span>
                  {t('temperature')}: <span className="font-medium text-foreground">{activeAgent.temperature.toFixed(1)}</span>
                </span>
                <span>{t('pressEnterToSend')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right inspector */}
        <div className="hidden w-80 shrink-0 border-l bg-card/30 lg:block">
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold">{t('agentDetails')}</h3>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">{activeAgent.name}</div>
                <div className="text-xs text-muted-foreground">{activeAgent.description}</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{t('tools')}</div>
              <div className="flex flex-wrap gap-1.5">
                {activeAgent.tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="text-[10px]">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t('systemPrompt')}</div>
                <div className="line-clamp-5 font-mono text-xs text-muted-foreground">
                  {activeAgent.systemPrompt}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{t('runTrace')}</div>
              <div className="rounded-lg border bg-muted/40 p-3 font-mono text-[10px] text-muted-foreground">
                <div> start graph</div>
                <div className="text-emerald-500"> route: router_node</div>
                <div className="text-emerald-500"> tool: search_docs</div>
                <div className="text-emerald-500"> llm: inference</div>
                <div> end</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message, agent }: { message: ChatMessage; agent: Agent }) {
  const t = useTranslations('chat');
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex min-w-0 max-w-[80%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="text-xs text-muted-foreground">
          {isUser ? t('you') : agent.name} · {new Date(message.createdAt).toLocaleTimeString()}
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'border bg-card',
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  const t = useTranslations('chat');
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl border bg-card px-4 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.4s]" />
      </div>
      <span className="sr-only">{t('typing')}</span>
    </div>
  );
}

function generateReply(input: string, agentName: string) {
  const lower = input.toLowerCase();
  if (lower.includes('summar')) {
    return `Here's a quick summary from my research on your Q3 launch plan:\n\n• **Timeline**: Launch week of Oct 14\n• **Audience**: Mid-market SaaS operators\n• **Channels**: Product-led demo, LinkedIn ads, partner webinars\n• **Risks**: Marketing content pipeline is 2 weeks behind\n\nWant me to draft a mitigation plan for the content delay?`;
  }
  if (lower.includes('email') || lower.includes('outreach')) {
    return `Subject: Saw your Series B — loved what you're building\n\nHi there,\n\nI noticed your recent raise and was impressed by your focus on developer experience. We help 40+ Series B teams ship AI features 3× faster with pre-built agent templates.\n\nWould a 20-minute intro next week make sense?\n\nBest,\n${agentName}`;
  }
  if (lower.includes('sql') || lower.includes('query')) {
    return `Here's a query that gives monthly revenue by region:

\`\`\`sql
SELECT
  date_trunc('month', paid_at) AS month,
  region,
  SUM(amount) AS revenue
FROM subscriptions
WHERE status = 'paid'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
\`\`\`

Would you like me to add a YoY growth column?`;
  }
  return `That's a great question. As your ${agentName} agent, I'd approach this by breaking it down into three steps:

1. **Context gathering** — Pull the last 30 days of relevant data
2. **Synthesis** — Identify patterns or anomalies
3. **Recommendation** — Propose a concrete next action

Want me to dive deeper into any of these?`;
}