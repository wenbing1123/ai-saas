import type { z } from 'zod';
import { withApi, ok, AppError, ErrorCodes } from '@/lib/server/wrappers';
import { resetPasswordSchema } from '@/lib/validators';
import { changeUserPassword } from '@/lib/repositories/users';
import { consumeEmailToken } from '@/lib/repositories/email-tokens';
import { EmailTokenPurpose } from '@/lib/db/enums';

export const POST = withApi({ schema: resetPasswordSchema }, async ({ input }) => {
  const data = input as z.infer<typeof resetPasswordSchema>;
  const userId = await consumeEmailToken(data.token, EmailTokenPurpose.PasswordReset);
  if (!userId) {
    throw new AppError(
      ErrorCodes.TOKEN_INVALID,
      'This reset link is invalid or has expired. Request a new one.',
    );
  }
  await changeUserPassword(userId, data.newPassword);
  return ok({}, '密码已重置');
});
