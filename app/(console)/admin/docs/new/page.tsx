import { PageHeader } from '@/components/console/StatCard';
import { DocForm } from '@/components/admin/DocForm';
import { requirePermission } from '@/lib/server/auth';
import { createDocAction } from '@/lib/server/actions/docs';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function NewDocPage() {
  await requirePermission('doc:manage');
  const locale = getLocale();
  const t = getDict(locale);
  return (
    <>
      <PageHeader title={t.admin.docsCms.new} subtitle={t.admin.docsCms.subtitle} />
      <DocForm locale={locale} mode="create" action={createDocAction} />
    </>
  );
}
