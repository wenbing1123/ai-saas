import Link from 'next/link';
import { ExternalLink, Plus } from 'lucide-react';
import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocDeleteButton } from '@/components/admin/DocDeleteButton';
import { requirePermission } from '@/lib/server/auth';
import { listAllDocs } from '@/lib/repositories/docs';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { DOC_LOCALE_LABELS } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

export default async function AdminDocsPage() {
  await requirePermission('doc:manage');
  const locale = getLocale();
  const t = getDict(locale);
  const cms = t.admin.docsCms;
  const docs = await listAllDocs();

  return (
    <>
      <PageHeader
        title={cms.title}
        subtitle={cms.subtitle}
        action={
          <Button asChild size="sm">
            <Link href="/admin/docs/new">
              <Plus className="mr-1 h-4 w-4" />
              {cms.new}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{cms.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{cms.table.title}</th>
                    <th className="py-2 pr-4 font-medium">{cms.table.locale}</th>
                    <th className="py-2 pr-4 font-medium">{cms.table.category}</th>
                    <th className="py-2 pr-4 font-medium">{cms.table.slug}</th>
                    <th className="py-2 pr-4 text-right font-medium">{cms.table.sort}</th>
                    <th className="py-2 pr-4 font-medium">{cms.table.status}</th>
                    <th className="py-2 text-right font-medium">{cms.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{d.title}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline">{DOC_LOCALE_LABELS[d.locale].toUpperCase()}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{d.category}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{d.slug}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{d.sortOrder}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={d.enabled ? 'secondary' : 'outline'}>
                          {d.enabled ? cms.enabled : cms.disabled}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/docs/${d.slug}`} target="_blank">
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              {cms.view}
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/docs/${d.id}`}>{cms.edit}</Link>
                          </Button>
                          <DocDeleteButton id={d.id} locale={locale} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
