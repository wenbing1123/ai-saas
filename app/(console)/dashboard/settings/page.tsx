import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordForm } from '@/components/console/ChangePasswordForm';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UserStatus } from '@/lib/db/enums';
import { formatDate } from '@/lib/utils';
import { getUserById } from '@/lib/repositories/users';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const locale = getLocale();
  const d = getDict(locale);
  const t = d.console;
  // Resolve inviter email if the user was referred by someone.
  const inviter = user.invitedById ? await getUserById(user.invitedById) : null;

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
            label={d.common.misc.status}
            value={<Badge variant={user.status === UserStatus.Active ? 'secondary' : 'destructive'}>{d.common.enums.userStatus[user.status]}</Badge>}
          />
          <Row label={t.settings.memberSince} value={formatDate(user.createdAt)} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t.settings.inviteTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Row
            label={t.settings.yourInviteCode}
            value={
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold tracking-wider">
                {user.inviteCode}
              </code>
            }
          />
          <Row
            label={t.settings.invitedBy}
            value={inviter ? inviter.email : t.settings.noInviter}
          />
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
