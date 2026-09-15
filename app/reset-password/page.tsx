import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { ResetPasswordForm } from '@/components/auth/AccountForms';
import { Shell } from '@/components/auth/AuthForms';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { peekValidEmailToken } from '@/lib/repositories/email-tokens';
import { EmailTokenPurpose } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const locale = getLocale();
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const valid = token ? !!(await peekValidEmailToken(token, EmailTokenPurpose.PasswordReset)) : false;

  if (!valid) {
    const t = getDict(locale).marketing.accountEmail.reset;
    return (
      <Shell
        title={t.invalidTitle}
        subtitle=""
        footer={
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            {t.requestNew}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="text-sm text-muted-foreground">{t.invalidDesc}</p>
          <Link href="/forgot-password" className="text-sm font-medium underline underline-offset-4">
            {t.requestNew}
          </Link>
        </div>
      </Shell>
    );
  }

  return <ResetPasswordForm locale={locale} token={token} />;
}
