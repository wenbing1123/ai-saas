'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { apiPutForm } from '@/lib/client/api';
import { type ApiResponse, initialApiResponse } from '@/lib/server/api-response';
import type { Permission, RoleWithPermissions } from '@/lib/types';
import { RoleStatus } from '@/lib/db/enums';
import { getDict, type Locale } from '@/lib/i18n';

export function RolePermissionsForm({
  locale,
  role,
  permissions,
  canManage,
}: {
  locale: Locale;
  role: RoleWithPermissions;
  permissions: Permission[];
  canManage: boolean;
}) {
  const router = useRouter();
  const t = getDict(locale);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiResponse>(initialApiResponse());

  // Group permission points by domain module for tree-like editing.
  const modules = [...new Set(permissions.map((p) => p.module))].sort();
  const granted = new Set(role.permissions?.map((p) => p.id) ?? []);
  const locked = role.code === 'admin';
  // DB rows carry English names — resolve display strings via the stable codes.
  const rbacRoles = t.admin.rbac.roles as Record<string, { name: string; description: string } | undefined>;
  const rbacModules = t.admin.rbac.modules as Record<string, string | undefined>;
  const rbacPerms = t.admin.rbac.permissions as Record<string, string | undefined>;
  const roleName = rbacRoles[role.code]?.name ?? role.name;
  const roleDesc = rbacRoles[role.code]?.description ?? role.description;

  function submit() {
    setResult(initialApiResponse());
    const form = document.getElementById(`role-form-${role.id}`) as HTMLFormElement | null;
    if (!form) return;
    startTransition(async () => {
      const res = await apiPutForm(`/api/admin/roles/${role.id}/permissions`, new FormData(form));
      setResult(res);
      if (res.code === '0000') {
        toast.success(t.admin.roles.updated);
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    });
  }

  return (
    <form id={`role-form-${role.id}`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={role.isSystem ? 'default' : 'outline'}>{roleName}</Badge>
        {role.status !== RoleStatus.Active && (
          <Badge variant="destructive">{t.common.enums.roleStatus[role.status]}</Badge>
        )}
        {roleDesc && <span className="text-xs text-muted-foreground">{roleDesc}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => (
          <div key={mod} className="rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {rbacModules[mod] ?? mod}
            </div>
            <div className="space-y-1.5">
              {permissions
                .filter((p) => p.module === mod)
                .map((p) => (
                  <label key={p.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`perm_${p.id}`}
                      defaultChecked={granted.has(p.id) || locked}
                      disabled={!canManage || locked || pending}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">{rbacPerms[p.code] ?? p.name}</span>
                      <span className="ml-1 font-mono text-[11px] text-muted-foreground">{p.code}</span>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      {locked && (
        <p className="text-xs text-muted-foreground">
          {t.admin.roles.lockedNote}
        </p>
      )}
      {canManage && !locked && (
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          {t.admin.roles.save}
        </Button>
      )}
    </form>
  );
}
