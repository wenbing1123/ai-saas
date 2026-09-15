import type { Metadata } from 'next';
import { ResendActivationForm } from '@/components/auth/AccountForms';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyEmailPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : undefined;
  return <ResendActivationForm locale={getLocale()} email={email} />;
}
