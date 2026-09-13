import Link from 'next/link';
import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserActions } from '@/components/admin/UserActions';
import { requireAdmin } from '@/lib/server/auth';
import { listUsers } from '@/lib/repositories/users';
import { formatUsd } from '@/lib/server/pricing';
import { formatDate } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UserStatus } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const q = searchParams.q ?? '';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const { users, total } = await listUsers({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const href = (next: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (next > 1) params.set('page', String(next));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader title={a.users.title} subtitle={a.users.subtitle(total)} />

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="mb-4 flex gap-2">
            <Input name="q" defaultValue={q} placeholder={a.users.searchPlaceholder} className="max-w-sm" />
            <Button type="submit" variant="secondary">{a.users.search}</Button>
            {q && (
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin/users">{a.users.reset}</Link>
              </Button>
            )}
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{a.users.table.user}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.common.misc.balance}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.users.table.role}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.common.misc.status}</th>
                  <th className="py-2 pr-4 font-medium">{a.users.table.joined}</th>
                  <th className="py-2 text-right font-medium">{t.common.misc.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(u.balanceCents)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        {u.roles.map((role) => (
                          <Badge key={role} variant={role === 'admin' ? 'default' : 'outline'}>{role}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Badge variant={u.status === UserStatus.Active ? 'secondary' : 'destructive'}>{t.common.enums.userStatus[u.status]}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="py-3 text-right">
                      <UserActions locale={locale} userId={u.id} roles={u.roles} status={u.status} />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">{a.users.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{a.users.pageInfo(page)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? <Link href={href(page - 1)}>{a.users.previous}</Link> : a.users.previous}
              </Button>
              <Button variant="outline" size="sm" asChild={total > page * PAGE_SIZE} disabled={total <= page * PAGE_SIZE}>
                {total > page * PAGE_SIZE ? <Link href={href(page + 1)}>{a.users.next}</Link> : a.users.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
