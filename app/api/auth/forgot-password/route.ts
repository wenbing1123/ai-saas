import type { z } from 'zod';
import { withApi, ok, rateLimited } from '@/lib/server/wrappers';
import { emailOnlySchema } from '@/lib/validators';
import { findAuthUserByEmail } from '@/lib/repositories/users';
import { sendPasswordResetEmail, EmailRateLimitedError } from '@/lib/server/email/service';
import { UserStatus } from '@/lib/db/enums';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const POST = withApi({ schema: emailOnlySchema }, async ({ input }) => {
  const data = input as z.infer<typeof emailOnlySchema>;
  try {
    const row = await findAuthUserByEmail(data.email);
    if (row && row.status !== UserStatus.Suspended) {
      await sendPasswordResetEmail({ id: row.id, email: row.email, name: row.name }, getLocale());
    }
  } catch (err) {
    if (err instanceof EmailRateLimitedError) {
      throw rateLimited(getDict(getLocale()).marketing.accountEmail.forgot.tooSoon);
    }
    throw err;
  }
  return ok({}, 'OK');
});
