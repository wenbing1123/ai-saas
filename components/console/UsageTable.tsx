import { Badge } from '@/components/ui/badge';
import type { UsageRecord } from '@/lib/types';
import { UsageStatus } from '@/lib/db/enums';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { formatRelativeTime } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export function UsageTable({ records }: { records: UsageRecord[] }) {
  const d = getDict(getLocale());
  const t = d.console.usageTable;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{t.colWhen}</th>
            <th className="py-2 pr-4 font-medium">{t.colModel}</th>
            <th className="py-2 pr-4 text-right font-medium">{t.colInOut}</th>
            <th className="py-2 pr-4 text-right font-medium">{t.colCost}</th>
            <th className="py-2 text-right font-medium">{d.common.misc.status}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-4 text-muted-foreground">{formatRelativeTime(r.createdAt)}</td>
              <td className="py-2 pr-4 font-mono text-xs">{r.modelId}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                {formatNumber(r.inputTokens)} / {formatNumber(r.outputTokens)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatUsd(r.chargeCents, { fractionDigits: 4 })}</td>
              <td className="py-2 text-right">
                <Badge variant={r.status === UsageStatus.Success ? 'secondary' : 'destructive'}>
                  {d.common.enums.usageStatus[r.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
