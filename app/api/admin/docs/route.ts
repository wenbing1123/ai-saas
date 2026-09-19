import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { withApi, ok, conflict } from '@/lib/server/wrappers';
import { docFormSchema } from '@/lib/validators';
import { getDocBySlugAllLocales, createDoc } from '@/lib/repositories/docs';
import { DOC_LOCALE_CODES } from '@/lib/db/enums';

type DocFormValues = z.infer<typeof docFormSchema>;

const transform = (fd: FormData) => ({
  ...Object.fromEntries(fd),
  enabled: fd.get('enabled') === 'on',
});

/** POST /api/admin/docs — create a CMS page. */
export const POST = withApi(
  { permission: 'doc:manage', schema: docFormSchema, transformFormData: transform },
  async ({ input }) => {
    const data = input as DocFormValues;
    const wantedLocale = DOC_LOCALE_CODES[data.locale];
    const conflicts = await getDocBySlugAllLocales(data.slug);
    if (conflicts.some((c) => c.locale === wantedLocale)) {
      throw conflict(`A ${data.locale} page with this slug already exists.`, {
        fieldErrors: { slug: `A ${data.locale} page with this slug already exists.` },
      });
    }
    await createDoc(data);
    revalidatePath('/admin/docs');
    revalidatePath('/docs/[slug]', 'page');
    revalidatePath('/docs', 'page');
    return ok({}, '页面已创建');
  },
);
