'use server';

import { revalidatePath } from 'next/cache';
import { docFormSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requirePermission } from '@/lib/server/auth';
import {
  getDocById,
  getDocBySlugAllLocales,
  createDoc,
  updateDoc,
  softDeleteDoc,
} from '@/lib/repositories/docs';
import { DOC_LOCALE_CODES } from '@/lib/db/enums';

export async function createDocAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requirePermission('doc:manage');
  const parsed = docFormSchema.safeParse({
    ...Object.fromEntries(formData),
    enabled: formData.get('enabled') === 'on',
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const d = parsed.data;
  const wantedLocale = DOC_LOCALE_CODES[d.locale];
  const conflicts = await getDocBySlugAllLocales(d.slug);
  if (conflicts.some((c) => c.locale === wantedLocale)) {
    return { ok: false, fieldErrors: { slug: `A ${d.locale} page with this slug already exists.` } };
  }

  await createDoc(d);
  revalidatePath('/admin/docs');
  revalidatePath('/docs/[slug]', 'page');
  revalidatePath('/docs', 'page');
  return { ok: true };
}

export async function updateDocAction(
  docId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission('doc:manage');
  const existing = await getDocById(docId);
  if (!existing) return { ok: false, error: 'Page not found.' };

  const parsed = docFormSchema.safeParse({
    ...Object.fromEntries(formData),
    enabled: formData.get('enabled') === 'on',
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const d = parsed.data;
  const wantedLocale = DOC_LOCALE_CODES[d.locale];
  const conflicts = await getDocBySlugAllLocales(d.slug);
  if (conflicts.some((c) => c.locale === wantedLocale && c.id !== existing.id)) {
    return { ok: false, fieldErrors: { slug: `A ${d.locale} page with this slug already exists.` } };
  }

  await updateDoc(docId, d);
  revalidatePath('/admin/docs');
  revalidatePath('/docs/[slug]', 'page');
  return { ok: true };
}

export async function deleteDocAction(docId: string): Promise<ActionResult> {
  await requirePermission('doc:manage');
  const existing = await getDocById(docId);
  if (!existing) return { ok: false, error: 'Page not found.' };
  await softDeleteDoc(docId);
  revalidatePath('/admin/docs');
  revalidatePath('/docs/[slug]', 'page');
  return { ok: true };
}
