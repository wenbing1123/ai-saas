'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server/auth';
import { setRolePermissions, getRoleById, listAllPermissions } from '@/lib/repositories/rbac';
import type { ActionResult } from '@/lib/validators';

/**
 * Persist the permission set granted to a role.
 * Requires the `role:manage` permission. The built-in `admin` role always
 * keeps the full permission list — its all-access guarantee lives in code too.
 */
export async function setRolePermissionsAction(roleId: string, formData: FormData): Promise<ActionResult> {
  await requirePermission('role:manage');

  const role = await getRoleById(roleId);
  if (!role) return { ok: false, error: 'Role not found.' };

  const all = await listAllPermissions();
  let permissionIds = all
    .filter((p) => formData.get(`perm_${p.id}`) === 'on')
    .map((p) => p.id);

  if (role.code === 'admin') {
    // Admin always holds every defined permission.
    permissionIds = all.map((p) => p.id);
  }
  if (role.code === 'user' && permissionIds.length === 0) {
    return { ok: false, error: 'The user role needs at least one permission.' };
  }

  await setRolePermissions(roleId, permissionIds);
  revalidatePath('/admin/roles');
  return { ok: true };
}
