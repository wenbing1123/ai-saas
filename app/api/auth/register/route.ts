import type { z } from 'zod';
import { withApi, ok, conflict, badRequest } from '@/lib/server/wrappers';
import { registerSchema } from '@/lib/validators';
import { createUser, findAuthUserByEmail } from '@/lib/repositories/users';
import { InviteCodeInvalidError } from '@/lib/repositories/invites';
import { sendActivationEmail } from '@/lib/server/email/service';
import { logger } from '@/lib/server/logger';
import { getLocale } from '@/lib/i18n/server';

export const POST = withApi({ schema: registerSchema }, async ({ input }) => {
  const data = input as z.infer<typeof registerSchema>;
  const inviteCode = data.inviteCode || null;

  const existing = await findAuthUserByEmail(data.email);
  if (existing) {
    throw conflict('An account with this email already exists.', {
      fieldErrors: { email: 'An account with this email already exists.' },
    });
  }

  let user;
  try {
    user = await createUser({ ...data, inviteCode });
  } catch (err) {
    if (err instanceof InviteCodeInvalidError) {
      throw badRequest('Invalid invite code.', {
        fieldErrors: { inviteCode: 'Invalid invite code.' },
      });
    }
    throw err;
  }

  await sendActivationEmail(
    { id: user.id, email: user.email, name: user.name },
    getLocale(),
  ).catch((err) => logger.error({ err }, '[auth] activation email failed'));

  // Frontend navigates to /register/verify?email=...
  return ok({ email: user.email });
});
