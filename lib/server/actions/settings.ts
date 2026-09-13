'use server';

import { revalidatePath } from 'next/cache';
import { settingsFormSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requireAdmin } from '@/lib/server/auth';
import { setSetting } from '@/lib/repositories/settings';
import { PROVIDER_LABELS } from '@/lib/db/enums';
import type { PlatformSettings, UpstreamProviderConfig } from '@/lib/types';

/** Provider labels shown in the admin form, in display order. */
const PROVIDER_LABELS_LIST = Object.values(PROVIDER_LABELS);

export async function updateSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsFormSchema.safeParse({
    ...Object.fromEntries(formData),
    maintenance_mode: formData.get('maintenance_mode') === 'on',
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  // Platform scalar settings.
  const entries = Object.entries(parsed.data) as Array<[keyof PlatformSettings, PlatformSettings[keyof PlatformSettings]]>;
  for (const [key, value] of entries) {
    await (setSetting as (k: string, v: unknown) => Promise<void>)(key, value);
  }

  // Upstream provider credentials — assembled from flat form fields into one JSON row.
  const upstream: Record<string, UpstreamProviderConfig> = {};
  for (const label of PROVIDER_LABELS_LIST) {
    upstream[label] = {
      api_key: String(formData.get(`upstream_${label}_api_key`) ?? '').trim(),
      base_url: String(formData.get(`upstream_${label}_base_url`) ?? '').trim(),
    };
  }
  await setSetting('upstream_providers', upstream);

  revalidatePath('/admin/settings');
  return { ok: true };
}
