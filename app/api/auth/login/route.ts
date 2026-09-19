import type { z } from 'zod';
import { withApi, ok, unauthorized, forbidden } from '@/lib/server/wrappers';
import { loginSchema } from '@/lib/validators';
import { findAuthUserByEmail, getUserById } from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/server/crypto';
import { startSession } from '@/lib/server/auth';
import { UserStatus } from '@/lib/db/enums';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const POST = withApi({ schema: loginSchema }, async ({ input }) => {
  const data = input as z.infer<typeof loginSchema>;

  const row = await findAuthUserByEmail(data.email);
  if (!row || !verifyPassword(data.password, row.passwordHash)) {
    throw unauthorized('Invalid email or password.');
  }
  if (row.status === UserStatus.Suspended) {
    throw forbidden('This account has been suspended. Contact support.');
  }
  if (!row.emailVerifiedAt) {
    throw unauthorized(getDict(getLocale()).marketing.login.unverified);
  }

  await startSession(row.id);
  const loggedIn = await getUserById(row.id);
  // Frontend performs a full navigation to the returned destination.
  return ok({ redirect: loggedIn?.roles.includes('admin') ? '/admin' : '/dashboard' });
});
