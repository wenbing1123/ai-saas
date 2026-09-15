import { NextResponse } from 'next/server';
import { consumeEmailToken } from '@/lib/repositories/email-tokens';
import { getUserById, markEmailVerified } from '@/lib/repositories/users';
import { EmailTokenPurpose, CampaignType } from '@/lib/db/enums';
import { startSession } from '@/lib/server/auth';
import { claimCampaign } from '@/lib/server/campaign-service';

export const dynamic = 'force-dynamic';

/**
 * Activation link landing point (GET /activate?token=…).
 * A Route Handler (not a page) because activating the account logs the user
 * in immediately, and cookies may only be set in a Route Handler/Server Action.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';

  const userId = token ? await consumeEmailToken(token, EmailTokenPurpose.Activate) : null;
  const user = userId ? await getUserById(userId) : null;

  if (!user) {
    return NextResponse.redirect(new URL('/activate/result?state=invalid', url));
  }
  if (user.emailVerifiedAt) {
    return NextResponse.redirect(new URL('/activate/result?state=already', url));
  }

  // First activation: stamp the user, grant the welcome bonus, auto-login.
  await markEmailVerified(user.id);
  // Best-effort welcome bonus — never block activation on campaign failure.
  await claimCampaign(CampaignType.Register, user.id, { source: 'activation' }).catch(() => null);
  await startSession(user.id);

  return NextResponse.redirect(new URL('/dashboard', url));
}
