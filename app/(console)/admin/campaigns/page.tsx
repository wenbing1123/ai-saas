import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignForm } from '@/components/admin/CampaignForm';
import { requireAdmin } from '@/lib/server/auth';
import { listCampaigns, getCampaign } from '@/lib/server/campaign-service';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { formatUsd } from '@/lib/server/pricing';
import { CampaignType } from '@/lib/db/enums';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<number, string> = {
  [CampaignType.Register]: '注册奖励',
  [CampaignType.Invite]: '邀请奖励',
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale).console.shell.adminNav;
  const campaigns = await listCampaigns();
  const editing = searchParams.id ? await getCampaign(searchParams.id) : null;

  const rewardInput = editing ? (editing.rewardCents / 100).toFixed(2) : '';
  const budgetInput = editing?.totalBudgetCents != null ? (editing.totalBudgetCents / 100).toFixed(2) : '';

  return (
    <>
      <PageHeader title={t.campaigns} subtitle="营销活动配置 — 注册、邀请等奖励发放" />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{editing ? '编辑活动' : '新建活动'}</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignForm
            defaults={{
              id: editing?.id,
              type: editing?.type ?? CampaignType.Register,
              name: editing?.name ?? '',
              rewardInput,
              perUserLimit: editing?.perUserLimit ?? 1,
              startsAtInput: editing ? toLocalInput(editing.startsAt) : toLocalInput(new Date()),
              endsAtInput: editing?.endsAt ? toLocalInput(editing.endsAt) : '',
              totalBudgetInput: budgetInput,
              enabled: editing?.enabled ?? true,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">类型</th>
                  <th className="py-2 pr-4 font-medium">名称</th>
                  <th className="py-2 pr-4 text-right font-medium">奖励</th>
                  <th className="py-2 pr-4 font-medium">时效</th>
                  <th className="py-2 pr-4 text-right font-medium">预算</th>
                  <th className="py-2 pr-4 font-medium">状态</th>
                  <th className="py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const active =
                    c.enabled &&
                    new Date(c.startsAt) <= new Date() &&
                    (c.endsAt == null || new Date(c.endsAt) >= new Date());
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{TYPE_LABELS[c.type] ?? c.type}</td>
                      <td className="py-3 pr-4">{c.name}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(c.rewardCents)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(c.startsAt).toLocaleString()}
                        {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleString()}` : ' → 永久'}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs tabular-nums">
                        {c.totalBudgetCents != null
                          ? `${formatUsd(c.consumedBudgetCents)} / ${formatUsd(c.totalBudgetCents)}`
                          : '不限'}
                      </td>
                      <td className="py-3 pr-4">
                        {active ? (
                          <Badge variant="default">进行中</Badge>
                        ) : c.enabled ? (
                          <Badge variant="secondary">未开始/已结束</Badge>
                        ) : (
                          <Badge variant="outline">已停用</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/campaigns?id=${c.id}`}>编辑</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      暂无活动，在上方创建一个。
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
