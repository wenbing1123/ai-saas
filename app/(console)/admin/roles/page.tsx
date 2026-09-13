import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RolePermissionsForm } from '@/components/admin/RolePermissionsForm';
import { requirePermission } from '@/lib/server/auth';
import { listRolesWithPermissions, listAllPermissions } from '@/lib/repositories/rbac';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const viewer = await requirePermission('role:view');
  const locale = getLocale();
  const t = getDict(locale);
  const [roles, allPermissions] = await Promise.all([listRolesWithPermissions(), listAllPermissions()]);

  const rbacRoles = t.admin.rbac.roles as Record<string, { name: string } | undefined>;

  return (
    <>
      <PageHeader
        title={t.admin.roles.title}
        subtitle={t.admin.roles.subtitle}
      />

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {rbacRoles[role.code]?.name ?? role.name}
                <span className="text-xs font-normal text-muted-foreground">
                  {t.admin.roles.permissionsCount(role.permissions.length, allPermissions.length)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RolePermissionsForm
                locale={locale}
                role={role}
                permissions={allPermissions}
                canManage={viewer.roles.includes('admin') || viewer.permissions.includes('role:manage')}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
