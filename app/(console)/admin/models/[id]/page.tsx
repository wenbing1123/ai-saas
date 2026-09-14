import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/console/StatCard';
import { ModelForm } from '@/components/admin/ModelForm';
import { requireAdmin } from '@/lib/server/auth';
import { getModelById } from '@/lib/repositories/models';
import { getSettings } from '@/lib/repositories/settings';
import { updateModelAction } from '@/lib/server/actions/models';
import { infraSurchargePer1m } from '@/lib/server/pricing';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function EditModelPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const [model, settings] = await Promise.all([getModelById(params.id), getSettings()]);
  if (!model) notFound();
  const infraSurcharge = infraSurchargePer1m(
    settings.infra_cost_per_month_cents / 100,
    settings.forecast_monthly_tokens_m,
  );

  return (
    <>
      <PageHeader title={t.admin.models.editTitle(model.displayName)} subtitle={model.modelId} />
      <ModelForm
        locale={locale}
        mode="edit"
        model={model}
        infraSurcharge={infraSurcharge}
        targetProfit={settings.target_profit_percent}
        forexRate={settings.forex_rate_rmb_per_usd}
        action={updateModelAction.bind(null, model.id)}
      />
    </>
  );
}
