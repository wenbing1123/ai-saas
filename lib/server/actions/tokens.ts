'use server';

import { revalidatePath } from 'next/cache';
import { tokenNameSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requireUser } from '@/lib/server/auth';
import { generateApiKey, sha256 } from '@/lib/server/crypto';
import { createToken, revokeToken } from '@/lib/repositories/tokens';

export type CreatedToken = { secret: string; prefix: string; name: string };

export async function createTokenAction(
  _prev: ActionResult<CreatedToken>,
  formData: FormData,
): Promise<ActionResult<CreatedToken>> {
  const user = await requireUser();
  const parsed = tokenNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const secret = generateApiKey();
  const created = await createToken(user.id, parsed.data.name, secret, sha256(secret));
  revalidatePath('/dashboard/tokens');
  return { ok: true as const, data: { secret, prefix: created.prefix, name: created.name } };
}

export async function revokeTokenAction(tokenId: string): Promise<ActionResult> {
  const user = await requireUser();
  const ok = await revokeToken(user.id, tokenId);
  if (!ok) return { ok: false, error: 'Token not found.' };
  revalidatePath('/dashboard/tokens');
  return { ok: true };
}
