import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound } from '@/lib/server/wrappers';
import { revokeToken } from '@/lib/repositories/tokens';

/** DELETE /api/tokens/:id — revoke (disable) one of the user's tokens. */
export const DELETE = withApi({ role: 'user' }, async ({ user, params }) => {
  const revoked = await revokeToken(user!.id, params.id);
  if (!revoked) throw notFound('Token not found.');
  revalidatePath('/dashboard/tokens');
  return ok({}, '已撤销');
});
