import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/server/auth';
import { listPlans } from '@/lib/repositories/plans';
import { formatUsd } from '@/lib/server/pricing';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const plans = await listPlans(false);

  return (
    <>
      <PageHeader
        title={a.plans.title}
        subtitle={a.plans.subtitle}
        action={
          <Button asChild>
            <Link href="/admin/plans/new">
              <Plus className="mr-2 h-4 w-4" /> {a.plans.addPackage}
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{a.plans.table.pkg}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.price}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.credit}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.days}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.rpm}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.concurrency}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.plans.table.models}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.common.misc.status}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 font-medium">
                        {p.name}
                        {p.highlighted && <Badge>{a.plans.popular}</Badge>}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(p.priceCents)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(p.creditCents)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{p.validDays}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{p.rateLimitRpm}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{p.maxConcurrency}</td>
                    <td className="py-3 pr-4 text-right">{p.allowedModelIds.length === 0 ? a.plans.allModels : p.allowedModelIds.length}</td>
                    <td className="py-3 pr-4 text-right">
                      <Badge variant={p.active ? 'secondary' : 'outline'}>{p.active ? t.common.misc.active : a.plans.statusHidden}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/plans/${p.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">{a.plans.empty}</td>
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
