import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ForgotPasswordForm } from '@/components/auth/AccountForms';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reset password' };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return <ForgotPasswordForm locale={getLocale()} />;
}
