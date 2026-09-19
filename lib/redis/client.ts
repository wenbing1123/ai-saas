import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const REDIS_PREFIX = process.env.REDIS_PREFIX ?? 'ai_saas:';

/** Connection tunables (see .env.example). ioredis multiplexes commands over a
 * single socket; these control reconnect/timeout behavior rather than pool size. */
const REDIS_CONNECT_TIMEOUT = Number(process.env.REDIS_CONNECT_TIMEOUT ?? 10_000);
const REDIS_COMMAND_TIMEOUT = Number(process.env.REDIS_COMMAND_TIMEOUT ?? 5_000);
const REDIS_KEEP_ALIVE = Number(process.env.REDIS_KEEP_ALIVE ?? 30_000);
const REDIS_MAX_RETRIES_PER_REQUEST = Number(process.env.REDIS_MAX_RETRIES_PER_REQUEST ?? 3);

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined;
}

export function getRedis() {
  if (!globalThis.redisClient) {
    globalThis.redisClient = new Redis(REDIS_URL, {
      // null (no per-request retry cap) is required for blocking commands; 3 is
      // a saner bound for request-path usage. Configurable via REDIS_MAX_RETRIES_PER_REQUEST.
      maxRetriesPerRequest: Number.isNaN(REDIS_MAX_RETRIES_PER_REQUEST) ? null : REDIS_MAX_RETRIES_PER_REQUEST,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      commandTimeout: REDIS_COMMAND_TIMEOUT,
      keepAlive: REDIS_KEEP_ALIVE,
      retryStrategy: (times) => Math.min(times * 500, 5_000),
    });
  }
  return globalThis.redisClient;
}

export function getRedisClient() {
  return getRedis();
}

export function prefixedKey(key: string) {
  return `${REDIS_PREFIX}${key}`;
}

export async function closeRedis() {
  if (globalThis.redisClient) {
    await globalThis.redisClient.quit();
    globalThis.redisClient = undefined;
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    const fullKey = prefixedKey(key);
    const value = await redis.get(fullKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const redis = getRedis();
    const fullKey = prefixedKey(key);
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(fullKey, ttlSeconds, serialized);
    } else {
      await redis.set(fullKey, serialized);
    }
  },

  async del(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(prefixedKey(key));
  },

  async delByPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    const fullPattern = prefixedKey(pattern);
    const keys = await redis.keys(fullPattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 3600): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await cache.set(key, value, ttlSeconds);
    return value;
  },
};

export const rateLimit = {
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const redis = getRedis();
    const fullKey = prefixedKey(`ratelimit:${key}`);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(fullKey, 0, windowStart);
    // Member must be unique per request, otherwise repeated calls within the
    // same second collapse onto one sorted-set entry and undercount.
    pipeline.zadd(fullKey, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.zcard(fullKey);
    pipeline.expire(fullKey, windowSeconds);

    const results = await pipeline.exec();
    // `exec()` resolves to [error, result] tuples, one per queued command.
    // Index 2 is the ZCARD.
    const [zcardError, zcardResult] = results?.[2] ?? [null, 0];
    if (zcardError) {
      throw zcardError;
    }
    const count = Number(zcardResult ?? 0);
    const allowed = count <= limit;
    // The current request is already in the set, so it counts against the quota.
    const remaining = Math.max(0, limit - count);
    const reset = now + windowSeconds;

    return { allowed, remaining, reset };
  },
};