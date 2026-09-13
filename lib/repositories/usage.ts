import { and, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { usageRecords } from '@/lib/db/schema';
import { mapUsage } from './mappers';
import { Provider, UsageStatus } from '@/lib/db/enums';

export interface NewUsageRecord {
  userId: string;
  tokenId: string | null;
  modelId: string;
  provider: Provider;
  requestId?: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costCents: string;
  chargeCents: string;
  debitCents: bigint;
  latencyMs: number;
  statusCode?: number | null;
  status: UsageStatus;
  errorMessage?: string | null;
}

export async function insertUsage(input: NewUsageRecord) {
  const db = getDb();
  const rows = await db.insert(usageRecords).values(input).returning();
  return mapUsage(rows[0]);
}

interface UsageFilter {
  userId?: string;
  modelId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

function buildFilter(f: UsageFilter): SQL[] {
  const conds: SQL[] = [eq(usageRecords.deleted, 0)];
  if (f.userId) conds.push(eq(usageRecords.userId, f.userId));
  if (f.modelId) conds.push(eq(usageRecords.modelId, f.modelId));
  if (f.since) conds.push(gte(usageRecords.createdAt, f.since));
  if (f.until) conds.push(sql`${usageRecords.createdAt} < ${f.until}`);
  return conds;
}

export async function listUsage(f: UsageFilter = {}) {
  const db = getDb();
  const conds = buildFilter(f);
  const where = conds.length ? and(...conds)! : undefined;
  const { limit = 25, offset = 0 } = f;

  const [rows, totalRows] = await Promise.all([
    db.select().from(usageRecords).where(where).orderBy(desc(usageRecords.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<string>`count(*)::int` }).from(usageRecords).where(where),
  ]);
  return { records: rows.map(mapUsage), total: Number(totalRows[0]?.count ?? 0) };
}

export interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  chargeCents: number;
}

export async function getUsageTotals(f: UsageFilter = {}): Promise<UsageTotals> {
  const db = getDb();
  const conds = buildFilter(f);
  // Errors before upstream execution record no tokens; count all non-blocked rows.
  const where = conds.length ? and(...conds)! : undefined;
  const rows = await db
    .select({
      requests: sql<string>`count(*)::int`,
      inputTokens: sql<string>`coalesce(sum(${usageRecords.inputTokens}),0)::float`,
      outputTokens: sql<string>`coalesce(sum(${usageRecords.outputTokens}),0)::float`,
      costCents: sql<string>`coalesce(sum(${usageRecords.costCents}),0)::float`,
      chargeCents: sql<string>`coalesce(sum(${usageRecords.chargeCents}),0)::float`,
    })
    .from(usageRecords)
    .where(where);
  const r = rows[0];
  return {
    requests: Number(r?.requests ?? 0),
    inputTokens: Number(r?.inputTokens ?? 0),
    outputTokens: Number(r?.outputTokens ?? 0),
    costCents: Number(r?.costCents ?? 0),
    chargeCents: Number(r?.chargeCents ?? 0),
  };
}

export interface DailyUsagePoint {
  day: string;
  requests: number;
  chargeCents: number;
  costCents: number;
}

export async function getDailyUsage(userId: string | undefined, days: number): Promise<DailyUsagePoint[]> {
  const db = getDb();
  const rows = await db.execute<{ day: string; requests: number; charge_cents: string; cost_cents: string }>(sql`
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
      count(*)::int AS requests,
      coalesce(sum(charge_cents), 0)::float AS charge_cents,
      coalesce(sum(cost_cents), 0)::float AS cost_cents
    FROM bill_usage_record
    WHERE deleted = 0 AND created_at >= now() - (${days} || ' days')::interval
      ${userId ? sql`AND user_id = ${userId}::uuid` : sql``}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({
    day: r.day,
    requests: Number(r.requests),
    chargeCents: Number(r.charge_cents),
    costCents: Number(r.cost_cents),
  }));
}

export interface ModelUsageRow {
  modelId: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  chargeCents: number;
}

export async function getUsageByModel(since: Date, userId?: string): Promise<ModelUsageRow[]> {
  const db = getDb();
  const rows = await db.execute<{
    model_id: string;
    requests: number;
    input_tokens: string;
    output_tokens: string;
    cost_cents: string;
    charge_cents: string;
  }>(sql`
    SELECT
      model_id,
      count(*)::int AS requests,
      coalesce(sum(input_tokens),0)::float AS input_tokens,
      coalesce(sum(output_tokens),0)::float AS output_tokens,
      coalesce(sum(cost_cents),0)::float AS cost_cents,
      coalesce(sum(charge_cents),0)::float AS charge_cents
    FROM bill_usage_record
    WHERE deleted = 0 AND created_at >= ${since.toISOString()}::timestamptz
      ${userId ? sql`AND user_id = ${userId}::uuid` : sql``}
    GROUP BY model_id
    ORDER BY charge_cents DESC
  `);
  return rows.map((r) => ({
    modelId: r.model_id,
    requests: Number(r.requests),
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    costCents: Number(r.cost_cents),
    chargeCents: Number(r.charge_cents),
  }));
}
