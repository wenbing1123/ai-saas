'use server';

import { revalidatePath } from 'next/cache';
import { adjustBalanceSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requireAdmin } from '@/lib/server/auth';
import { setUserStatus, adjustBalance, getUserById } from '@/lib/repositories/users';
import { toggleUserRole, countActiveAdmins, getRoleCodesByUser } from '@/lib/repositories/rbac';
import { UserStatus, LedgerType } from '@/lib/db/enums';

export async function setUserStatusAction(userId: string, status: UserStatus): Promise<ActionResult> {
  const admin = await requireAdmin();
  const target = await getUserById(userId);
  if (!target) return { ok: false, error: 'User not found.' };
  if (target.id === admin.id && status === UserStatus.Suspended) {
    return { ok: false, error: 'You cannot suspend your own account.' };
  }
  await setUserStatus(userId, status);
  revalidatePath('/admin/users');
  return { ok: true };
}

/**
 * Grant or revoke one role for a user (RBAC: users may hold multiple roles).
 * Guard rails: the last active admin cannot lose the admin role.
 */
export async function toggleUserRoleAction(
  userId: string,
  roleCode: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const target = await getUserById(userId);
  if (!target) return { ok: false, error: 'User not found.' };

  const currentRoles = await getRoleCodesByUser(userId);
  if (!active && roleCode === 'admin' && currentRoles.includes('admin')) {
    if (userId === admin.id) {
      return { ok: false, error: 'You cannot remove the admin role from your own account.' };
    }
    if ((await countActiveAdmins()) <= 1) {
      return { ok: false, error: 'At least one active administrator is required.' };
    }
  }

  await toggleUserRole(userId, roleCode, active);
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adjustBalanceAction(
  userId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adjustBalanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const cents = Math.round(parsed.data.amountDollars * 100);
  if (cents === 0) return { ok: false, error: 'Amount cannot be zero.' };

  // Refuse adjustments that would drive the balance negative from the UI.
  const target = await getUserById(userId);
  if (!target) return { ok: false, error: 'User not found.' };
  if (target.balanceCents + cents < 0) {
    return { ok: false, error: `Balance would go negative (current $${(target.balanceCents / 100).toFixed(2)}).` };
  }

  await adjustBalance(userId, cents, {
    type: cents > 0 ? LedgerType.Adjustment : LedgerType.Refund,
    note: parsed.data.note || 'Admin balance adjustment',
  });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
