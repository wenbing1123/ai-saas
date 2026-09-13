import { ConsoleShell } from '@/components/console/ConsoleShell';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = getLocale();
  return (
    <ConsoleShell user={user} locale={locale}>
      {children}
    </ConsoleShell>
  );
}
