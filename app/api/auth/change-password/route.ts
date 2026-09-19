import type { z } from 'zod';
import { withApi, ok, badRequest } from '@/lib/server/wrappers';
import { changePasswordSchema } from '@/lib/validators';
import { findAuthUserByEmail, changeUserPassword } from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/server/crypto';

export const POST = withApi(
  { role: 'user', schema: changePasswordSchema },
  async ({ input, user }) => {
    const data = input as z.infer<typeof changePasswordSchema>;

    const row = await findAuthUserByEmail(user!.email);
    if (!row || !verifyPassword(data.currentPassword, row.passwordHash)) {
      throw badRequest('Current password is incorrect.', {
        fieldErrors: { currentPassword: 'Current password is incorrect.' },
      });
    }
    await changeUserPassword(user!.id, data.newPassword);
    return ok({}, '密码已更新');
  },
);
