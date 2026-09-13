'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/ui/form';
import type { ActionResult } from '@/lib/validators';
import type { Plan } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getDict, type Locale } from '@/lib/i18n';

type PlanAction = (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const blank: Plan = {
  id: '',
  slug: '',
  name: '',
  description: '',
  priceCents: 0,
  creditCents: 0,
  validDays: 30,
  rateLimitRpm: 30,
  maxConcurrency: 3,
  allowedModelIds: [],
  features: [],
  highlighted: false,
  active: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export interface PlanFormModelOption {
  id: string;
  label: string;
}

/** Initial Chinese override values (features pre-joined with newlines). */
export interface PlanFormZh {
  name?: string;
  description?: string;
  featuresText?: string;
}

export function PlanForm({
  locale,
  mode,
  plan,
  zh,
  models,
  action,
}: {
  locale: Locale;
  mode: 'create' | 'edit';
  plan?: Plan;
  zh?: PlanFormZh;
  models: PlanFormModelOption[];
  action: PlanAction;
}) {
  const router = useRouter();
  const t = getDict(locale);
  const fp = t.admin.forms.plan;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult>({ ok: false });
  const [p, setP] = useState<Plan>(plan ?? blank);
  const set = <K extends keyof Plan>(key: K, value: Plan[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const [zhName, setZhName] = useState(zh?.name ?? '');
  const [zhDescription, setZhDescription] = useState(zh?.description ?? '');
  const [zhFeaturesText, setZhFeaturesText] = useState(zh?.featuresText ?? '');

  const price = p.priceCents / 100;
  const credit = p.creditCents / 100;
  const bonusPct = price > 0 ? ((credit - price) / price) * 100 : 0;
  const bonusTooHigh = credit > price * 2;

  function toggleModel(id: string) {
    set(
      'allowedModelIds',
      p.allowedModelIds.includes(id)
        ? p.allowedModelIds.filter((x) => x !== id)
        : [...p.allowedModelIds, id],
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult({ ok: false });
    const fd = new FormData();
    fd.set('slug', p.slug);
    fd.set('name', p.name);
    if (p.description) fd.set('description', p.description);
    fd.set('priceDollars', String(price));
    fd.set('creditDollars', String(credit));
    fd.set('validDays', String(p.validDays));
    fd.set('rateLimitRpm', String(p.rateLimitRpm));
    fd.set('maxConcurrency', String(p.maxConcurrency));
    fd.set('featuresText', p.features.join('\n'));
    if (p.highlighted) fd.set('highlighted', 'on');
    if (p.active) fd.set('active', 'on');
    fd.set('sortOrder', String(p.sortOrder));
    if (zhName.trim()) fd.set('zhName', zhName);
    if (zhDescription.trim()) fd.set('zhDescription', zhDescription);
    if (zhFeaturesText.trim()) fd.set('zhFeaturesText', zhFeaturesText);
    for (const id of p.allowedModelIds) fd.append('allowedModel', id);

    startTransition(async () => {
      const res = await action({ ok: false }, fd);
      setResult(res);
      if (res.ok) {
        if (mode === 'create') router.push('/admin/plans');
        else router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {result.error && <FormError message={result.error} />}
      {result.ok && mode === 'edit' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {t.admin.forms.saved}
        </div>
      )}

      <Section title={fp.basics}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Shell label={fp.name} error={result.fieldErrors?.name}>
            <Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder={fp.namePlaceholder} required />
          </Shell>
          <Shell label={fp.slug} error={result.fieldErrors?.slug}>
            <Input value={p.slug} onChange={(e) => set('slug', e.target.value)} placeholder="builder" required />
          </Shell>
          <Shell label={fp.sortOrder}>
            <Input type="number" value={p.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
          </Shell>
          <div className="sm:col-span-2 lg:col-span-3">
            <Shell label={fp.description}>
              <Textarea rows={2} value={p.description ?? ''} onChange={(e) => set('description', e.target.value)}
                placeholder={fp.descriptionPlaceholder} />
            </Shell>
          </div>
        </div>
      </Section>

      <Section title={fp.priceCredit}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Shell label={fp.salePrice}>
            <Input type="number" min={0} step={0.01} value={price} onChange={(e) => set('priceCents', Math.round(Number(e.target.value) * 100))} />
          </Shell>
          <Shell label={fp.grantedCredit}>
            <Input type="number" min={0} step={0.01} value={credit} onChange={(e) => set('creditCents', Math.round(Number(e.target.value) * 100))} />
          </Shell>
          <Shell label={fp.validDays}>
            <Input type="number" min={1} value={p.validDays} onChange={(e) => set('validDays', Number(e.target.value))} />
          </Shell>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{fp.bonusCredit}</Label>
            <div className={cn(
              'flex h-10 items-center rounded-md border px-3 text-sm tabular-nums',
              bonusTooHigh ? 'border-destructive bg-destructive/10 text-destructive' : 'text-emerald-600 dark:text-emerald-400',
            )}>
              {bonusPct >= 0 ? '+' : ''}{bonusPct.toFixed(0)}%
            </div>
            {bonusTooHigh && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> {fp.bonusCapped}
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title={fp.rateLimits}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Shell label={fp.requestsPerMinute}>
            <Input type="number" min={1} value={p.rateLimitRpm} onChange={(e) => set('rateLimitRpm', Number(e.target.value))} />
          </Shell>
          <Shell label={fp.maxConcurrent}>
            <Input type="number" min={1} value={p.maxConcurrency} onChange={(e) => set('maxConcurrency', Number(e.target.value))} />
          </Shell>
        </div>
      </Section>

      <Section title={fp.allowedModels}>
        <p className="mb-3 text-sm text-muted-foreground">{fp.allowedModelsHint}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={p.allowedModelIds.includes(m.id)}
                onChange={() => toggleModel(m.id)}
              />
              {m.label}
            </label>
          ))}
          {models.length === 0 && <p className="text-sm text-muted-foreground">{fp.createModelsFirst}</p>}
        </div>
      </Section>

      <Section title={fp.landingFeatures}>
        <Textarea rows={5} value={p.features.join('\n')} onChange={(e) => set('features', e.target.value.split('\n'))}
          placeholder={fp.featuresPlaceholder} />
      </Section>

      <Section title={fp.translationsZh}>
        <p className="mb-3 text-sm text-muted-foreground">{fp.translationsZhHint}</p>
        <div className="grid gap-4">
          <Shell label={fp.zhName}>
            <Input value={zhName} onChange={(e) => setZhName(e.target.value)} placeholder={fp.zhNamePlaceholder} />
          </Shell>
          <Shell label={fp.zhDescription}>
            <Textarea rows={2} value={zhDescription} onChange={(e) => setZhDescription(e.target.value)} />
          </Shell>
          <Shell label={fp.zhFeatures}>
            <Textarea
              rows={5}
              value={zhFeaturesText}
              onChange={(e) => setZhFeaturesText(e.target.value)}
              placeholder={fp.featuresPlaceholder}
            />
          </Shell>
        </div>
      </Section>

      <Section title={fp.visibility}>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={p.highlighted}
              onChange={(e) => set('highlighted', e.target.checked)} />
            {fp.highlighted}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={p.active}
              onChange={(e) => set('active', e.target.checked)} />
            {fp.activePurchasable}
          </label>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || bonusTooHigh}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? fp.create : t.admin.forms.saveChanges}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/plans')}>
          {t.admin.forms.cancel}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Shell({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
