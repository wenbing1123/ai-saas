import { PageHeader } from '@/components/console/StatCard';
import { TokenManager } from '@/components/console/TokenManager';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { listTokens } from '@/lib/repositories/tokens';

export const dynamic = 'force-dynamic';

export default async function TokensPage() {
  const user = await requireUser();
  const locale = getLocale();
  const t = getDict(locale).console;
  const tokens = await listTokens(user.id);
  return (
    <>
      <PageHeader title={t.nav.apiKeys} subtitle={t.tokens.subtitle} />
      <TokenManager tokens={tokens} locale={locale} />
    </>
  );
}
