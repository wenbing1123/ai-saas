import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, forbidden } from '@/lib/server/wrappers';
import { getUserById } from '@/lib/repositories/users';
import { toggleUserRole, countActiveAdmins, getRoleCodesByUser } from '@/lib/repositories/rbac';

/** POST /api/admin/users/:id/roles  { roleCode: string, active: boolean } */
export const POST = withApi({ role: 'admin', body: 'json' }, async ({ user, params, input }) => {
  const body = input as { roleCode?: string; active?: boolean };
  const roleCode = String(body.roleCode ?? '');
  const active = Boolean(body.active);

  const target = await getUserById(params.id);
  if (!target) throw notFound('User not found.');

  const currentRoles = await getRoleCodesByUser(params.id);
  if (!active && roleCode === 'admin' && currentRoles.includes('admin')) {
    if (params.id === user!.id) {
      throw forbidden('You cannot remove the admin role from your own account.');
    }
    if ((await countActiveAdmins()) <= 1) {
      throw forbidden('At least one active administrator is required.');
    }
  }

  await toggleUserRole(params.id, roleCode, active);
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${params.id}`);
  return ok({}, '已更新');
});
