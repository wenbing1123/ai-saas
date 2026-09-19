import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, businessRule } from '@/lib/server/wrappers';
import { setRolePermissions, getRoleById, listAllPermissions } from '@/lib/repositories/rbac';

/**
 * PUT /api/admin/roles/:id/permissions  (form: perm_<id>=on for each granted)
 * The built-in admin role always keeps every permission.
 */
export const PUT = withApi(
  { permission: 'role:manage', body: 'form' },
  async ({ formData, params }) => {
    const role = await getRoleById(params.id);
    if (!role) throw notFound('Role not found.');

    const all = await listAllPermissions();
    let permissionIds = all
      .filter((p) => formData!.get(`perm_${p.id}`) === 'on')
      .map((p) => p.id);

    if (role.code === 'admin') {
      permissionIds = all.map((p) => p.id);
    }
    if (role.code === 'user' && permissionIds.length === 0) {
      throw businessRule('The user role needs at least one permission.');
    }

    await setRolePermissions(params.id, permissionIds);
    revalidatePath('/admin/roles');
    return ok({}, '权限已更新');
  },
);
