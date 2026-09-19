import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { withApi, ok, notFound, conflict } from '@/lib/server/wrappers';
import { docFormSchema } from '@/lib/validators';
import {
  getDocById,
  getDocBySlugAllLocales,
  updateDoc,
  softDeleteDoc,
} from '@/lib/repositories/docs';
import { DOC_LOCALE_CODES } from '@/lib/db/enums';

type DocFormValues = z.infer<typeof docFormSchema>;

const transform = (fd: FormData) => ({
  ...Object.fromEntries(fd),
  enabled: fd.get('enabled') === 'on',
});

/** PUT /api/admin/docs/:id — update a CMS page. */
export const PUT = withApi(
  { permission: 'doc:manage', schema: docFormSchema, transformFormData: transform },
  async ({ input, params }) => {
    const data = input as DocFormValues;
    const existing = await getDocById(params.id);
    if (!existing) throw notFound('Page not found.');

    const wantedLocale = DOC_LOCALE_CODES[data.locale];
    const conflicts = await getDocBySlugAllLocales(data.slug);
    if (conflicts.some((c) => c.locale === wantedLocale && c.id !== existing.id)) {
      throw conflict(`A ${data.locale} page with this slug already exists.`, {
        fieldErrors: { slug: `A ${data.locale} page with this slug already exists.` },
      });
    }

    await updateDoc(params.id, data);
    revalidatePath('/admin/docs');
    revalidatePath('/docs/[slug]', 'page');
    return ok({}, '页面已更新');
  },
);

/** DELETE /api/admin/docs/:id — soft-delete a CMS page. */
export const DELETE = withApi({ permission: 'doc:manage' }, async ({ params }) => {
  const existing = await getDocById(params.id);
  if (!existing) throw notFound('Page not found.');
  await softDeleteDoc(params.id);
  revalidatePath('/admin/docs');
  revalidatePath('/docs/[slug]', 'page');
  return ok({}, '页面已删除');
});
