import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Shell } from '@/components/auth/AuthForms';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Activate account' };

export default function ActivateResultPage({ searchParams }: { searchParams: { state?: string } }) {
  const locale = getLocale();
  const t = getDict(locale).marketing.accountEmail.activate;

  if (searchParams.state === 'already') {
    return (
      <Shell
        title={t.alreadyTitle}
        subtitle=""
        footer={
          <Link href="/login" className="font-medium underline underline-offset-4">
            {t.goLogin}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-sm text-muted-foreground">{t.alreadyDesc}</p>
          <Link href="/login" className="text-sm font-medium underline underline-offset-4">
            {t.goLogin}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={t.invalidTitle}
      subtitle=""
      footer={
        <Link href="/register/verify" className="font-medium underline underline-offset-4">
          {t.requestNew}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-sm text-muted-foreground">{t.invalidDesc}</p>
        <Link href="/register/verify" className="text-sm font-medium underline underline-offset-4">
          {t.requestNew}
        </Link>
      </div>
    </Shell>
  );
}
