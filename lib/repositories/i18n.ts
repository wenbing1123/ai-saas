/**
 * Generic DTO localization on top of sys_i18n_translation.
 *
 * Model (Java-style annotation equivalent for TS repositories):
 *   1. Base tables always carry the fallback-language text ({@link FALLBACK_LOCALE}).
 *   2. Each entity declares its translatable fields once:
 *        const FIELDS = [{ field: 'name' }, { field: 'features', json: true }] as const;
 *      (that declaration is the TS counterpart of a @Translatable annotation).
 *   3. Repository list/get methods accept an optional locale and call
 *      {@link localizeDtos}; DTOs come back already translated. Missing
 *      translations transparently keep the fallback column value.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { translations as trTable } from '@/lib/db/schema';
import { DOC_LOCALE_CODES } from '@/lib/db/enums';
import type { Locale } from '@/lib/i18n/types';

/** Language stored in base columns; every other locale falls back to it. */
export const FALLBACK_LOCALE: Locale = 'en';

export interface TranslatableField<K extends string = string> {
  field: K;
  /** true when the value column holds JSON (e.g. string[] plan features). */
  json?: boolean;
}

/** entityId → field → raw value */
type TranslationMap = Map<string, Map<string, string>>;

/** Batch-load translations for many entities of one type in a single query. */
export async function getTranslationMap(
  entityType: string,
  entityIds: string[],
  locale: Locale,
): Promise<TranslationMap> {
  const map: TranslationMap = new Map();
  if (entityIds.length === 0 || locale === FALLBACK_LOCALE) return map;

  const db = getDb();
  const rows = await db
    .select()
    .from(trTable)
    .where(
      and(
        eq(trTable.entityType, entityType),
        inArray(trTable.entityId, entityIds),
        eq(trTable.locale, DOC_LOCALE_CODES[locale]),
        eq(trTable.deleted, 0),
      ),
    );

  for (const r of rows) {
    let byEntity = map.get(r.entityId);
    if (!byEntity) {
      byEntity = new Map();
      map.set(r.entityId, byEntity);
    }
    byEntity.set(r.field, r.value);
  }
  return map;
}

/**
 * Overlay declared translatable fields onto DTOs.
 * Fields without a translation keep their base-column (fallback) value.
 */
export function applyTranslations<T extends { id: string }, K extends string>(
  items: T[],
  fields: readonly TranslatableField<K>[],
  map: TranslationMap,
): T[] {
  return items.map((item) => {
    const byField = map.get(item.id);
    if (!byField) return item;

    let changed = false;
    const patch: Record<string, unknown> = {};
    for (const { field, json } of fields) {
      const raw = byField.get(field);
      if (raw === undefined) continue;
      if (json) {
        try {
          patch[field] = JSON.parse(raw);
          changed = true;
        } catch {
          // Malformed JSON translation → keep fallback value.
        }
      } else {
        patch[field] = raw;
        changed = true;
      }
    }
    return changed ? { ...item, ...patch } : item;
  });
}

/**
 * One-call DTO hydration — the "@Translatable" processor.
 * Passing no locale (or the fallback locale) returns the DTOs untouched.
 */
export async function localizeDtos<T extends { id: string }, K extends string>(
  entityType: string,
  items: T[],
  fields: readonly TranslatableField<K>[],
  locale?: Locale,
): Promise<T[]> {
  if (!locale || locale === FALLBACK_LOCALE || items.length === 0) return items;
  const map = await getTranslationMap(entityType, items.map((i) => i.id), locale);
  return applyTranslations(items, fields, map);
}

/** All translations of one entity, shaped for admin forms: locale → field → value. */
export async function getEntityTranslations(
  entityType: string,
  entityId: string,
): Promise<Partial<Record<Locale, Record<string, string>>>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(trTable)
    .where(and(eq(trTable.entityType, entityType), eq(trTable.entityId, entityId), eq(trTable.deleted, 0)));

  const out: Partial<Record<Locale, Record<string, string>>> = {};
  for (const r of rows) {
    const locale = r.locale === DOC_LOCALE_CODES.zh ? 'zh' : 'en';
    (out[locale] ??= {})[r.field] = r.value;
  }
  return out;
}

/**
 * Replace all translations for one entity+locale. Empty/null/blank values
 * remove the row so the field falls back to the base column.
 */
export async function replaceTranslations(
  entityType: string,
  entityId: string,
  locale: Locale,
  entries: { field: string; value: string | null | undefined }[],
): Promise<void> {
  if (locale === FALLBACK_LOCALE) return;
  const db = getDb();
  const localeCode = DOC_LOCALE_CODES[locale];

  await db
    .delete(trTable)
    .where(
      and(eq(trTable.entityType, entityType), eq(trTable.entityId, entityId), eq(trTable.locale, localeCode)),
    );

  const live = entries
    .map((e) => ({ ...e, value: e.value?.trim() ?? '' }))
    .filter((e) => e.value.length > 0);
  if (live.length === 0) return;

  await db.insert(trTable).values(
    live.map((e) => ({
      entityType,
      entityId,
      field: e.field,
      locale: localeCode,
      value: e.value,
    })),
  );
}
