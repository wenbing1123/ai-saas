import type { z } from 'zod';
import { planFormSchema } from '@/lib/validators';
import { PLAN_ENTITY, type PlanWriteInput } from '@/lib/repositories/plans';
import { replaceTranslations } from '@/lib/repositories/i18n';

export type PlanFormValues = z.infer<typeof planFormSchema>;

export function toPlanInput(data: PlanFormValues, allowedModelIds: string[]): PlanWriteInput {
  return {
    slug: data.slug,
    name: data.name,
    description: data.description || null,
    priceCents: Math.round(data.priceDollars * 100),
    creditCents: Math.round(data.creditDollars * 100),
    validDays: data.validDays,
    rateLimitRpm: data.rateLimitRpm,
    maxConcurrency: data.maxConcurrency,
    allowedModelIds,
    features: data.featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    highlighted: data.highlighted,
    active: data.active,
    sortOrder: data.sortOrder,
  };
}

/** Persist Chinese overrides; blank fields delete the row → English fallback. */
export async function persistZhTranslations(planId: string, data: PlanFormValues): Promise<void> {
  const zhFeatures = data.zhFeaturesText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  await replaceTranslations(PLAN_ENTITY, planId, 'zh', [
    { field: 'name', value: data.zhName },
    { field: 'description', value: data.zhDescription },
    { field: 'features', value: zhFeatures.length ? JSON.stringify(zhFeatures) : null },
  ]);
}

/** Selected models arrive as repeated `allowedModel` form fields. */
export function parseAllowedModels(formData: FormData): string[] {
  return formData.getAll('allowedModel').map((v) => String(v));
}
