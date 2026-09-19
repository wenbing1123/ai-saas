import { withApi, ok, notFound } from '@/lib/server/wrappers';
import { getOwnedTokenSecret } from '@/lib/repositories/tokens';
import { decryptWithAppKey } from '@/lib/server/crypto';

/**
 * GET /api/tokens/:id/secret — re-view the full API key (owner only).
 * Works only for keys created after encrypted storage was enabled; legacy
 * keys (hash-only) respond 404 with guidance to create a new key.
 */
export const GET = withApi({ role: 'user' }, async ({ user, params }) => {
  const encrypted = await getOwnedTokenSecret(user!.id, params.id!);
  const secret = encrypted ? decryptWithAppKey(encrypted) : null;
  if (!secret) {
    throw notFound('该密钥无法找回，请在 Tokens 页吊销后重新创建。');
  }
  return ok({ secret });
});
