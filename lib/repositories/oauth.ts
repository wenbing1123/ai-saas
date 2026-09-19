import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { oauthAccounts, roles, userRoles, users } from '@/lib/db/schema';
import { mapUser } from './mappers';
import type { User } from '@/lib/types';
import { generateUniqueInviteCode } from './invites';
import type { OAuthProfile } from '@/lib/server/oauth/providers';

/**
 * OAuth sign-in: find the linked local user, or provision one.
 * - Existing link  → return the user.
 * - Same email already registered → link the provider to that account.
 * - Otherwise create a fresh user (email considered verified by the IdP,
 *   no local password yet) and link.
 */
export async function findOrCreateOAuthUser(
  provider: string,
  profile: OAuthProfile,
): Promise<User> {
  const db = getDb();

  // 1. Linked before → sign in.
  const linked = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, profile.providerAccountId),
        eq(oauthAccounts.deleted, 0),
      ),
    )
    .limit(1);
  if (linked.length > 0) {
    const rows = await db.select().from(users).where(eq(users.id, linked[0].userId)).limit(1);
    return mapUser(rows[0]);
  }

  return db.transaction(async (tx) => {
    // 2. Same email exists → link provider to the existing account.
    const existing = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, profile.email), eq(users.deleted, 0)))
      .limit(1);

    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      // 3. Provision a new user. IdP-verified email → skip activation mail.
      const inserted = await tx
        .insert(users)
        .values({
          email: profile.email,
          passwordHash: null,
          name: profile.name.slice(0, 100),
          emailVerifiedAt: new Date(),
          inviteCode: await generateUniqueInviteCode(),
        })
        .returning({ id: users.id });
      userId = inserted[0].id;

      const roleRows = await tx.select({ id: roles.id }).from(roles).where(eq(roles.code, 'user')).limit(1);
      if (roleRows.length > 0) {
        await tx.insert(userRoles).values({ userId, roleId: roleRows[0].id });
      }
    }

    await tx.insert(oauthAccounts).values({
      userId,
      provider,
      providerAccountId: profile.providerAccountId,
      providerEmail: profile.email,
    });

    const rows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    return mapUser(rows[0]);
  });
}
