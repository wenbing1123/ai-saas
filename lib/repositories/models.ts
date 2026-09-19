import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { models } from '@/lib/db/schema';
import { mapModel } from './mappers';
import type { Model } from '@/lib/types';
import { PROVIDER_CODES, CURRENCY_CODES, Currency } from '@/lib/db/enums';
import { cache, prefixedKey, getRedis } from '@/lib/redis/client';
import { redisKeys, redisTtl } from '@/lib/redis/keys';

export interface ModelWriteInput {
  /** Wire label, e.g. 'openai' — converted to the Provider enum on write. */
  provider: string;
  /** Bitmask of supported protocols: 1 = OpenAI, 2 = Anthropic, 3 = both. */
  protocols: number;
  modelId: string;
  upstreamModel: string;
  upstreamApiKey?: string | null;
  baseUrl?: string | null;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  /** Wire label 'usd' | 'rmb' — converted to Currency enum on write. */
  costCurrency: string;
  inputCostPer1m: string;
  outputCostPer1m: string;
  cacheReadCostPer1m: string;
  cacheWriteCostPer1m: string;
  retailInputPer1m: string;
  retailOutputPer1m: string;
  markupPercent: string;
  sellInputPer1m: string;
  sellOutputPer1m: string;
  sellCacheReadPer1m: string;
  sellCacheWritePer1m: string;
  enabled: boolean;
  sortOrder: number;
}

export async function listModels(enabledOnly = false): Promise<Model[]> {
  const db = getDb();
  const where = enabledOnly ? and(eq(models.deleted, 0), eq(models.enabled, true)) : eq(models.deleted, 0);
  const rows = await db
    .select()
    .from(models)
    .where(where)
    .orderBy(asc(models.sortOrder), asc(models.displayName));
  return rows.map(mapModel);
}

/**
 * Enabled catalog for the gateway & portal — Redis cached.
 * Redis stores JSON, so Date fields come back as strings and must be
 * rehydrated before returning domain objects.
 */
function reviveModel(m: Model): Model {
  return { ...m, createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt) };
}

export async function getEnabledCatalog(): Promise<Model[]> {
  const cached = await cache.get<Model[]>(redisKeys.modelCatalog());
  if (cached) return cached.map(reviveModel);
  const fresh = await listModels(true);
  await cache.set(redisKeys.modelCatalog(), fresh, redisTtl.model);
  return fresh;
}

export async function getModelByPublicId(modelId: string): Promise<Model | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(models)
    .where(and(eq(models.modelId, modelId), eq(models.deleted, 0)))
    .limit(1);
  return rows[0] ? mapModel(rows[0]) : null;
}

export async function getModelById(id: string): Promise<Model | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(models)
    .where(and(eq(models.id, id), eq(models.deleted, 0)))
    .limit(1);
  return rows[0] ? mapModel(rows[0]) : null;
}

export async function invalidateModelCache() {
  const redis = getRedis();
  await redis.del(prefixedKey(redisKeys.modelCatalog()));
  const keys = await redis.keys(prefixedKey('catalog:model*'));
  if (keys.length) await redis.del(...keys);
}

export async function createModel(input: ModelWriteInput) {
  const db = getDb();
  const rows = await db
    .insert(models)
    .values({
      provider: PROVIDER_CODES[input.provider]!,
      protocols: input.protocols,
      modelId: input.modelId,
      upstreamModel: input.upstreamModel,
      upstreamApiKey: input.upstreamApiKey || null,
      baseUrl: input.baseUrl || null,
      displayName: input.displayName,
      contextWindow: input.contextWindow,
      maxOutputTokens: input.maxOutputTokens,
      supportsVision: input.supportsVision,
      supportsTools: input.supportsTools,
      supportsReasoning: input.supportsReasoning,
      costCurrency: CURRENCY_CODES[input.costCurrency] ?? Currency.USD,
      inputCostPer1m: input.inputCostPer1m,
      outputCostPer1m: input.outputCostPer1m,
      cacheReadCostPer1m: input.cacheReadCostPer1m,
      cacheWriteCostPer1m: input.cacheWriteCostPer1m,
      retailInputPer1m: input.retailInputPer1m,
      retailOutputPer1m: input.retailOutputPer1m,
      markupPercent: input.markupPercent,
      sellInputPer1m: input.sellInputPer1m,
      sellOutputPer1m: input.sellOutputPer1m,
      sellCacheReadPer1m: input.sellCacheReadPer1m,
      sellCacheWritePer1m: input.sellCacheWritePer1m,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    })
    .returning();
  await invalidateModelCache();
  return mapModel(rows[0]);
}

export async function updateModel(id: string, patch: Partial<ModelWriteInput>) {
  const db = getDb();
  const { provider, costCurrency, upstreamApiKey, ...rest } = patch;
  const rows = await db
    .update(models)
    .set({
      ...rest,
      ...(provider !== undefined ? { provider: PROVIDER_CODES[provider]! } : {}),
      ...(costCurrency !== undefined ? { costCurrency: CURRENCY_CODES[costCurrency] ?? Currency.USD } : {}),
      ...(upstreamApiKey !== undefined ? { upstreamApiKey: upstreamApiKey || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(models.id, id), eq(models.deleted, 0)))
    .returning();
  await invalidateModelCache();
  return rows[0] ? mapModel(rows[0]) : null;
}
