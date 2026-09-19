import { cookies, headers } from 'next/headers';
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

/**
 * Client platforms — one login slot each: a new login replaces the older
 * session of the SAME platform (two PC browsers kick each other), while the
 * other platforms (multi-device sign-in) stay logged in.
 */
export type DeviceType = 'pc' | 'android' | 'ios' | 'h5' | 'miniprogram';

const DEVICE_TYPES: readonly string[] = ['pc', 'android', 'ios', 'h5', 'miniprogram'];
/** Native apps / mini programs declare themselves explicitly on their login call. */
export const DEVICE_TYPE_HEADER = 'x-device-type';

/**
 * Resolve the client platform. Explicit header wins (Android/iOS apps and the
 * mini program identify themselves); plain browsers are sniffed from the UA:
 * WeChat mini program → miniprogram, WeChat page / mobile browser → h5,
 * everything else → pc (Chrome and Edge on the same desktop both count as pc).
 */
export function resolveDeviceType(h: { get(name: string): string | null }): DeviceType {
  const explicit = h.get(DEVICE_TYPE_HEADER)?.toLowerCase();
  if (explicit && DEVICE_TYPES.includes(explicit)) return explicit as DeviceType;
  const ua = h.get('user-agent') ?? '';
  if (/MicroMessenger/i.test(ua)) {
    return /miniProgram/i.test(ua) ? 'miniprogram' : 'h5';
  }
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'h5';
  return 'pc';
}

interface SessionPayload {
  userId: string;
  /** Platform the session was created from (login slot key). */
  deviceType: DeviceType;
  createdAt: number;
}

/**
 * Create a session in Redis and attach the httpOnly cookie.
 *
 * Single session per platform: a new login deletes the older sessions of the
 * same platform; sessions from other platforms are untouched. The per-user+
 * platform SET is self-healing — sids whose session keys already expired are
 * pruned by the next login on that platform.
 */
export async function startSession(userId: string): Promise<void> {
  const sid = randomSecret(32);
  const redis = getRedis();
  const deviceType = resolveDeviceType(headers());

  const deviceSetKey = prefixedKey(redisKeys.userDeviceSessions(userId, deviceType));
  const oldSids = await redis.smembers(deviceSetKey);

  const pipeline = redis.pipeline();
  for (const old of oldSids) {
    pipeline.del(prefixedKey(redisKeys.session(old)));
  }
  pipeline.del(deviceSetKey);
  pipeline.setex(
    prefixedKey(redisKeys.session(sid)),
    redisTtl.session,
    JSON.stringify({ userId, deviceType, createdAt: Date.now() } satisfies SessionPayload),
  );
  pipeline.sadd(deviceSetKey, sid);
  pipeline.expire(deviceSetKey, redisTtl.session);
  await pipeline.exec();

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
    const sessionKey = prefixedKey(redisKeys.session(sid));
    const raw = await redis.get(sessionKey);
    await redis.del(sessionKey);
    if (raw) {
      try {
        const payload = JSON.parse(raw) as SessionPayload;
        await redis.srem(
          prefixedKey(redisKeys.userDeviceSessions(payload.userId, payload.deviceType)),
          sid,
        );
      } catch {
        // Corrupt payload — session key already deleted, nothing else to clean.
      }
    }
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
  // Email must be activated; Suspended accounts are rejected separately.
  if (!user || user.status !== UserStatus.Active || !user.emailVerifiedAt) {
    await redis.del(prefixedKey(redisKeys.session(sid)));
    return null;
  }

  const permissions = await getPermissionCodesByUser(user.id);

  // Sliding TTL — stay logged in for 7 days after last use. Keep the
  // per-platform index aligned so a later login can still clean up this sid.
  await redis.expire(prefixedKey(redisKeys.session(sid)), redisTtl.session);
  await redis.expire(
    prefixedKey(redisKeys.userDeviceSessions(payload.userId, payload.deviceType)),
    redisTtl.session,
  );
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
