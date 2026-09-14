'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { modelFormSchema, fieldErrorsFromZod } from '@/lib/validators';
import type { ActionResult } from '@/lib/validators';
import { requireAdmin } from '@/lib/server/auth';
import { createModel, updateModel, getModelByPublicId, getModelById } from '@/lib/repositories/models';
import { getSettings } from '@/lib/repositories/settings';
import {
  recommendSellPrices,
  validatePricing,
  costSetOf,
  sellSetOf,
  addSurcharge,
  infraSurchargePer1m,
} from '@/lib/server/pricing';
import type { ModelWriteInput } from '@/lib/repositories/models';

const CHECKBOX = (formData: FormData, key: string) => formData.get(key) === 'on';

function toPrice(value: number): string {
  return value.toFixed(6);
}

async function parseModelForm(formData: FormData) {
  const parsed = modelFormSchema.safeParse({
    ...Object.fromEntries(formData),
    supportsVision: CHECKBOX(formData, 'supportsVision'),
    supportsTools: CHECKBOX(formData, 'supportsTools'),
    supportsReasoning: CHECKBOX(formData, 'supportsReasoning'),
    enabled: CHECKBOX(formData, 'enabled'),
    autoPrices: CHECKBOX(formData, 'autoPrices'),
  });
  return parsed;
}

function buildWriteInput(data: z.infer<typeof modelFormSchema>, infraSurcharge: number): ModelWriteInput {
  // Auto mode: derive sell prices from (cost + infra surcharge) × (1 + markup).
  // ceil-rounded so the realized margin is always at least the target.
  const sell = data.autoPrices
    ? recommendSellPrices({
        inputCostPer1m: data.inputCostPer1m,
        outputCostPer1m: data.outputCostPer1m,
        cacheReadCostPer1m: data.cacheReadCostPer1m,
        cacheWriteCostPer1m: data.cacheWriteCostPer1m,
        markupPercent: data.markupPercent,
        infraSurchargePer1m: infraSurcharge,
      })
    : {
        input: data.sellInputPer1m,
        output: data.sellOutputPer1m,
        cacheRead: data.sellCacheReadPer1m,
        cacheWrite: data.sellCacheWritePer1m,
      };

  return {
    provider: data.provider,
    protocol: data.protocol,
    modelId: data.modelId,
    upstreamModel: data.upstreamModel,
    baseUrl: data.baseUrl || null,
    displayName: data.displayName,
    contextWindow: data.contextWindow,
    maxOutputTokens: data.maxOutputTokens,
    supportsVision: data.supportsVision,
    supportsTools: data.supportsTools,
    supportsReasoning: data.supportsReasoning,
    costCurrency: data.costCurrency,
    inputCostPer1m: toPrice(data.inputCostPer1m),
    outputCostPer1m: toPrice(data.outputCostPer1m),
    cacheReadCostPer1m: toPrice(data.cacheReadCostPer1m),
    cacheWriteCostPer1m: toPrice(data.cacheWriteCostPer1m),
    retailInputPer1m: toPrice(data.retailInputPer1m),
    retailOutputPer1m: toPrice(data.retailOutputPer1m),
    markupPercent: data.markupPercent.toFixed(2),
    sellInputPer1m: toPrice(sell.input),
    sellOutputPer1m: toPrice(sell.output),
    sellCacheReadPer1m: toPrice(sell.cacheRead),
    sellCacheWritePer1m: toPrice(sell.cacheWrite),
    enabled: data.enabled,
    sortOrder: data.sortOrder,
  };
}

export async function createModelAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = await parseModelForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const settings = await getSettings();
  // Amortized infra cost per 1M tokens — the guaranteed-profit floor is
  // (model cost + infra) × (1 + target profit %).
  const usdSurcharge = infraSurchargePer1m(
    settings.infra_cost_per_month_cents / 100,
    settings.forecast_monthly_tokens_m,
  );
  // Express the infra surcharge in the model's native pricing currency.
  // RMB uses the full (unbuffered) rate so the billing-side buffer still over-covers.
  const surcharge = parsed.data.costCurrency === 'rmb'
    ? usdSurcharge * settings.forex_rate_rmb_per_usd
    : usdSurcharge;
  const input = buildWriteInput(parsed.data, surcharge);

  const violations = validatePricing(
    addSurcharge(costSetOf(input), surcharge),
    sellSetOf(input),
    settings.target_profit_percent,
  );
  if (violations.length) {
    return { ok: false, error: violations.map((v) => v.message).join(' ') };
  }

  const conflict = await getModelByPublicId(input.modelId);
  if (conflict) {
    return { ok: false, fieldErrors: { modelId: 'This model ID already exists.' } };
  }

  try {
    await createModel(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create model.' };
  }
  revalidatePath('/admin/models');
  revalidatePath('/pricing');
  revalidatePath('/');
  return { ok: true };
}

export async function updateModelAction(
  modelId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const existing = await getModelById(modelId);
  if (!existing) return { ok: false, error: 'Model not found.' };

  const parsed = await parseModelForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const settings = await getSettings();
  const usdSurcharge = infraSurchargePer1m(
    settings.infra_cost_per_month_cents / 100,
    settings.forecast_monthly_tokens_m,
  );
  const surcharge = parsed.data.costCurrency === 'rmb'
    ? usdSurcharge * settings.forex_rate_rmb_per_usd
    : usdSurcharge;
  const input = buildWriteInput(parsed.data, surcharge);
  if (input.modelId !== existing.modelId) {
    const conflict = await getModelByPublicId(input.modelId);
    if (conflict && conflict.id !== existing.id) {
      return { ok: false, fieldErrors: { modelId: 'Model ID already in use.' } };
    }
  }

  const violations = validatePricing(
    addSurcharge(costSetOf(input), surcharge),
    sellSetOf(input),
    settings.target_profit_percent,
  );
  if (violations.length) {
    return { ok: false, error: violations.map((v) => v.message).join(' ') };
  }

  await updateModel(modelId, input);
  revalidatePath('/admin/models');
  revalidatePath('/pricing');
  return { ok: true };
}

export async function toggleModelAction(modelId: string, enabled: boolean): Promise<ActionResult> {
  await requireAdmin();
  await updateModel(modelId, { enabled });
  revalidatePath('/admin/models');
  return { ok: true };
}
