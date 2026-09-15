'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Sparkles, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FormError, SubmitButton } from '@/components/ui/form';
import { loginAction, registerAction } from '@/lib/server/actions/auth';
import { getDict } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import type { ActionResult } from '@/lib/validators';

const initial: ActionResult = { ok: false };

export function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight">Nebula API</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

export function LoginForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).marketing.login;
  const [state, formAction] = useFormState(loginAction, initial);
  return (
    <Shell
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.noAccount}{' '}
          <Link href="/register" className="font-medium underline underline-offset-4">
            {t.createOne}
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        {state.error === t.unverified && (
          <Link
            href="/register/verify"
            className="-mt-2 block text-right text-xs font-medium underline underline-offset-4"
          >
            {getDict(locale).marketing.accountEmail.verify.resend}
          </Link>
        )}
        <Field label={t.email} htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </Field>
        <Field label={t.password} htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-medium underline underline-offset-4">
            {t.forgotPassword}
          </Link>
        </div>
        <SubmitButton className="w-full">{t.submit}</SubmitButton>
      </form>
    </Shell>
  );
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).marketing.register;
  const [state, formAction] = useFormState(registerAction, initial);
  return (
    <Shell
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.alreadyHave}{' '}
          <Link href="/login" className="font-medium underline underline-offset-4">
            {t.signIn}
          </Link>
        </>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Gift className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t.bonus}</span>
      </div>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field label={t.name} htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" placeholder="Ada Lovelace" autoComplete="name" required />
        </Field>
        <Field label={t.email} htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </Field>
        <Field
          label={t.password}
          htmlFor="password"
          hint={t.passwordHint}
          error={state.fieldErrors?.password}
        >
          <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field
          label={t.inviteCode}
          htmlFor="inviteCode"
          hint={t.inviteCodeHint}
          error={state.fieldErrors?.inviteCode}
        >
          <Input
            id="inviteCode"
            name="inviteCode"
            placeholder="e.g. aB3x9Z"
            autoComplete="off"
            className="font-mono tracking-wider"
          />
        </Field>
        <SubmitButton className="w-full">{t.submit}</SubmitButton>
        <p className="text-center text-xs text-muted-foreground">{t.terms}</p>
      </form>
    </Shell>
  );
}
