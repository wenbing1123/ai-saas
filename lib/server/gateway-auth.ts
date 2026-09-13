import { getRedis, prefixedKey, cache } from '@/lib/redis/client';
import { redisKeys, redisTtl } from '@/lib/redis/keys';
import { findTokenByHash } from '@/lib/repositories/tokens';
import { getUserById } from '@/lib/repositories/users';
import { sha256 } from './crypto';
import type { User } from '@/lib/types';
import { TokenStatus, UserStatus } from '@/lib/db/enums';

export interface AuthenticatedCaller {
  user: User;
  token: {
    id: string;
    name: string;
    status: TokenStatus;
  };
}

export type AuthErrorCode =
  | 'missing_key'
  | 'invalid_key'
  | 'revoked_key'
  | 'expired_key'
  | 'user_suspended'
  | 'server_error';

export interface AuthError {
  error: AuthErrorCode;
  message: string;
}

/** Accept OpenAI-style Bearer and Anthropic-style x-api-key. */
export function extractApiKey(req: Request): string | null {
  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.slice(7).trim();
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey) return xApiKey.trim();
  return null;
}

interface CachedIdentity {
  userId: string;
  tokenId: string;
  tokenName: string;
  tokenStatus: TokenStatus;
  expiresAt: string | null;
}

/**
 * Resolve an API key to its user.
 * The key hash → identity mapping is cached in Redis for 60s; user
 * role/balance/status are always re-read from PostgreSQL (never stale money).
 */
export async function authenticateApiKey(secret: string): Promise<AuthenticatedCaller | AuthError> {
  try {
    const keyHash = sha256(secret);
    let identity: CachedIdentity | null = await cache.get(redisKeys.apiKey(keyHash));

    if (!identity) {
      const row = await findTokenByHash(keyHash);
      if (!row) return { error: 'invalid_key', message: 'Invalid API key.' };
      identity = {
        userId: row.userId,
        tokenId: row.id,
        tokenName: row.name,
        tokenStatus: row.status,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      };
      await cache.set(redisKeys.apiKey(keyHash), identity, redisTtl.token);
    }

    if (identity.tokenStatus === TokenStatus.Revoked) {
      return { error: 'revoked_key', message: 'This API key has been revoked.' };
    }
    if (identity.expiresAt && Date.now() > new Date(identity.expiresAt).getTime()) {
      return { error: 'expired_key', message: 'This API key has expired.' };
    }

    const user = await getUserById(identity.userId);
    if (!user || user.status === UserStatus.Suspended) {
      return { error: 'user_suspended', message: 'Account suspended. Please contact support.' };
    }

    return {
      user,
      token: { id: identity.tokenId, name: identity.tokenName, status: identity.tokenStatus },
    };
  } catch (err) {
    console.error('[gateway-auth]', err);
    return { error: 'server_error', message: 'Authentication failed due to a server error.' };
  }
}

/** Drop cached identity on revocation so it takes effect immediately. */
export async function invalidateApiKeyCache(secret: string): Promise<void> {
  const redis = getRedis();
  await redis.del(prefixedKey(redisKeys.apiKey(sha256(secret))));
}
