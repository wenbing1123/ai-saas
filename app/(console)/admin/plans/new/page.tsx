import { PageHeader } from '@/components/console/StatCard';
import { PlanForm } from '@/components/admin/PlanForm';
import { requireAdmin } from '@/lib/server/auth';
import { listModels } from '@/lib/repositories/models';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function NewPlanPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const models = await listModels(false);
  return (
    <>
      <PageHeader title={t.admin.plans.newTitle} />
      <PlanForm
        locale={locale}
        mode="create"
        models={models.map((m) => ({ id: m.id, label: m.displayName }))}
        endpoint="/api/admin/plans"
        method="POST"
      />
    </>
  );
}
