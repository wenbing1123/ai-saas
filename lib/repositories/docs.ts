import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { docPages } from '@/lib/db/schema';
import { DocLocale, DOC_LOCALE_CODES } from '@/lib/db/enums';
import type { Locale } from '@/lib/i18n/types';
import type { NewDocPageRow } from '@/lib/db/schema';

export interface DocWriteInput {
  slug: string;
  locale: Locale;
  title: string;
  category: string;
  content: string;
  sortOrder: number;
  enabled: boolean;
}

/** Sidebar + public listings: live & enabled pages of one locale. */
export async function listEnabledDocs(locale: Locale) {
  const db = getDb();
  return db
    .select()
    .from(docPages)
    .where(and(eq(docPages.deleted, 0), eq(docPages.enabled, true), eq(docPages.locale, DOC_LOCALE_CODES[locale])))
    .orderBy(asc(docPages.sortOrder));
}

/** Admin table: every live page, all locales, disabled included. */
export async function listAllDocs() {
  const db = getDb();
  return db
    .select()
    .from(docPages)
    .where(eq(docPages.deleted, 0))
    .orderBy(asc(docPages.sortOrder), asc(docPages.locale));
}

export async function getDocById(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(docPages)
    .where(and(eq(docPages.id, id), eq(docPages.deleted, 0)))
    .limit(1);
  return rows[0] ?? null;
}

/** Fetch a page in the requested locale; falls back to English. */
export async function getDocBySlug(slug: string, locale: Locale) {
  const db = getDb();
  const rows = await db
    .select()
    .from(docPages)
    .where(and(eq(docPages.slug, slug), eq(docPages.deleted, 0), eq(docPages.enabled, true)))
    .limit(2);
  const wanted = DOC_LOCALE_CODES[locale];
  return rows.find((r) => r.locale === wanted) ?? rows.find((r) => r.locale === DocLocale.En) ?? null;
}

export async function getDocBySlugAllLocales(slug: string) {
  const db = getDb();
  return db
    .select()
    .from(docPages)
    .where(and(eq(docPages.slug, slug), eq(docPages.deleted, 0)));
}

export async function createDoc(input: DocWriteInput) {
  const db = getDb();
  const { locale, ...rest } = input;
  const rows = await db
    .insert(docPages)
    .values({ ...rest, locale: DOC_LOCALE_CODES[locale] } as NewDocPageRow)
    .returning();
  return rows[0]!;
}

export async function updateDoc(id: string, input: Partial<DocWriteInput>) {
  const db = getDb();
  const { locale, ...rest } = input;
  const rows = await db
    .update(docPages)
    .set({
      ...rest,
      ...(locale ? { locale: DOC_LOCALE_CODES[locale] } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(docPages.id, id), eq(docPages.deleted, 0)))
    .returning();
  return rows[0] ?? null;
}

export async function softDeleteDoc(id: string) {
  const db = getDb();
  await db
    .update(docPages)
    .set({ deleted: 1, updatedAt: new Date() })
    .where(and(eq(docPages.id, id), eq(docPages.deleted, 0)));
}
