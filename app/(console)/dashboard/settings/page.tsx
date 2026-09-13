import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordForm } from '@/components/console/ChangePasswordForm';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UserStatus } from '@/lib/db/enums';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const locale = getLocale();
  const d = getDict(locale);
  const t = d.console;
  return (
    <>
      <PageHeader title={t.nav.settings} subtitle={t.settings.subtitle} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.account}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label={d.common.misc.name} value={user.name} />
          <Row label={d.common.misc.email} value={user.email} />
          <Row
            label={t.settings.roles}
            value={
              <div className="flex gap-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>{role}</Badge>
                ))}
              </div>
            }
          />
          <Row
            label={d.common.misc.status}
            value={<Badge variant={user.status === UserStatus.Active ? 'secondary' : 'destructive'}>{d.common.enums.userStatus[user.status]}</Badge>}
          />
          <Row label={t.settings.memberSince} value={formatDate(user.createdAt)} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t.settings.changePassword}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm locale={locale} />
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
