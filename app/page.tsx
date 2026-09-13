import { Landing } from '@/components/marketing/Landing';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { listPlans } from '@/lib/repositories/plans';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = getLocale();
  const t = getDict(locale);
  const [models, plans, user] = await Promise.all([
    getEnabledCatalog(),
    listPlans(true, locale),
    getCurrentUser(),
  ]);
  return <Landing models={models} plans={plans} user={user} t={t.marketing} locale={locale} />;
}
