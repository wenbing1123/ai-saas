import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRedis, prefixedKey } from '@/lib/redis/client';
import { redisKeys, redisTtl } from '@/lib/redis/keys';
import { getUserById } from '@/lib/repositories/users';
import { getPermissionCodesByUser } from '@/lib/repositories/rbac';
import { randomSecret } from './crypto';
import { hasRole, hasPermission } from '@/lib/permissions';
import { UserStatus } from '@/lib/db/enums';
import type { AuthUser } from '@/lib/types';

export { hasRole, hasPermission };

export const SESSION_COOKIE = 'nebula_session';

interface SessionPayload {
  userId: string;
  createdAt: number;
}

/** Create a session in Redis and attach the httpOnly cookie. */
export async function startSession(userId: string): Promise<void> {
  const sid = randomSecret(32);
  const payload: SessionPayload = { userId, createdAt: Date.now() };
  const redis = getRedis();
  await redis.setex(
    prefixedKey(redisKeys.session(sid)),
    redisTtl.session,
    JSON.stringify(payload),
  );
  cookies().set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: redisTtl.session,
  });
}

export async function destroySession(): Promise<void> {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (sid) {
    const redis = getRedis();
    await redis.del(prefixedKey(redisKeys.session(sid)));
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Resolve the logged-in user. PostgreSQL is the source of truth for
 * roles/permissions/status/balance; Redis stores only session id → userId.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const redis = getRedis();
  const raw = await redis.get(prefixedKey(redisKeys.session(sid)));
  if (!raw) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }

  const user = await getUserById(payload.userId);
  if (!user || user.status !== UserStatus.Active) {
    await redis.del(prefixedKey(redisKeys.session(sid)));
    return null;
  }

  const permissions = await getPermissionCodesByUser(user.id);

  // Sliding TTL — stay logged in for 7 days after last use.
  await redis.expire(prefixedKey(redisKeys.session(sid)), redisTtl.session);
  return { ...user, permissions };
}

export async function requireUser(redirectTo = '/login'): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user!;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasRole(user, 'admin')) redirect('/dashboard');
  return user!;
}

/**
 * Gate a page/action by a fine-grained permission code (module:action).
 * Authenticated users lacking the permission are bounced to the dashboard.
 */
export async function requirePermission(code: string): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasPermission(user, code)) redirect('/dashboard');
  return user!;
}
