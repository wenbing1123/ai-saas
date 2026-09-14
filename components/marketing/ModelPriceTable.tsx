import { Badge } from '@/components/ui/badge';
import { formatPricePerM, formatNumber, convertToUsd } from '@/lib/server/pricing';
import { getDict } from '@/lib/i18n';
import { PROVIDER_LABELS } from '@/lib/db/enums';
import type { Locale } from '@/lib/i18n/types';
import type { marketingEn } from '@/lib/i18n/dict-marketing';
import type { Model } from '@/lib/types';

export function ModelPriceTable({
  models,
  locale = 'en',
  t,
  forexRate,
  forexBuffer = 0,
}: {
  models: Model[];
  locale?: Locale;
  t?: typeof marketingEn;
  /** RMB-per-USD rate; when provided, RMB sell prices are converted to USD. */
  forexRate?: number;
  forexBuffer?: number;
}) {
  const dict = t ?? getDict(locale).marketing;
  // Customers are billed in USD, so the public table always shows USD.
  // RMB sell prices are converted with the same buffered rate used at billing.
  const toUsd = (m: Model, v: number) =>
    forexRate ? convertToUsd(v, m.costCurrency, forexRate, forexBuffer) : v;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">{dict.pricingTable.model}</th>
            <th className="px-4 py-3 font-medium">{dict.pricingTable.provider}</th>
            <th className="px-4 py-3 text-right font-medium">{dict.pricingTable.context}</th>
            <th className="px-4 py-3 text-right font-medium">{dict.pricingTable.inputPer1m}</th>
            <th className="px-4 py-3 text-right font-medium">{dict.pricingTable.outputPer1m}</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="font-medium">{m.displayName}</div>
                <div className="font-mono text-xs text-muted-foreground">{m.modelId}</div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="capitalize">
                  {PROVIDER_LABELS[m.provider]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {m.contextWindow ? `${formatNumber(Math.round(m.contextWindow / 1000))}K` : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatPricePerM(toUsd(m, m.sellInputPer1m))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatPricePerM(toUsd(m, m.sellOutputPer1m))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
