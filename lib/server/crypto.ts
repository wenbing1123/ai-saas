import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

/**
 * Self-contained crypto helpers (Node runtime only).
 * No external auth dependency: scrypt password hashing + opaque random tokens.
 */

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** URL-safe opaque secret, e.g. session ids. */
export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Full API key shown to the user exactly once. */
export function generateApiKey(): string {
  return `sk-nebula-${randomBytes(24).toString('hex')}`;
}

/** SHA-256 of an API key / session id for storage and lookup. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Stable short prefix for display, e.g. sk-nebula-a1b2… */
export function keyPrefix(secret: string): string {
  return `${secret.slice(0, 14)}…`;
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
