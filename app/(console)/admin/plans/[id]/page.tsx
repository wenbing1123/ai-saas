import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/console/StatCard';
import { PlanForm, type PlanFormZh } from '@/components/admin/PlanForm';
import { requireAdmin } from '@/lib/server/auth';
import { getPlanById, PLAN_ENTITY } from '@/lib/repositories/plans';
import { getEntityTranslations } from '@/lib/repositories/i18n';
import { listModels } from '@/lib/repositories/models';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function EditPlanPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const [plan, models, translations] = await Promise.all([
    getPlanById(params.id),
    listModels(false),
    getEntityTranslations(PLAN_ENTITY, params.id),
  ]);
  if (!plan) notFound();

  const zhRow = translations.zh ?? {};
  let zhFeatures: string[] = [];
  try {
    const parsed = zhRow.features ? JSON.parse(zhRow.features) : [];
    if (Array.isArray(parsed)) zhFeatures = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    zhFeatures = [];
  }
  const zh: PlanFormZh = {
    name: zhRow.name,
    description: zhRow.description,
    featuresText: zhFeatures.join('\n'),
  };

  return (
    <>
      <PageHeader title={t.admin.plans.editTitle(plan.name)} />
      <PlanForm
        locale={locale}
        mode="edit"
        plan={plan}
        zh={zh}
        models={models.map((m) => ({ id: m.id, label: m.displayName }))}
        endpoint={`/api/admin/plans/${plan.id}`}
        method="PUT"
      />
    </>
  );
}
