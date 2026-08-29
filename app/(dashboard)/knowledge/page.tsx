'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Upload, Plus, Search, MoreVertical, Trash2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppHeader } from '@/components/dashboard/AppShell';
import { KNOWLEDGE_SOURCES } from '@/lib/mock-data';
import type { KnowledgeSource } from '@/lib/types';

function StatusBadge({ status }: { status: KnowledgeSource['status'] }) {
  const t = useTranslations('common');
  const variants: Record<KnowledgeSource['status'], 'default' | 'secondary' | 'destructive'> = {
    processing: 'secondary',
    ready: 'default',
    error: 'destructive',
  };
  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}

export default function KnowledgePage() {
  const t = useTranslations('knowledge');
  const [search, setSearch] = React.useState('');
  const [sources, setSources] = React.useState<KnowledgeSource[]>(KNOWLEDGE_SOURCES);

  const filtered = sources.filter((s) => {
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
  });

  const handleDelete = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
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
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {t('uploadFile')}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('createSource')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {filtered.map((source) => (
          <SourceCard key={source.id} source={source} onDelete={handleDelete} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{t('noSources')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('noSourcesDesc')}</p>
        </div>
      )}
    </>
  );
}

function SourceCard({ source, onDelete }: { source: KnowledgeSource; onDelete: (id: string) => void }) {
  const t = useTranslations('knowledge');

  const fileTypeColors: Record<string, string> = {
    pdf: 'bg-red-500/10 text-red-500',
    docx: 'bg-blue-500/10 text-blue-500',
    csv: 'bg-emerald-500/10 text-emerald-500',
    url: 'bg-purple-500/10 text-purple-500',
    markdown: 'bg-slate-500/10 text-slate-500',
  };

  return (
    <Card className="flex flex-col transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${fileTypeColors[source.type] ?? 'bg-muted text-muted-foreground'}`}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{source.title}</CardTitle>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {source.type}
                </Badge>
                <StatusBadge status={source.status} />
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
                <Eye className="mr-2 h-4 w-4" />
                {t('preview')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                {t('download')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(source.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="mt-2">
          {t('chunksCount', { count: source.chunks })} · {t('tokensCount', { count: source.tokens.toLocaleString() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {source.status === 'processing' && (
          <div className="space-y-1">
            <Progress value={source.progress} />
            <div className="text-xs text-muted-foreground">{t('processingProgress', { progress: source.progress })}</div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{t('lastUpdated', { date: new Date(source.updatedAt).toLocaleDateString() })}</span>
        </div>
      </CardContent>
    </Card>
  );
}