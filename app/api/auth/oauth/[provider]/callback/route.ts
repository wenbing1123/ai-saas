import { NextResponse } from 'next/server';
import { getOAuthProvider, consumeOAuthState } from '@/lib/server/oauth/providers';
import { logger } from '@/lib/server/logger';
import { findOrCreateOAuthUser } from '@/lib/repositories/oauth';
import { startSession } from '@/lib/server/auth';
import { UserStatus } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/[provider]/callback — IdP redirects here with ?code&state.
 * Validates CSRF state → exchanges code → fetches profile → signs the user in
 * (creating/linking the local account on first sight) → redirects to dashboard.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const back = (path: string) => NextResponse.redirect(new URL(path, url));

  const provider = getOAuthProvider(providerId);
  if (!provider || !provider.isConfigured()) {
    return back('/login?oauthError=provider_unavailable');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const idpError = url.searchParams.get('error'); // user clicked "deny" at the IdP
  if (idpError || !code || !state) {
    return back('/login?oauthError=cancelled');
  }

  // CSRF: state must be one we minted for this exact provider.
  if (!(await consumeOAuthState(state, providerId))) {
    return back('/login?oauthError=invalid_state');
  }

  try {
    const accessToken = await provider.exchangeCode(code);
    const profile = await provider.fetchProfile(accessToken);
    const user = await findOrCreateOAuthUser(providerId, profile);

    if (user.status === UserStatus.Suspended) {
      return back('/login?oauthError=account_suspended');
    }

    await startSession(user.id);
    return NextResponse.redirect(new URL('/dashboard', url));
  } catch (err) {
    logger.error({ err, provider: providerId }, '[oauth] sign-in failed');
    return back('/login?oauthError=sign_in_failed');
  }
}
