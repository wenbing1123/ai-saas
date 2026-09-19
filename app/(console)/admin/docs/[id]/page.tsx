import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/console/StatCard';
import { DocForm } from '@/components/admin/DocForm';
import { requirePermission } from '@/lib/server/auth';
import { getDocById } from '@/lib/repositories/docs';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function EditDocPage({ params }: { params: { id: string } }) {
  await requirePermission('doc:manage');
  const locale = getLocale();
  const t = getDict(locale);
  const doc = await getDocById(params.id);
  if (!doc) notFound();
  return (
    <>
      <PageHeader title={t.admin.docsCms.editTitle(doc.slug)} subtitle={doc.title} />
      <DocForm locale={locale} mode="edit" doc={doc} endpoint={`/api/admin/docs/${doc.id}`} method="PUT" />
    </>
  );
}
