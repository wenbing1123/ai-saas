import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';

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

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false; // OAuth-only account has no local password.
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

// ---------------------------------------------------------------------------
// Application-key encryption (AES-256-GCM) — e.g. re-viewable API keys.
// Key source: ENCRYPTION_KEY env, 64 hex chars (32 bytes). When unset the
// helpers return null and callers must degrade gracefully.
// Payload format: hex(iv).hex(authTag).hex(ciphertext)
// ---------------------------------------------------------------------------

function appKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, 'hex');
}

/** Encrypt `plaintext`; null when ENCRYPTION_KEY is not configured. */
export function encryptWithAppKey(plaintext: string): string | null {
  const key = appKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}.${cipher.getAuthTag().toString('hex')}.${ciphertext.toString('hex')}`;
}

/** Decrypt a payload produced by `encryptWithAppKey`; null on any failure. */
export function decryptWithAppKey(payload: string): string | null {
  const key = appKey();
  if (!key) return null;
  const [ivHex, tagHex, dataHex] = payload.split('.');
  if (!ivHex || !tagHex || !dataHex) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
