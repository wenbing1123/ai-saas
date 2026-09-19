/**
 * Centralized Redis key registry.
 *
 * Rule of thumb (PostgreSQL = source of truth, Redis = ephemeral acceleration):
 * - sessions      : authoritative login state, TTL bounded
 * - caches        : derived data, must be invalidated on the matching write path
 * - rate limits   : sliding window counters, safe to expire
 *
 * Never read business truth from a cache key that is stale by design; every
 * cached entity is loaded back from PostgreSQL on a miss.
 */

/** Login session lifetime — SESSION_TTL_DAYS env (default 7 days), applies to all users. */
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_DAYS ?? 7) * 86400;
const TOKEN_TTL_SECONDS = 60; // api key → user/token lookup
const MODEL_TTL_SECONDS = 300;
const SETTINGS_TTL_SECONDS = 120;
const EMAIL_COOLDOWN_SECONDS = 60; // min gap between two account emails to one address
const EMAIL_HOURLY_SECONDS = 3600; // rolling hourly cap window

export const redisTtl = {
  session: SESSION_TTL_SECONDS,
  token: TOKEN_TTL_SECONDS,
  model: MODEL_TTL_SECONDS,
  settings: SETTINGS_TTL_SECONDS,
  emailCooldown: EMAIL_COOLDOWN_SECONDS,
  emailHourly: EMAIL_HOURLY_SECONDS,
} as const;

/** Max activation/reset emails to one address per rolling hour. */
export const EMAIL_HOURLY_LIMIT = 5;

export const redisKeys = {
  /** Login sessions: session:{sid} */
  session: (sid: string) => `session:${sid}`,

  /** Live session index per user+platform: user:sess:{userId}:{deviceType} (SET of sids). */
  userDeviceSessions: (userId: string, deviceType: string) => `user:sess:${userId}:${deviceType}`,

  /** API key resolution cache: apikey:{sha256} */
  apiKey: (keyHash: string) => `apikey:${keyHash}`,

  /** Enabled catalog cache (single payload). */
  modelCatalog: () => 'catalog:models:enabled',
  modelById: (id: string) => `catalog:model:${id}`,
  modelByPublicId: (modelId: string) => `catalog:model-pid:${modelId}`,

  /** Global settings payload. */
  settings: () => 'config:settings',

  /** Gateway sliding-window request counter per token (window handled by caller). */
  gatewayRpm: (tokenId: string) => `gw:rpm:${tokenId}`,
  /** In-flight concurrency guard per user. */
  gatewayConcurrency: (userId: string) => `gw:conc:${userId}`,
  /** Priority concurrency pool (subscribed users — isolated from free tier). */
  gatewayConcurrencyPriority: (userId: string) => `gw:conc:prio:${userId}`,

  /** Per-address cooldown between account emails. */
  emailCooldown: (email: string) => `email:cooldown:${email.toLowerCase()}`,
  /** Rolling hourly counter per address. */
  emailHourly: (email: string) => `email:hourly:${email.toLowerCase()}`,
} as const;
