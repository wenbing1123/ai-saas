import { PageHeader } from '@/components/console/StatCard';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireAdmin } from '@/lib/server/auth';
import { getSettings } from '@/lib/repositories/settings';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const settings = await getSettings();
  return (
    <>
      <PageHeader title={t.admin.settings.title} subtitle={t.admin.settings.subtitle} />
      <SettingsForm locale={locale} settings={settings} />
    </>
  );
}
