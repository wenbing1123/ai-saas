'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MailCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSuccess } from '@/components/ui/form';
import { Shell } from './AuthForms';
import { apiPostForm } from '@/lib/client/api';
import { type ApiResponse, fieldErrorsOf, initialApiResponse } from '@/lib/server/api-response';
import { getDict } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';

/** Small helper: controlled form submit → POST endpoint → ApiResponse state. */
function useApiForm() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ApiResponse>(initialApiResponse());
  const submit = (e: React.FormEvent<HTMLFormElement>, url: string) => {
    e.preventDefault();
    startTransition(async () => {
      setState(await apiPostForm(url, new FormData(e.currentTarget)));
    });
  };
  return { pending, state, submit };
}

/** "Check your inbox" page — resend the activation link. */
export function ResendActivationForm({ locale, email }: { locale: Locale; email?: string }) {
  const t = getDict(locale).marketing.accountEmail.verify;
  const { pending, state, submit } = useApiForm();
  return (
    <Shell title={t.title} subtitle={t.subtitle} footer={<BackToLogin locale={locale} />}>
      {email ? (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">{t.desc(email)}</p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">{t.spamHint}</p>
      )}
      <form onSubmit={(e) => submit(e, '/api/auth/resend-activation')} className="space-y-4">
        <FormError message={state.msg} />
        {state.code === '0000' && <FormSuccess message={t.resendIdle} />}
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <Field label={getDict(locale).marketing.login.email} htmlFor="email" error={fieldErrorsOf(state)?.email}>
            <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
          </Field>
        )}
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.resend}
        </Button>
      </form>
    </Shell>
  );
}

/** Forgot-password: enter email → generic "check your inbox" confirmation. */
export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).marketing.accountEmail.forgot;
  const { pending, state, submit } = useApiForm();

  if (state.code === '0000') {
    return (
      <Shell title={t.doneTitle} subtitle="" footer={<BackToLogin locale={locale} />}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <MailCheck className="h-12 w-12 text-primary" />
          <p className="text-sm text-muted-foreground">{t.doneDesc}</p>
          <Link href="/login" className="text-sm font-medium underline underline-offset-4">
            {t.backToLogin}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={t.title} subtitle={t.subtitle} footer={<BackToLogin locale={locale} />}>
      <form onSubmit={(e) => submit(e, '/api/auth/forgot-password')} className="space-y-4">
        <FormError message={state.msg} />
        <Field label={t.email} htmlFor="email" error={fieldErrorsOf(state)?.email}>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.submit}
        </Button>
      </form>
    </Shell>
  );
}

/** Reset-password: new password form, swapped for a success panel once consumed. */
export function ResetPasswordForm({ locale, token }: { locale: Locale; token: string }) {
  const t = getDict(locale).marketing.accountEmail.reset;
  const { pending, state, submit } = useApiForm();

  if (state.code === '0000') {
    return (
      <Shell title={t.doneTitle} subtitle="" footer={<BackToLogin locale={locale} />}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-sm text-muted-foreground">{t.doneDesc}</p>
          <Link href="/login" className="text-sm font-medium underline underline-offset-4">
            {t.goLogin}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={t.title} subtitle={t.subtitle} footer={<BackToLogin locale={locale} />}>
      <form onSubmit={(e) => submit(e, '/api/auth/reset-password')} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <FormError message={state.msg} />
        <Field label={t.newPassword} htmlFor="newPassword" hint={t.passwordHint} error={fieldErrorsOf(state)?.newPassword}>
          <Input id="newPassword" name="newPassword" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label={t.confirmPassword} htmlFor="confirmPassword" error={fieldErrorsOf(state)?.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.submit}
        </Button>
      </form>
    </Shell>
  );
}

function BackToLogin({ locale }: { locale: Locale }) {
  const t = getDict(locale).marketing.accountEmail;
  return (
    <Link href="/login" className="font-medium underline underline-offset-4">
      {t.verify.backToLogin}
    </Link>
  );
}
