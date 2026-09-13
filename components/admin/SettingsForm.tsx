'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form';
import { updateSettingsAction } from '@/lib/server/actions/settings';
import type { ActionResult } from '@/lib/validators';
import type { PlatformSettings } from '@/lib/types';
import { getDict, type Locale } from '@/lib/i18n';
import { infraSurchargePer1m } from '@/lib/server/pricing';
import { PROVIDER_LABELS } from '@/lib/db/enums';

const PROVIDER_LABELS_LIST = Object.values(PROVIDER_LABELS);

export function SettingsForm({ locale, settings }: { locale: Locale; settings: PlatformSettings }) {
  const router = useRouter();
  const t = getDict(locale);
  const s = t.admin.settings;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult>({ ok: false });
  const [form, setForm] = useState<PlatformSettings>(settings);
  const [upstream, setUpstream] = useState<Record<string, { api_key: string; base_url: string }>>(
    settings.upstream_providers ?? {},
  );

  // Infra cost is edited in USD and persisted in cents.
  const infraUsd = form.infra_cost_per_month_cents / 100;
  const surcharge = infraSurchargePer1m(infraUsd, form.forecast_monthly_tokens_m);
  const exampleCost = 1;
  const exampleSell = (exampleCost + surcharge) * (1 + form.target_profit_percent / 100);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('min_markup_percent', String(form.min_markup_percent));
    fd.set('infra_cost_per_month_cents', String(Math.round(form.infra_cost_per_month_cents)));
    fd.set('forecast_monthly_tokens_m', String(form.forecast_monthly_tokens_m));
    fd.set('target_profit_percent', String(form.target_profit_percent));
    fd.set('default_rpm', String(form.default_rpm));
    fd.set('default_concurrency', String(form.default_concurrency));
    fd.set('low_balance_cents', String(form.low_balance_cents));
    if (form.maintenance_mode) fd.set('maintenance_mode', 'on');
    for (const label of PROVIDER_LABELS_LIST) {
      fd.set(`upstream_${label}_api_key`, upstream[label]?.api_key ?? '');
      fd.set(`upstream_${label}_base_url`, upstream[label]?.base_url ?? '');
    }
    startTransition(async () => {
      const res = await updateSettingsAction({ ok: false }, fd);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <FormError message={result.error} />
      {result.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {s.saved}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{s.pricingFormula}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={s.infraCost} hint={s.infraCostHint}>
            <Input type="number" min={0} step={1}
              value={infraUsd}
              onChange={(e) => setForm({ ...form, infra_cost_per_month_cents: Math.round(Number(e.target.value) * 100) })} />
          </Field>
          <Field label={s.forecastTokens} hint={s.forecastTokensHint}>
            <Input type="number" min={1} step={1}
              value={form.forecast_monthly_tokens_m}
              onChange={(e) => setForm({ ...form, forecast_monthly_tokens_m: Number(e.target.value) })} />
          </Field>
          <Field label={s.targetProfit} hint={s.targetProfitHint}>
            <Input type="number" min={0} max={100} step={1}
              value={form.target_profit_percent}
              onChange={(e) => setForm({ ...form, target_profit_percent: Number(e.target.value) })} />
          </Field>
          <Field label={s.minMarkup} hint={s.minMarkupHint}>
            <Input type="number" min={0} max={100} step={1}
              value={form.min_markup_percent}
              onChange={(e) => setForm({ ...form, min_markup_percent: Number(e.target.value) })} />
          </Field>
        </CardContent>
        <CardContent className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {s.formula}: ({s.exampleCostLabel} $1 + {s.infraShare} {surcharge > 0 ? `$${surcharge.toFixed(4)}` : '$0'}) × (1 + {form.target_profit_percent}%) = <span className="font-mono text-foreground">${exampleSell.toFixed(4)}</span> / 1M
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{s.costGuardrails}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={s.lowBalanceThreshold} hint={s.lowBalanceHint}>
            <Input type="number" min={1} step={10}
              value={form.low_balance_cents}
              onChange={(e) => setForm({ ...form, low_balance_cents: Number(e.target.value) })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{s.defaultRateLimits}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={s.requestsPerMinute}>
            <Input type="number" min={1}
              value={form.default_rpm}
              onChange={(e) => setForm({ ...form, default_rpm: Number(e.target.value) })} />
          </Field>
          <Field label={s.concurrentRequests}>
            <Input type="number" min={1}
              value={form.default_concurrency}
              onChange={(e) => setForm({ ...form, default_concurrency: Number(e.target.value) })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{s.operations}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={form.maintenance_mode}
              onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
            />
            <span>
              <span className="flex items-center gap-2 font-medium">
                {s.maintenanceMode}
                {form.maintenance_mode && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" /> {s.maintenanceWarn}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{s.maintenanceDesc}</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{s.upstream}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">{s.upstreamHint}</p>
          <div className="space-y-6">
            {PROVIDER_LABELS_LIST.map((label) => {
              const cfg = upstream[label] ?? { api_key: '', base_url: '' };
              return (
                <div key={label} className="grid gap-4 sm:grid-cols-2">
                  <Field label={`${label.toUpperCase()} · ${s.upstreamApiKey}`} hint={s.upstreamApiKeyHint}>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={cfg.api_key}
                      onChange={(e) =>
                        setUpstream((prev) => ({
                          ...prev,
                          [label]: { ...prev[label], api_key: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={`${label.toUpperCase()} · ${s.upstreamBaseUrl}`} hint={s.upstreamBaseUrlHint}>
                    <Input
                      value={cfg.base_url}
                      placeholder={`https://api.${label}.com/v1`}
                      onChange={(e) =>
                        setUpstream((prev) => ({
                          ...prev,
                          [label]: { ...prev[label], base_url: e.target.value },
                        }))
                      }
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {s.save}
      </Button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
