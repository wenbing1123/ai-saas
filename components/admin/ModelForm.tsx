'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check as CheckIcon, Copy, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { apiPostForm, apiPostJson, apiPutForm } from '@/lib/client/api';
import { type ApiResponse, fieldErrorsOf, initialApiResponse } from '@/lib/server/api-response';
import type { Model } from '@/lib/types';
import {
  recommendSellPrices,
  validatePricing,
  marginPct,
  savingsPct,
  addSurcharge,
} from '@/lib/server/pricing';
import { cn } from '@/lib/utils';
import { getDict, type Locale } from '@/lib/i18n';
import { PROVIDER_LABELS, Protocol, supportsProtocol, CURRENCY_CODES, CURRENCY_LABELS, CURRENCY_SYMBOLS, Currency } from '@/lib/db/enums';

type ApiMethod = 'POST' | 'PUT';

const PROVIDERS = ['deepseek', 'zhipu', 'doubao', 'alibaba', 'moonshot', 'openai', 'anthropic', 'google', 'azure', 'custom'];

/** Form state keeps wire labels (strings); the repository maps them to enum codes. */
type ModelFormState = Omit<Model, 'provider' | 'protocols' | 'costCurrency' | 'upstreamApiKey' | 'contextWindow'> & {
  provider: string;
  protocolOpenai: boolean;
  protocolAnthropic: boolean;
  costCurrency: string;
  upstreamApiKey: string;
  /** Context window entered in millions of tokens (0.128 = 128K). */
  contextWindowM: number;
};

/** Compact price display: up to 4 decimals, trailing zeros trimmed (11.6560 → 11.656). */
function fmtNum(v: number): string {
  return String(Number(v.toFixed(4)));
}

const initialForm: ModelFormState = {
  id: '',
  provider: 'deepseek',
  protocolOpenai: true,
  protocolAnthropic: false,
  costCurrency: 'rmb',
  modelId: '',
  upstreamModel: '',
  upstreamApiKey: '',
  baseUrl: '',
  displayName: '',
  contextWindowM: 0.128,
  maxOutputTokens: 4096,
  supportsVision: false,
  supportsTools: true,
  supportsReasoning: false,
  inputCostPer1m: 0,
  outputCostPer1m: 0,
  cacheReadCostPer1m: 0,
  cacheWriteCostPer1m: 0,
  retailInputPer1m: 0,
  retailOutputPer1m: 0,
  markupPercent: 0,
  sellInputPer1m: 0,
  sellOutputPer1m: 0,
  sellCacheReadPer1m: 0,
  sellCacheWritePer1m: 0,
  enabled: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function ModelForm({
  locale,
  mode,
  model,
  infraSurcharge,
  targetProfit,
  forexRate,
  endpoint,
  method = 'POST',
}: {
  locale: Locale;
  mode: 'create' | 'edit';
  model?: Model;
  /** Amortized infra cost per 1M tokens in USD, from platform settings. */
  infraSurcharge: number;
  /** Target profit % guaranteed on top of (cost + infra). */
  targetProfit: number;
  /** RMB per USD exchange rate, used to express the infra surcharge in RMB. */
  forexRate: number;
  /** REST endpoint the form submits to. */
  endpoint: string;
  method?: ApiMethod;
}) {
  const router = useRouter();
  const t = getDict(locale);
  const fm = t.admin.forms.model;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiResponse>(initialApiResponse());
  const [autoPrices, setAutoPrices] = useState(mode === 'create');
  const [revealOpen, setRevealOpen] = useState(false);
  // The secret is never echoed into form state; edit keeps it unless re-entered.
  const hasUpstreamKey = !!model?.upstreamApiKey;

  const [f, setF] = useState<ModelFormState>(
    model
      ? {
          ...model,
          provider: PROVIDER_LABELS[model.provider],
          protocolOpenai: supportsProtocol(model.protocols, Protocol.OpenAI),
          protocolAnthropic: supportsProtocol(model.protocols, Protocol.Anthropic),
          costCurrency: CURRENCY_LABELS[model.costCurrency].toLowerCase(),
          upstreamApiKey: '',
          contextWindowM: model.contextWindow / 1_000_000,
        }
      : { ...initialForm, markupPercent: targetProfit },
  );
  const set = <K extends keyof ModelFormState>(key: K, value: ModelFormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: keyof ModelFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  const sym = CURRENCY_SYMBOLS[CURRENCY_CODES[f.costCurrency] ?? Currency.USD] ?? '$';
  // Infra surcharge is denominated in USD; express it in the model's native
  // currency before adding it. RMB uses the full (unbuffered) rate, which
  // slightly over-covers the infra cost after the billing-side buffer.
  const nativeSurcharge = f.costCurrency === 'rmb' ? infraSurcharge * forexRate : infraSurcharge;

  const recommended = recommendSellPrices({
    inputCostPer1m: f.inputCostPer1m,
    outputCostPer1m: f.outputCostPer1m,
    cacheReadCostPer1m: f.cacheReadCostPer1m,
    cacheWriteCostPer1m: f.cacheWriteCostPer1m,
    markupPercent: f.markupPercent || targetProfit,
    infraSurchargePer1m: nativeSurcharge,
  });

  const sell = autoPrices
    ? recommended
    : {
        input: f.sellInputPer1m,
        output: f.sellOutputPer1m,
        cacheRead: f.sellCacheReadPer1m,
        cacheWrite: f.sellCacheWritePer1m,
      };

  // Profit is guaranteed on top of the fully-loaded cost (model + infra).
  const effectiveCost = addSurcharge(
    {
      input: f.inputCostPer1m,
      output: f.outputCostPer1m,
      cacheRead: f.cacheReadCostPer1m,
      cacheWrite: f.cacheWriteCostPer1m,
    },
    nativeSurcharge,
  );

  const violations = validatePricing(effectiveCost, sell, targetProfit);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(initialApiResponse());
    const fd = new FormData();
    const append = (k: string, v: string | number) => fd.set(k, String(v));
    append('provider', f.provider);
    if (f.protocolOpenai) fd.set('protocolOpenai', 'on');
    if (f.protocolAnthropic) fd.set('protocolAnthropic', 'on');
    append('costCurrency', f.costCurrency);
    append('modelId', f.modelId);
    append('upstreamModel', f.upstreamModel);
    append('upstreamApiKey', f.upstreamApiKey);
    if (f.baseUrl) fd.set('baseUrl', f.baseUrl);
    append('displayName', f.displayName);
    append('contextWindow', Math.round(f.contextWindowM * 1_000_000));
    append('maxOutputTokens', f.maxOutputTokens);
    if (f.supportsVision) fd.set('supportsVision', 'on');
    if (f.supportsTools) fd.set('supportsTools', 'on');
    if (f.supportsReasoning) fd.set('supportsReasoning', 'on');
    append('inputCostPer1m', f.inputCostPer1m);
    append('outputCostPer1m', f.outputCostPer1m);
    append('cacheReadCostPer1m', f.cacheReadCostPer1m);
    append('cacheWriteCostPer1m', f.cacheWriteCostPer1m);
    append('retailInputPer1m', f.retailInputPer1m);
    append('retailOutputPer1m', f.retailOutputPer1m);
    append('markupPercent', f.markupPercent);
    append('sellInputPer1m', sell.input);
    append('sellOutputPer1m', sell.output);
    append('sellCacheReadPer1m', sell.cacheRead);
    append('sellCacheWritePer1m', sell.cacheWrite);
    if (f.enabled) fd.set('enabled', 'on');
    if (autoPrices) fd.set('autoPrices', 'on');
    append('sortOrder', f.sortOrder);

    startTransition(async () => {
      const res =
        method === 'PUT'
          ? await apiPutForm(endpoint, fd)
          : await apiPostForm(endpoint, fd);
      setResult(res);
      if (res.code === '0000') {
        toast.success(t.admin.forms.saved);
        if (mode === 'create') router.push('/admin/models');
        else router.refresh();
      } else {
        toast.error(res.msg);
      }
    });
  }

  return (
    <>
    <form onSubmit={submit} className="space-y-6">
      {violations.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" /> {fm.pricingGuardrails}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-destructive">
            {violations.map((v) => (
              <li key={`${v.field}-${v.code}`}>
                {v.code === 'below_cost'
                  ? fm.violationBelowCost(fm[v.field], sym, fmtNum(v.sell), fmtNum(v.cost))
                  : fm.violationBelowMargin(fm[v.field], sym, v.minMarkupPercent, fmtNum(v.floor))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title={fm.identityRouting}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Text label={fm.publicModelId} name="modelId" required value={f.modelId}
            onChange={(e) => set('modelId', e.target.value)}
            error={fieldErrorsOf(result)?.modelId}
            placeholder="claude-sonnet-4-20250514"
            hint={fm.publicModelIdHint} />
          <Text label={fm.displayName} name="displayName" required value={f.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            error={fieldErrorsOf(result)?.displayName} placeholder="Claude Sonnet 4" />
          <Select label={fm.provider} name="provider" value={f.provider} onChange={(e) => set('provider', e.target.value)} options={PROVIDERS} />
          <FieldShell label={fm.protocols} hint={fm.protocolsHint} error={fieldErrorsOf(result)?.protocols}>
            <div className="flex items-center gap-6 pb-2 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={f.protocolOpenai}
                  onChange={(e) => set('protocolOpenai', e.target.checked)}
                />
                openai
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={f.protocolAnthropic}
                  onChange={(e) => set('protocolAnthropic', e.target.checked)}
                />
                anthropic
              </label>
            </div>
          </FieldShell>
          <Select
            label={fm.costCurrency}
            name="costCurrency"
            value={f.costCurrency}
            onChange={(e) => set('costCurrency', e.target.value)}
            options={['rmb', 'usd']}
          />
          <Text label={fm.upstreamModel} name="upstreamModel" required value={f.upstreamModel}
            onChange={(e) => set('upstreamModel', e.target.value)}
            error={fieldErrorsOf(result)?.upstreamModel}
            placeholder="claude-sonnet-4-20250514"
            hint={fm.upstreamModelHint} />
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Text label={fm.upstreamApiKey} name="upstreamApiKey" value={f.upstreamApiKey}
                onChange={(e) => set('upstreamApiKey', e.target.value)}
                placeholder={mode === 'edit' && hasUpstreamKey ? fm.upstreamKeyConfigured : 'sk-…'}
                hint={mode === 'edit' && hasUpstreamKey ? fm.upstreamApiKeyHintEdit : fm.upstreamApiKeyHint} />
            </div>
            {mode === 'edit' && hasUpstreamKey && (
              <Button type="button" variant="outline" className="mt-[22px]" onClick={() => setRevealOpen(true)}>
                <Eye className="mr-1 h-3.5 w-3.5" /> {fm.reveal}
              </Button>
            )}
          </div>
          <Text label={fm.baseUrlOverride} name="baseUrl" value={f.baseUrl ?? ''}
            onChange={(e) => set('baseUrl', e.target.value)}
            error={fieldErrorsOf(result)?.baseUrl}
            placeholder={fm.baseUrlPlaceholder} />
        </div>
      </Section>

      <Section title={fm.capabilities}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Num label={`${fm.contextWindow} (M)`} name="contextWindow" value={f.contextWindowM} onChange={setNum('contextWindowM')} step={0.001} hint={fm.contextWindowMHint} />
          <Num label={fm.maxOutputTokens} name="maxOutputTokens" value={f.maxOutputTokens} onChange={setNum('maxOutputTokens')} step={256} />
          <Num label={fm.sortOrder} name="sortOrder" value={f.sortOrder} onChange={setNum('sortOrder')} step={1} />
          <Check label={fm.vision} checked={f.supportsVision} onChange={(v) => set('supportsVision', v)} />
          <Check label={fm.tools} checked={f.supportsTools} onChange={(v) => set('supportsTools', v)} />
          <Check label={fm.reasoning} checked={f.supportsReasoning} onChange={(v) => set('supportsReasoning', v)} />
        </div>
      </Section>

      <Section title={`${fm.procurementCost} · ${sym} (${f.costCurrency.toUpperCase()})`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label={fm.inputCost} name="inputCostPer1m" value={f.inputCostPer1m} onChange={setNum('inputCostPer1m')} step={0.01} />
          <Num label={fm.outputCost} name="outputCostPer1m" value={f.outputCostPer1m} onChange={setNum('outputCostPer1m')} step={0.01} />
          <Num label={fm.cacheReadCost} name="cacheReadCostPer1m" value={f.cacheReadCostPer1m} onChange={setNum('cacheReadCostPer1m')} step={0.01} />
          <Num label={fm.cacheWriteCost} name="cacheWriteCostPer1m" value={f.cacheWriteCostPer1m} onChange={setNum('cacheWriteCostPer1m')} step={0.01} />
        </div>
      </Section>

      <Section title={fm.retailPrice}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label={fm.retailInput} name="retailInputPer1m" value={f.retailInputPer1m} onChange={setNum('retailInputPer1m')} step={0.01} />
          <Num label={fm.retailOutput} name="retailOutputPer1m" value={f.retailOutputPer1m} onChange={setNum('retailOutputPer1m')} step={0.01} />
        </div>
      </Section>

      <Section title={fm.resalePrice}>
        <div className="mb-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={autoPrices}
              onChange={(e) => setAutoPrices(e.target.checked)}
            />
            {fm.autoCalc}
          </label>
          <div className="w-48">
            <Num label={fm.markupPct(targetProfit)} name="markupPercent" value={f.markupPercent} onChange={setNum('markupPercent')} step={1} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">{fm.tier}</th>
                <th className="px-4 py-2 text-right font-medium">{fm.costPer1m}</th>
                <th className="px-4 py-2 text-right font-medium">{fm.sellPer1m}</th>
                <th className="px-4 py-2 text-right font-medium">{fm.margin}</th>
                <th className="px-4 py-2 text-right font-medium">{fm.vsRetail}</th>
              </tr>
            </thead>
            <tbody>
              <PriceRow label={fm.input} sym={sym} cost={f.inputCostPer1m} effective={effectiveCost.input} sell={sell.input} retail={f.retailInputPer1m}
                readOnly={autoPrices} loss={fm.loss} saveLabel={fm.save}
                onSellChange={(v) => set('sellInputPer1m', v)} />
              <PriceRow label={fm.output} sym={sym} cost={f.outputCostPer1m} effective={effectiveCost.output} sell={sell.output} retail={f.retailOutputPer1m}
                readOnly={autoPrices} loss={fm.loss} saveLabel={fm.save}
                onSellChange={(v) => set('sellOutputPer1m', v)} />
              <PriceRow label={fm.cacheRead} sym={sym} cost={f.cacheReadCostPer1m} effective={effectiveCost.cacheRead} sell={sell.cacheRead} readOnly={autoPrices}
                loss={fm.loss} saveLabel={fm.save}
                onSellChange={(v) => set('sellCacheReadPer1m', v)} />
              <PriceRow label={fm.cacheWrite} sym={sym} cost={f.cacheWriteCostPer1m} effective={effectiveCost.cacheWrite} sell={sell.cacheWrite} readOnly={autoPrices}
                loss={fm.loss} saveLabel={fm.save}
                onSellChange={(v) => set('sellCacheWritePer1m', v)} />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={fm.visibility}>
        <div className="flex flex-wrap items-center gap-6">
          <Check label={fm.published} checked={f.enabled} onChange={(v) => set('enabled', v)} />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || violations.length > 0}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? fm.create : t.admin.forms.saveChanges}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/models')}>
          {t.admin.forms.cancel}
        </Button>
      </div>
    </form>

    {mode === 'edit' && hasUpstreamKey && (
      <RevealKeyDialog
        locale={locale}
        endpoint={`/api/admin/models/${model.id}/secret`}
        open={revealOpen}
        onClose={() => setRevealOpen(false)}
      />
    )}
    </>
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

function FieldShell({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
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

function Text(props: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <FieldShell label={props.label} hint={props.hint} error={props.error}>
      <Input
        name={props.name}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        required={props.required}
      />
    </FieldShell>
  );
}

function Num(props: {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <FieldShell label={props.label} hint={props.hint}>
      <Input
        type="number"
        name={props.name}
        step={props.step ?? 0.01}
        min={0}
        value={props.value}
        onChange={props.onChange}
      />
    </FieldShell>
  );
}

function Select(props: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <FieldShell label={props.label}>
      <select
        name={props.name}
        value={props.value}
        onChange={props.onChange}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {props.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </FieldShell>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-end pb-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    </div>
  );
}

function PriceRow({
  label,
  sym,
  cost,
  effective,
  sell,
  retail,
  readOnly,
  loss,
  saveLabel,
  onSellChange,
}: {
  label: string;
  /** Native currency symbol for this model ($ / ¥). */
  sym: string;
  cost: number;
  /** Fully-loaded cost (model procurement + amortized infra). */
  effective: number;
  sell: number;
  retail?: number;
  readOnly: boolean;
  loss: string;
  saveLabel: (pct: string) => string;
  onSellChange: (v: number) => void;
}) {
  const m = effective > 0 ? marginPct(effective, sell) : sell > 0 ? 100 : 0;
  const belowFloor = sell < effective;
  const saving = retail ? savingsPct(retail, sell) : 0;
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 font-medium">{label}</td>
      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {sym}{fmtNum(cost)}
        {effective > cost && (
          <span className="ml-1 opacity-70">(+{sym}{fmtNum(effective - cost)})</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <input
          type="number"
          min={0}
          step={0.0001}
          value={Number(sell.toFixed(4))}
          disabled={readOnly}
          onChange={(e) => onSellChange(Number(e.target.value))}
          className={cn(
            'h-8 w-32 rounded-md border border-input bg-background px-2 text-right font-mono text-xs tabular-nums disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-80',
            belowFloor && 'border-destructive focus-visible:ring-destructive',
          )}
        />
      </td>
      <td className={cn('px-4 py-2.5 text-right text-xs tabular-nums', belowFloor ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
        {belowFloor ? loss : `+${m.toFixed(1)}%`}
      </td>
      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
        {retail ? saveLabel(saving.toFixed(0)) : '—'}
      </td>
    </tr>
  );
}

/** Step-up auth dialog: re-enter the admin login password to reveal the stored upstream key. */
function RevealKeyDialog({
  locale,
  endpoint,
  open,
  onClose,
}: {
  locale: Locale;
  endpoint: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = getDict(locale);
  const fm = t.admin.forms.model;
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  function close() {
    setPassword('');
    setSecret(null);
    setCopied(false);
    onClose();
  }

  async function confirm() {
    if (!password || pending) return;
    setPending(true);
    try {
      const res = await apiPostJson<{ secret: string }>(endpoint, { password });
      if (res.code === '0000' && res.data?.secret) {
        setSecret(res.data.secret);
      } else {
        toast.error(res.msg);
      }
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <CardTitle className="text-sm font-semibold">{fm.revealTitle}</CardTitle>
        {secret ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs">{secret}</code>
              <button
                type="button"
                onClick={copy}
                aria-label="copy"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={close}>{t.admin.forms.cancel}</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs font-medium">{fm.revealPasswordLabel}</Label>
            <Input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirm();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">{fm.revealPasswordHint}</p>
            <div className="flex gap-2 pt-2">
              <Button type="button" disabled={pending || !password} onClick={confirm}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {fm.reveal}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>{t.admin.forms.cancel}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
