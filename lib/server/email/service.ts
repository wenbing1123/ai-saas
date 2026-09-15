import { getRedis, prefixedKey } from '@/lib/redis/client';
import { redisKeys, redisTtl, EMAIL_HOURLY_LIMIT } from '@/lib/redis/keys';
import { issueEmailToken } from '@/lib/repositories/email-tokens';
import { EmailTokenPurpose } from '@/lib/db/enums';
import { appConfig } from '@/config/app';
import type { Locale } from '@/lib/i18n/types';
import { sendEmail } from './mailer';
import { renderActivationMail, renderResetMail } from './templates';

/**
 * High-level transactional mail flows: token issuance + rate limiting +
 * delivery. Frequency control lives server-side (per email address): a short
 * cooldown between sends plus an hourly cap, so the endpoint cannot be abused
 * as an open relay or a mailbox flooder.
 */

export const ACTIVATION_TOKEN_TTL_HOURS = 24;
export const RESET_TOKEN_TTL_HOURS = 1;

export class EmailRateLimitedError extends Error {
  constructor() {
    super('Please wait a minute before requesting another email.');
    this.name = 'EmailRateLimitedError';
  }
}

interface MailRecipient {
  id: string;
  email: string;
  name: string;
}

async function assertEmailQuota(email: string): Promise<void> {
  const redis = getRedis();
  // SET NX EX — only the first call inside the cooldown window succeeds.
  const acquired = await redis.set(
    prefixedKey(redisKeys.emailCooldown(email)),
    '1',
    'EX',
    redisTtl.emailCooldown,
    'NX',
  );
  if (acquired !== 'OK') throw new EmailRateLimitedError();

  const count = await redis.incr(prefixedKey(redisKeys.emailHourly(email)));
  if (count === 1) await redis.expire(prefixedKey(redisKeys.emailHourly(email)), redisTtl.emailHourly);
  if (count > EMAIL_HOURLY_LIMIT) throw new EmailRateLimitedError();
}

function appOrigin(): string {
  return appConfig.appUrl.replace(/\/+$/, '');
}

export async function sendActivationEmail(user: MailRecipient, locale: Locale): Promise<void> {
  await assertEmailQuota(user.email);
  const token = await issueEmailToken(user.id, EmailTokenPurpose.Activate, ACTIVATION_TOKEN_TTL_HOURS);
  const url = `${appOrigin()}/activate?token=${encodeURIComponent(token)}`;
  await sendEmail({
    ...renderActivationMail(locale, { name: user.name, url }),
    to: user.email,
  });
}

export async function sendPasswordResetEmail(user: MailRecipient, locale: Locale): Promise<void> {
  await assertEmailQuota(user.email);
  const token = await issueEmailToken(user.id, EmailTokenPurpose.PasswordReset, RESET_TOKEN_TTL_HOURS);
  const url = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    ...renderResetMail(locale, { name: user.name, url }),
    to: user.email,
  });
}
