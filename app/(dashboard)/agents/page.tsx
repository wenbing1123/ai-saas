'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Plus, Search, MoreVertical, Play, Settings2, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppHeader } from '@/components/dashboard/AppShell';
import { AGENT_CATALOG } from '@/lib/mock-data';
import type { Agent } from '@/lib/types';

function StatusBadge({ status }: { status: Agent['status'] }) {
  const t = useTranslations('common');
  const variants: Record<Agent['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    active: 'default',
    archived: 'secondary',
  };

  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}

export default function AgentsPage() {
  const t = useTranslations('agents');
  const [search, setSearch] = React.useState('');
  const [localAgents, setLocalAgents] = React.useState<Agent[]>(AGENT_CATALOG);

  const filtered = localAgents.filter((agent) => {
    const q = search.toLowerCase();
    return agent.name.toLowerCase().includes(q) || agent.description.toLowerCase().includes(q);
  });

  const handleDelete = (id: string) => {
    setLocalAgents((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      <AppHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="flex items-center justify-between gap-4 p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('createAgent')}
        </Button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{t('noAgents')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('noAgentsDesc')}</p>
        </div>
      )}
    </>
  );
}

function AgentCard({ agent, onDelete }: { agent: Agent; onDelete: (id: string) => void }) {
  const t = useTranslations('agents');

  return (
    <Card className="flex flex-col transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <div className="mt-0.5">
                <StatusBadge status={agent.status} />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings2 className="mr-2 h-4 w-4" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(agent.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 mt-2">{agent.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div className="flex flex-wrap gap-1.5">
          {agent.tools.slice(0, 3).map((tool) => (
            <Badge key={tool} variant="secondary" className="text-[10px]">
              {tool}
            </Badge>
          ))}
          {agent.tools.length > 3 && (
            <Badge variant="secondary" className="text-[10px]">
              +{agent.tools.length - 3}
            </Badge>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            {agent.model} · Temp {agent.temperature.toFixed(1)}
          </div>
          <Button size="sm" variant="outline" className="h-7">
            <Play className="mr-1 h-3 w-3" />
            {t('run')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}