'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Ban, RotateCcw, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPostJson } from '@/lib/client/api';
import { UserStatus } from '@/lib/db/enums';
import { getDict, type Locale } from '@/lib/i18n';

export function UserActions({
  locale,
  userId,
  roles,
  status,
}: {
  locale: Locale;
  userId: string;
  roles: string[];
  status: UserStatus;
}) {
  const router = useRouter();
  const t = getDict(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = roles.includes('admin');

  function run(fn: () => Promise<{ code: string; msg: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.code !== '0000') setError(res.msg || t.admin.users.actions.failed);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === UserStatus.Active ? (
          <Button type="button" size="sm" variant="outline" disabled={pending}
            onClick={() => run(() => apiPostJson(`/api/admin/users/${userId}/status`, { status: UserStatus.Suspended }))}>
            {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Ban className="mr-1 h-3 w-3" />}
            {t.admin.users.actions.suspend}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={pending}
            onClick={() => run(() => apiPostJson(`/api/admin/users/${userId}/status`, { status: UserStatus.Active }))}>
            {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
            {t.admin.users.actions.activate}
          </Button>
        )}
        {isAdmin ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending}
            onClick={() => run(() => apiPostJson(`/api/admin/users/${userId}/roles`, { roleCode: 'admin', active: false }))}>
            <UserIcon className="mr-1 h-3 w-3" /> {t.admin.users.actions.revokeAdmin}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" disabled={pending}
            onClick={() => run(() => apiPostJson(`/api/admin/users/${userId}/roles`, { roleCode: 'admin', active: true }))}>
            <ShieldCheck className="mr-1 h-3 w-3" /> {t.admin.users.actions.makeAdmin}
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
