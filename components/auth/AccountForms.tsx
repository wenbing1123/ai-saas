'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { MailCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FormError, FormSuccess, SubmitButton } from '@/components/ui/form';
import { Shell } from './AuthForms';
import { resendActivationAction, forgotPasswordAction, resetPasswordAction } from '@/lib/server/actions/auth';
import { getDict } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import type { ActionResult } from '@/lib/validators';

const initial: ActionResult = { ok: false };

/** "Check your inbox" page — resend the activation link. */
export function ResendActivationForm({ locale, email }: { locale: Locale; email?: string }) {
  const t = getDict(locale).marketing.accountEmail.verify;
  const [state, formAction] = useFormState(resendActivationAction, initial);
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
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        {state.ok && <FormSuccess message={t.resendIdle} />}
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <Field label={getDict(locale).marketing.login.email} htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
          </Field>
        )}
        <SubmitButton variant="outline" className="w-full">{t.resend}</SubmitButton>
      </form>
    </Shell>
  );
}

/** Forgot-password: enter email → generic "check your inbox" confirmation. */
export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).marketing.accountEmail.forgot;
  const [state, formAction] = useFormState(forgotPasswordAction, initial);

  if (state.ok) {
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
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field label={t.email} htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full">{t.submit}</SubmitButton>
      </form>
    </Shell>
  );
}

/** Reset-password: new password form, swapped for a success panel once consumed. */
export function ResetPasswordForm({ locale, token }: { locale: Locale; token: string }) {
  const t = getDict(locale).marketing.accountEmail.reset;
  const [state, formAction] = useFormState(resetPasswordAction, initial);

  if (state.ok) {
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
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <FormError message={state.error} />
        <Field label={t.newPassword} htmlFor="newPassword" hint={t.passwordHint} error={state.fieldErrors?.newPassword}>
          <Input id="newPassword" name="newPassword" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label={t.confirmPassword} htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton className="w-full">{t.submit}</SubmitButton>
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
