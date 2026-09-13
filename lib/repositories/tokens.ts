import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { apiTokens } from '@/lib/db/schema';
import { mapApiToken } from './mappers';
import type { ApiToken } from '@/lib/types';
import { TokenStatus } from '@/lib/db/enums';

export interface CreatedApiToken extends ApiToken {
  /** Raw secret, returned exactly once. */
  secret: string;
}

export async function createToken(
  userId: string,
  name: string,
  secret: string,
  keyHash: string,
): Promise<CreatedApiToken> {
  const db = getDb();
  const rows = await db
    .insert(apiTokens)
    .values({
      userId,
      name,
      keyHash,
      prefix: `${secret.slice(0, 14)}…`,
    })
    .returning();
  return { ...mapApiToken(rows[0]), secret };
}

export async function listTokens(userId: string): Promise<ApiToken[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, userId), eq(apiTokens.deleted, 0)))
    .orderBy(desc(apiTokens.createdAt));
  return rows.map(mapApiToken);
}

/** Full token row — gateway authentication only. */
export async function findTokenByHash(keyHash: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.keyHash, keyHash), eq(apiTokens.deleted, 0)))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeToken(userId: string, tokenId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(apiTokens)
    .set({ status: TokenStatus.Revoked, updatedAt: new Date() })
    .where(
      sql`${apiTokens.id} = ${tokenId}::uuid AND ${apiTokens.userId} = ${userId}::uuid AND ${apiTokens.deleted} = 0`,
    )
    .returning({ id: apiTokens.id });
  return rows.length > 0;
}

export async function touchTokenUsage(tokenId: string, ip: string | null) {
  const db = getDb();
  await db
    .update(apiTokens)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      requestCount: sql`request_count + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.deleted, 0)));
}
