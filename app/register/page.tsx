import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/AuthForms';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return <RegisterForm locale={getLocale()} />;
}
