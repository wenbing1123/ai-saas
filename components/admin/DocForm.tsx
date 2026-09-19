'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PencilLine, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form';
import { apiPostForm, apiPutForm } from '@/lib/client/api';
import { type ApiResponse, fieldErrorsOf, initialApiResponse } from '@/lib/server/api-response';
import type { DocPageRow } from '@/lib/db/schema';
import { renderMarkdown } from '@/lib/server/markdown';
import { gatewayBaseUrl } from '@/config/app';
import { DOC_LOCALE_LABELS } from '@/lib/db/enums';
import { cn } from '@/lib/utils';
import { getDict, type Locale } from '@/lib/i18n';

interface DocFormState {
  slug: string;
  locale: 'en' | 'zh';
  title: string;
  category: string;
  sortOrder: number;
  enabled: boolean;
  content: string;
}

const initialForm: DocFormState = {
  slug: '',
  locale: 'en',
  title: '',
  category: '',
  sortOrder: 100,
  enabled: true,
  content: '',
};

export function DocForm({
  locale,
  mode,
  doc,
  endpoint,
  method = 'POST',
}: {
  locale: Locale;
  mode: 'create' | 'edit';
  doc?: DocPageRow;
  endpoint: string;
  method?: 'POST' | 'PUT';
}) {
  const router = useRouter();
  const t = getDict(locale);
  const cms = t.admin.docsCms;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiResponse>(initialApiResponse());
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [f, setF] = useState<DocFormState>(
    doc
      ? {
          slug: doc.slug,
          locale: DOC_LOCALE_LABELS[doc.locale],
          title: doc.title,
          category: doc.category,
          sortOrder: doc.sortOrder,
          enabled: doc.enabled,
          content: doc.content,
        }
      : { ...initialForm, locale },
  );

  const previewHtml = renderMarkdown(f.content.replaceAll('{{base_url}}', gatewayBaseUrl()));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(initialApiResponse());
    const fd = new FormData();
    fd.set('slug', f.slug);
    fd.set('locale', f.locale);
    fd.set('title', f.title);
    fd.set('category', f.category);
    fd.set('sortOrder', String(f.sortOrder));
    fd.set('content', f.content);
    if (f.enabled) fd.set('enabled', 'on');

    startTransition(async () => {
      const res =
        method === 'PUT'
          ? await apiPutForm(endpoint, fd)
          : await apiPostForm(endpoint, fd);
      setResult(res);
      if (res.code === '0000') {
        if (mode === 'create') router.push('/admin/docs');
        else router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {result.code === '0000' && mode === 'edit' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {cms.saved}
        </div>
      )}
      <FormError message={result.msg} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{cms.table.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={cms.form.slug} hint={cms.form.slugHint} error={fieldErrorsOf(result)?.slug}>
            <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="claude-code" required />
          </Field>
          <Field label={cms.form.locale} error={fieldErrorsOf(result)?.locale}>
            <select
              value={f.locale}
              onChange={(e) => setF({ ...f, locale: e.target.value as 'en' | 'zh' })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </Field>
          <Field label={cms.form.title} error={fieldErrorsOf(result)?.title}>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
          </Field>
          <Field label={cms.form.category} hint={cms.form.categoryHint} error={fieldErrorsOf(result)?.category}>
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} required />
          </Field>
          <Field label={cms.form.sort} error={fieldErrorsOf(result)?.sortOrder}>
            <Input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={f.enabled}
                onChange={(e) => setF({ ...f, enabled: e.target.checked })}
              />
              {cms.form.published}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">{cms.form.content}</CardTitle>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setTab('write')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                tab === 'write' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <PencilLine className="h-3.5 w-3.5" /> {cms.form.write}
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                tab === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <Eye className="h-3.5 w-3.5" /> {cms.form.preview}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {fieldErrorsOf(result)?.content && <p className="mb-2 text-xs text-destructive">{fieldErrorsOf(result)?.content}</p>}
          <p className="mb-2 text-xs text-muted-foreground">{cms.form.contentHint}</p>
          {tab === 'write' ? (
            <textarea
              value={f.content}
              onChange={(e) => setF({ ...f, content: e.target.value })}
              spellCheck={false}
              className="h-[560px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed"
              required
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border bg-background p-5">
              <div className="docs-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? cms.create : t.admin.forms.saveChanges}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/docs')}>
          {t.admin.forms.cancel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
