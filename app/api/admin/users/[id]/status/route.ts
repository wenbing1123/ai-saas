import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, forbidden } from '@/lib/server/wrappers';
import { setUserStatus, getUserById } from '@/lib/repositories/users';
import { UserStatus } from '@/lib/db/enums';

/** POST /api/admin/users/:id/status  { status: UserStatus } */
export const POST = withApi({ role: 'admin', body: 'json' }, async ({ user, params, input }) => {
  const status = Number((input as { status?: number }).status) as UserStatus;
  const target = await getUserById(params.id);
  if (!target) throw notFound('User not found.');
  if (target.id === user!.id && status === UserStatus.Suspended) {
    throw forbidden('You cannot suspend your own account.');
  }
  await setUserStatus(params.id, status);
  revalidatePath('/admin/users');
  return ok({}, '已更新');
});
