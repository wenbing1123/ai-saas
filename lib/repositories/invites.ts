import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb, type DbTx } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

/**
 * Per-user invite codes — every account gets a unique 6-char code (a-zA-Z0-9)
 * that other users can optionally enter at registration.
 */

const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Generate a random 6-char invite code (a-zA-Z0-9). */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomBytes(1)[0] % CODE_ALPHABET.length];
  }
  return code;
}

/** Trim + collapse whitespace (codes are case-sensitive — no upper-casing). */
export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/\s+/g, '');
}

/**
 * Generate a code not yet used by any live user. Retries on the
 * astronomically unlikely collision.
 */
export async function generateUniqueInviteCode(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.inviteCode, code), eq(users.deleted, 0)))
      .limit(1);
    if (rows.length === 0) return code;
  }
  throw new Error('Failed to generate a unique invite code');
}

/** Raised inside the registration tx when an invite code doesn't match any user. */
export class InviteCodeInvalidError extends Error {
  constructor(message = 'Invalid invite code') {
    super(message);
    this.name = 'InviteCodeInvalidError';
  }
}

/**
 * Look up the inviter by their invite code inside the registration tx.
 * Returns null if the code doesn't match any live user.
 */
export async function resolveInviterTx(tx: DbTx, rawCode: string): Promise<string | null> {
  const code = normalizeInviteCode(rawCode);
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.inviteCode, code), eq(users.deleted, 0)))
    .limit(1);
  return rows[0]?.id ?? null;
}
