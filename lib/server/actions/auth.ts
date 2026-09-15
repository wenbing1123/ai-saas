'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  emailOnlySchema,
  resetPasswordSchema,
  fieldErrorsFromZod,
} from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import {
  createUser,
  findAuthUserByEmail,
  changeUserPassword,
  getUserById,
} from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/server/crypto';
import { startSession, destroySession, requireUser } from '@/lib/server/auth';
import { UserStatus, EmailTokenPurpose } from '@/lib/db/enums';
import { InviteCodeInvalidError } from '@/lib/repositories/invites';
import { consumeEmailToken } from '@/lib/repositories/email-tokens';
import { sendActivationEmail, sendPasswordResetEmail, EmailRateLimitedError } from '@/lib/server/email/service';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const inviteCode = parsed.data.inviteCode || null;

  const existing = await findAuthUserByEmail(parsed.data.email);
  if (existing) {
    return { ok: false, fieldErrors: { email: 'An account with this email already exists.' } };
  }

  let user;
  try {
    // The invite code lookup is atomic with the user insert (one tx).
    user = await createUser({ ...parsed.data, inviteCode });
  } catch (err) {
    if (err instanceof InviteCodeInvalidError) {
      return { ok: false, fieldErrors: { inviteCode: 'Invalid invite code.' } };
    }
    throw err;
  }

  // Deliver the activation link. Mail failure must not strand the account —
  // the verify page offers resend, and SMTP-less dev logs the link.
  await sendActivationEmail(
    { id: user.id, email: user.email, name: user.name },
    getLocale(),
  ).catch((err) => console.error('[auth] activation email failed:', err));

  redirect(`/register/verify?email=${encodeURIComponent(user.email)}`);
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const row = await findAuthUserByEmail(parsed.data.email);
  if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
    return { ok: false, error: 'Invalid email or password.' };
  }
  if (row.status === UserStatus.Suspended) {
    return { ok: false, error: 'This account has been suspended. Contact support.' };
  }
  if (!row.emailVerifiedAt) {
    const t = getDict(getLocale()).marketing.login;
    return { ok: false, error: t.unverified };
  }

  await startSession(row.id);
  const loggedIn = await getUserById(row.id);
  redirect(loggedIn?.roles.includes('admin') ? '/admin' : '/dashboard');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath('/');
  redirect('/login');
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const row = await findAuthUserByEmail(user.email);
  if (!row || !verifyPassword(parsed.data.currentPassword, row.passwordHash)) {
    return { ok: false, fieldErrors: { currentPassword: 'Current password is incorrect.' } };
  }
  await changeUserPassword(user.id, parsed.data.newPassword);
  return { ok: true };
}

/**
 * Resend the activation link. Always returns a generic response so the
 * endpoint cannot be used to enumerate registered addresses.
 */
export async function resendActivationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const row = await findAuthUserByEmail(parsed.data.email);
    if (row && !row.emailVerifiedAt && row.status !== UserStatus.Suspended) {
      await sendActivationEmail({ id: row.id, email: row.email, name: row.name }, getLocale());
    }
  } catch (err) {
    if (err instanceof EmailRateLimitedError) {
      return { ok: false, error: getDict(getLocale()).marketing.accountEmail.verify.tooSoon };
    }
    throw err;
  }
  return { ok: true };
}

/** Forgot-password: email a single-use reset link if the account exists. */
export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const row = await findAuthUserByEmail(parsed.data.email);
    if (row && row.status !== UserStatus.Suspended) {
      await sendPasswordResetEmail({ id: row.id, email: row.email, name: row.name }, getLocale());
    }
  } catch (err) {
    if (err instanceof EmailRateLimitedError) {
      return { ok: false, error: getDict(getLocale()).marketing.accountEmail.forgot.tooSoon };
    }
    throw err;
  }
  return { ok: true };
}

/** Consume the reset token and set the new password. */
export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const userId = await consumeEmailToken(parsed.data.token, EmailTokenPurpose.PasswordReset);
  if (!userId) {
    return { ok: false, error: 'This reset link is invalid or has expired. Request a new one.' };
  }
  await changeUserPassword(userId, parsed.data.newPassword);
  return { ok: true };
}
