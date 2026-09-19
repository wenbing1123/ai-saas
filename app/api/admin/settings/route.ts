import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { withApi, ok } from '@/lib/server/wrappers';
import { settingsFormSchema } from '@/lib/validators';
import { getSettings, setSetting } from '@/lib/repositories/settings';
import { PROVIDER_LABELS } from '@/lib/db/enums';
import type { PlatformSettings, UpstreamProviderConfig } from '@/lib/types';

const PROVIDER_LABELS_LIST = Object.values(PROVIDER_LABELS);
const SMTP_FIELDS = new Set(['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from']);

const transform = (fd: FormData) => ({
  ...Object.fromEntries(fd),
  maintenance_mode: fd.get('maintenance_mode') === 'on',
  smtp_secure: fd.get('smtp_secure') === 'on',
});

/** PUT /api/admin/settings — platform pricing / operations / SMTP / upstream. */
export const PUT = withApi(
  { role: 'admin', schema: settingsFormSchema, transformFormData: transform },
  async ({ input, formData }) => {
    const data = input as z.infer<typeof settingsFormSchema>;

    const entries = Object.entries(data).filter(([key]) => !SMTP_FIELDS.has(key)) as Array<
      [keyof PlatformSettings, PlatformSettings[keyof PlatformSettings]]
    >;
    for (const [key, value] of entries) {
      await (setSetting as (k: string, v: unknown) => Promise<void>)(key, value);
    }

    const current = await getSettings();
    await setSetting('smtp', {
      host: data.smtp_host,
      port: data.smtp_port,
      secure: data.smtp_secure,
      user: data.smtp_user,
      pass: data.smtp_pass || current.smtp.pass,
      from: data.smtp_from,
    });

    const upstream: Record<string, UpstreamProviderConfig> = {};
    for (const label of PROVIDER_LABELS_LIST) {
      upstream[label] = {
        api_key: String(formData!.get(`upstream_${label}_api_key`) ?? '').trim(),
        base_url: String(formData!.get(`upstream_${label}_base_url`) ?? '').trim(),
      };
    }
    await setSetting('upstream_providers', upstream);

    revalidatePath('/admin/settings');
    return ok({}, '设置已保存');
  },
);
