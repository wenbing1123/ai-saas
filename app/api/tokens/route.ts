import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { withApi, ok } from '@/lib/server/wrappers';
import { tokenNameSchema } from '@/lib/validators';
import { generateApiKey, sha256 } from '@/lib/server/crypto';
import { createToken, listTokens } from '@/lib/repositories/tokens';

/** GET /api/tokens — list the current user's API tokens. */
export const GET = withApi({ role: 'user' }, async ({ user }) => {
  return ok(await listTokens(user!.id));
});

/** POST /api/tokens — create a token. Returns the plaintext secret ONCE. */
export const POST = withApi(
  { role: 'user', schema: tokenNameSchema },
  async ({ user, input }) => {
    const data = input as z.infer<typeof tokenNameSchema>;
    const secret = generateApiKey();
    const created = await createToken(user!.id, data.name, secret, sha256(secret));
    revalidatePath('/dashboard/tokens');
    return ok({ secret, prefix: created.prefix, name: created.name });
  },
);
