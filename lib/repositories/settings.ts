import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { appSettings } from '@/lib/db/schema';
import { cache, getRedis, prefixedKey } from '@/lib/redis/client';
import { redisKeys, redisTtl } from '@/lib/redis/keys';
import { PROVIDER_LABELS } from '@/lib/db/enums';
import type { PlatformSettings, UpstreamProviderConfig } from '@/lib/types';

/**
 * Upstream credentials are stored only in the DB (admin panel).
 * Defaults are empty — the gateway returns 503 until an admin fills them in.
 */
function defaultUpstreamProviders(): Record<string, UpstreamProviderConfig> {
  const out: Record<string, UpstreamProviderConfig> = {};
  for (const code of Object.values(PROVIDER_LABELS)) {
    out[code] = { api_key: '', base_url: '' };
  }
  return out;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  min_markup_percent: 10,
  // ≈ ¥20,000 / year (servers, domains…) → ~$230 / month
  infra_cost_per_month_cents: 23_000,
  forecast_monthly_tokens_m: 1_000,
  target_profit_percent: 30,
  default_rpm: 30,
  default_concurrency: 3,
  low_balance_cents: 1,
  maintenance_mode: false,
  // Empty host → dev mode: activation/reset emails are logged to the server console.
  smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
  currency: 'USD',
  // 1 USD ≈ 7.20 RMB (Sept 2026). Admin adjusts to market + safety margin.
  forex_rate_rmb_per_usd: 7.2,
  // 3% buffer: effective rate = 7.20 * 0.97 = 6.984, over-estimating RMB cost in USD.
  forex_buffer_percent: 3,
  upstream_providers: defaultUpstreamProviders(),
};

/**
 * Platform settings — JSON rows in PG, cached in Redis for the gateway hot path.
 * PostgreSQL remains the source of truth; the cache is invalidated on writes.
 */
export async function getSettings(): Promise<PlatformSettings> {
  return cache.getOrSet(
    redisKeys.settings(),
    async () => {
      const db = getDb();
      const rows = await db.select().from(appSettings).where(eq(appSettings.deleted, 0));
      const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      return { ...DEFAULT_SETTINGS, ...stored } as PlatformSettings;
    },
    redisTtl.settings,
  );
}

export async function setSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value: value as unknown })
    .onConflictDoUpdate({
      target: appSettings.key,
      targetWhere: eq(appSettings.deleted, 0),
      set: { value: value as unknown, updatedAt: new Date() },
    });
  const redis = getRedis();
  await redis.del(prefixedKey(redisKeys.settings()));
}
