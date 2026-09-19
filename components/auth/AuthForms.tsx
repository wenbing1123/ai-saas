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

export function LoginForm({ locale, oauthProviders = [], oauthError }: { locale: Locale; oauthProviders?: string[]; oauthError?: string }) {
  const t = getDict(locale).marketing.login;
  const [state, formAction] = useFormState(loginAction, initial);
  const oauthErrorText = oauthError
    ? t.oauthErrors[oauthError as keyof typeof t.oauthErrors] ?? t.oauthErrors.sign_in_failed
    : null;
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
        <FormError message={state.error ?? oauthErrorText ?? undefined} />
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
      {oauthProviders.length > 0 && (
        <>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t.orContinue}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {oauthProviders.includes('google') && (
              <a href="/api/auth/oauth/google" className={oauthBtnClass}>
                <GoogleIcon /> {t.oauthGoogle}
              </a>
            )}
            {oauthProviders.includes('github') && (
              <a href="/api/auth/oauth/github" className={oauthBtnClass}>
                <GithubIcon /> {t.oauthGithub}
              </a>
            )}
          </div>
        </>
      )}
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

const oauthBtnClass =
  'flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.05.78 2.13v3.16c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
