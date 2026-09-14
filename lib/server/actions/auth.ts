'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { registerSchema, loginSchema, changePasswordSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { createUser, findAuthUserByEmail, changeUserPassword, getUserById } from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/server/crypto';
import { startSession, destroySession, requireUser } from '@/lib/server/auth';
import { UserStatus, CampaignType } from '@/lib/db/enums';
import { claimCampaign } from '@/lib/server/campaign-service';

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const existing = await findAuthUserByEmail(parsed.data.email);
  if (existing) {
    return { ok: false, fieldErrors: { email: 'An account with this email already exists.' } };
  }

  const user = await createUser(parsed.data);
  // Best-effort sign-up bonus — failure must not block registration.
  await claimCampaign(CampaignType.Register, user.id, { source: 'register' }).catch(() => null);
  await startSession(user.id);
  redirect('/dashboard');
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
