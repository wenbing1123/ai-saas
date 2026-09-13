'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { planFormSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requireAdmin } from '@/lib/server/auth';
import { createPlan, updatePlan, getPlanById, PLAN_ENTITY } from '@/lib/repositories/plans';
import { replaceTranslations } from '@/lib/repositories/i18n';
import { listModels } from '@/lib/repositories/models';
import type { PlanWriteInput } from '@/lib/repositories/plans';

function toPlanInput(data: z.infer<typeof planFormSchema>, allowedModelIds: string[]): PlanWriteInput {
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

/** Allowed models are posted as the list of selected "allowedModel" checkboxes. */
function parseAllowedModels(formData: FormData): string[] {
  return formData.getAll('allowedModel').map((v) => String(v));
}

/** Persist Chinese overrides; blank fields delete the row → English fallback. */
async function persistZhTranslations(
  planId: string,
  data: z.infer<typeof planFormSchema>,
): Promise<void> {
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

function revalidateStorefront() {
  revalidatePath('/admin/plans');
  revalidatePath('/pricing');
  revalidatePath('/');
  revalidatePath('/dashboard/billing');
}

export async function createPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = planFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  // Sanity: reselling a package below the granted credit is intentional
  // (bonus credit), but we cap the bonus at 100% to prevent fat-finger losses.
  const data = parsed.data;
  if (data.creditDollars > data.priceDollars * 2) {
    return {
      ok: false,
      error: `Granted credit ($${data.creditDollars}) is more than 2x the price ($${data.priceDollars}). Reduce the bonus or raise the price.`,
    };
  }

  const allowed = parseAllowedModels(formData);
  const allModels = await listModels(false);
  const validIds = new Set(allModels.map((m) => m.id));
  if (allowed.some((id) => !validIds.has(id))) {
    return { ok: false, error: 'Allowed models contain an invalid selection.' };
  }

  const created = await createPlan(toPlanInput(data, allowed));
  await persistZhTranslations(created.id, data);
  revalidateStorefront();
  return { ok: true };
}

export async function updatePlanAction(
  planId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const existing = await getPlanById(planId);
  if (!existing) return { ok: false, error: 'Plan not found.' };

  const parsed = planFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const data = parsed.data;
  if (data.creditDollars > data.priceDollars * 2) {
    return { ok: false, error: 'Granted credit cannot exceed 2x the package price.' };
  }

  await updatePlan(planId, toPlanInput(data, parseAllowedModels(formData)));
  await persistZhTranslations(planId, data);
  revalidateStorefront();
  return { ok: true };
}
