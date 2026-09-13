import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { plans as plansTable } from '@/lib/db/schema';
import { mapPlan } from './mappers';
import { localizeDtos, type TranslatableField } from './i18n';
import type { Locale } from '@/lib/i18n/types';
import type { Plan } from '@/lib/types';

/** Entity code used as the translation-table key for packages. */
export const PLAN_ENTITY = 'plan';

/**
 * Translatable plan fields (the @Translatable declaration).
 * Base columns hold English (fallback); other locales live in
 * sys_i18n_translation. `features` is a JSON-encoded string[].
 */
export const PLAN_TRANSLATABLE_FIELDS = [
  { field: 'name' },
  { field: 'description' },
  { field: 'features', json: true },
] as const satisfies readonly TranslatableField[];

export interface PlanWriteInput {
  slug: string;
  name: string;
  description?: string | null;
  priceCents: number;
  creditCents: number;
  validDays: number;
  rateLimitRpm: number;
  maxConcurrency: number;
  allowedModelIds: string[];
  features: string[];
  highlighted: boolean;
  active: boolean;
  sortOrder: number;
}

export async function listPlans(activeOnly = false, locale?: Locale): Promise<Plan[]> {
  const db = getDb();
  const where = activeOnly
    ? and(eq(plansTable.deleted, 0), eq(plansTable.active, true))
    : eq(plansTable.deleted, 0);
  const rows = await db
    .select()
    .from(plansTable)
    .where(where)
    .orderBy(asc(plansTable.sortOrder));
  const plans = rows.map(mapPlan);
  return localizeDtos(PLAN_ENTITY, plans, PLAN_TRANSLATABLE_FIELDS, locale);
}

export async function getPlanBySlug(slug: string, locale?: Locale): Promise<Plan | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(plansTable)
    .where(and(eq(plansTable.slug, slug), eq(plansTable.deleted, 0)))
    .limit(1);
  if (!rows[0]) return null;
  const [plan] = await localizeDtos(
    PLAN_ENTITY,
    [mapPlan(rows[0])],
    PLAN_TRANSLATABLE_FIELDS,
    locale,
  );
  return plan;
}

export async function getPlanById(id: string, locale?: Locale): Promise<Plan | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(plansTable)
    .where(and(eq(plansTable.id, id), eq(plansTable.deleted, 0)))
    .limit(1);
  if (!rows[0]) return null;
  const [plan] = await localizeDtos(
    PLAN_ENTITY,
    [mapPlan(rows[0])],
    PLAN_TRANSLATABLE_FIELDS,
    locale,
  );
  return plan;
}

function toInsert(input: PlanWriteInput) {
  const { priceCents, creditCents, ...rest } = input;
  return { ...rest, priceCents: BigInt(priceCents), creditCents: BigInt(creditCents) };
}

export async function createPlan(input: PlanWriteInput) {
  const db = getDb();
  const rows = await db.insert(plansTable).values(toInsert(input)).returning();
  return mapPlan(rows[0]);
}

export async function updatePlan(id: string, patch: Partial<PlanWriteInput>) {
  const db = getDb();
  const set = { updatedAt: new Date() } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'priceCents' || key === 'creditCents') {
      set[key] = BigInt(value as number);
    } else {
      set[key] = value;
    }
  }
  const rows = await db
    .update(plansTable)
    .set(set)
    .where(and(eq(plansTable.id, id), eq(plansTable.deleted, 0)))
    .returning();
  return rows[0] ? mapPlan(rows[0]) : null;
}
