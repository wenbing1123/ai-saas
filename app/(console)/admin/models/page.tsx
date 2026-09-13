import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleModelButton } from '@/components/admin/ToggleModelButton';
import { requireAdmin } from '@/lib/server/auth';
import { listModels } from '@/lib/repositories/models';
import { formatPricePerM } from '@/lib/server/pricing';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { PROVIDER_LABELS, PROTOCOL_LABELS } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

export default async function AdminModelsPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const models = await listModels(false);

  return (
    <>
      <PageHeader
        title={a.models.title}
        subtitle={a.models.subtitle}
        action={
          <Button asChild>
            <Link href="/admin/models/new">
              <Plus className="mr-2 h-4 w-4" /> {a.models.addModel}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{a.models.table.model}</th>
                  <th className="py-2 pr-4 font-medium">{a.models.table.providerProtocol}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.models.table.costInOut}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.models.table.sellInOut}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.models.table.markup}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.common.misc.status}</th>
                  <th className="py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const inputMargin = m.sellInputPer1m > 0 ? ((m.sellInputPer1m - m.inputCostPer1m) / m.sellInputPer1m) * 100 : 0;
                  const profitable = m.sellInputPer1m >= m.inputCostPer1m && m.sellOutputPer1m >= m.outputCostPer1m;
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{m.displayName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{m.modelId}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{PROVIDER_LABELS[m.provider]}</Badge>
                        <span className="ml-2 text-xs text-muted-foreground">{PROTOCOL_LABELS[m.protocol]}</span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {formatPricePerM(m.inputCostPer1m)} / {formatPricePerM(m.outputCostPer1m)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums">
                        {formatPricePerM(m.sellInputPer1m)} / {formatPricePerM(m.sellOutputPer1m)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Badge variant={profitable ? 'secondary' : 'destructive'}>
                          {inputMargin.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <ToggleModelButton locale={locale} modelId={m.id} enabled={m.enabled} />
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/models/${m.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {models.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      {a.models.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
