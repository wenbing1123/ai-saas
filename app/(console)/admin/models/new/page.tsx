import { PageHeader } from '@/components/console/StatCard';
import { ModelForm } from '@/components/admin/ModelForm';
import { requireAdmin } from '@/lib/server/auth';
import { getSettings } from '@/lib/repositories/settings';
import { infraSurchargePer1m } from '@/lib/server/pricing';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function NewModelPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const settings = await getSettings();
  const infraSurcharge = infraSurchargePer1m(
    settings.infra_cost_per_month_cents / 100,
    settings.forecast_monthly_tokens_m,
  );
  return (
    <>
      <PageHeader title={t.admin.models.newTitle} subtitle={t.admin.models.newSubtitle} />
      <ModelForm
        locale={locale}
        mode="create"
        infraSurcharge={infraSurcharge}
        targetProfit={settings.target_profit_percent}
        forexRate={settings.forex_rate_rmb_per_usd}
        endpoint="/api/admin/models"
        method="POST"
      />
    </>
  );
}
