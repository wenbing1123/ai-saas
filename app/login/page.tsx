import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/AuthForms';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { listConfiguredProviders } from '@/lib/server/oauth/providers';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { oauthError?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.roles.includes('admin') ? '/admin' : '/dashboard');
  return (
    <LoginForm
      locale={getLocale()}
      oauthProviders={listConfiguredProviders()}
      oauthError={searchParams.oauthError}
    />
  );
}
