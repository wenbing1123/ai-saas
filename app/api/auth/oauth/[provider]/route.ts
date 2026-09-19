import { NextResponse } from 'next/server';
import { getOAuthProvider, createOAuthState } from '@/lib/server/oauth/providers';

export const dynamic = 'force-dynamic';

/** GET /api/auth/oauth/[provider] — redirect to the IdP's consent screen. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = getOAuthProvider(providerId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!provider || !provider.isConfigured()) {
    return NextResponse.redirect(new URL('/login?oauthError=provider_unavailable', appUrl));
  }

  const state = await createOAuthState(providerId);
  return NextResponse.redirect(provider.authorizeUrl(state));
}
