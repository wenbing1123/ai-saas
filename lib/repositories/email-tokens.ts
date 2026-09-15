import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { emailTokens } from '@/lib/db/schema';
import { EmailTokenPurpose } from '@/lib/db/enums';
import { randomSecret, sha256 } from '@/lib/server/crypto';

/**
 * Single-use email tokens (activation / password reset).
 * Only the SHA-256 hash of the raw secret is stored; the raw value travels
 * in the emailed link and is shown nowhere else.
 */

/** Issue a fresh token, invalidating the user's earlier unused tokens of the same purpose. */
export async function issueEmailToken(
  userId: string,
  purpose: EmailTokenPurpose,
  ttlHours: number,
): Promise<string> {
  const db = getDb();
  const raw = randomSecret(32);
  const tokenHash = sha256(raw);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 3600_000);

  await db.transaction(async (tx) => {
    // Newest link wins — retire any outstanding unused token for this purpose.
    await tx
      .update(emailTokens)
      .set({ usedAt: now, updatedAt: now })
      .where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt)));
    await tx.insert(emailTokens).values({ userId, purpose, tokenHash, expiresAt });
  });
  return raw;
}

/** Non-destructive validity check — used by the reset-password page to render its form. */
export async function peekValidEmailToken(rawToken: string, purpose: EmailTokenPurpose): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ userId: emailTokens.userId })
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.tokenHash, sha256(rawToken)),
        eq(emailTokens.purpose, purpose),
        eq(emailTokens.deleted, 0),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * Atomically consume a token (single use). The conditional UPDATE only fires
 * for a live, unused, unexpired row — a replayed link returns null.
 */
export async function consumeEmailToken(rawToken: string, purpose: EmailTokenPurpose): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .update(emailTokens)
    .set({ usedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(emailTokens.tokenHash, sha256(rawToken)),
        eq(emailTokens.purpose, purpose),
        eq(emailTokens.deleted, 0),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: emailTokens.userId });
  return rows[0]?.userId ?? null;
}
