import { redirect } from 'next/navigation';
import { listEnabledDocs } from '@/lib/repositories/docs';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function DocsIndexPage() {
  const locale = getLocale();
  const pages = await listEnabledDocs(locale);
  const first = pages[0]?.slug ?? 'quickstart';
  redirect(`/docs/${first}`);
}
