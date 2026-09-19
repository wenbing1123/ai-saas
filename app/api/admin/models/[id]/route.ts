import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, conflict, businessRule } from '@/lib/server/wrappers';
import { modelFormSchema } from '@/lib/validators';
import { updateModel, getModelByPublicId, getModelById } from '@/lib/repositories/models';
import { getSettings } from '@/lib/repositories/settings';
import {
  validatePricing,
  formatViolationMessage,
  costSetOf,
  sellSetOf,
  addSurcharge,
  infraSurchargePer1m,
} from '@/lib/server/pricing';
import { buildWriteInput, modelFormTransform, type ModelFormValues } from '../model-form';

/** PUT /api/admin/models/:id — update a model. */
export const PUT = withApi(
  { role: 'admin', schema: modelFormSchema, transformFormData: modelFormTransform },
  async ({ input, params }) => {
    const data = input as ModelFormValues;
    const existing = await getModelById(params.id);
    if (!existing) throw notFound('Model not found.');

    const settings = await getSettings();
    const usdSurcharge = infraSurchargePer1m(
      settings.infra_cost_per_month_cents / 100,
      settings.forecast_monthly_tokens_m,
    );
    const surcharge =
      data.costCurrency === 'rmb'
        ? usdSurcharge * settings.forex_rate_rmb_per_usd
        : usdSurcharge;

    const write = buildWriteInput(data, surcharge);
    // Empty upstream key on edit = keep the stored value (never wipe by accident).
    if (data.upstreamApiKey === '') write.upstreamApiKey = undefined;
    if (write.modelId !== existing.modelId) {
      const dup = await getModelByPublicId(write.modelId);
      if (dup && dup.id !== existing.id) {
        throw conflict('Model ID already in use.', {
          fieldErrors: { modelId: 'Model ID already in use.' },
        });
      }
    }

    const violations = validatePricing(
      addSurcharge(costSetOf(write), surcharge),
      sellSetOf(write),
      settings.target_profit_percent,
    );
    if (violations.length) throw businessRule(violations.map(formatViolationMessage).join(' '));

    await updateModel(params.id, write);
    revalidatePath('/admin/models');
    revalidatePath('/pricing');
    return ok({}, '模型已更新');
  },
);

/** PATCH /api/admin/models/:id  { enabled: boolean } — quick publish toggle. */
export const PATCH = withApi({ role: 'admin', body: 'json' }, async ({ input, params }) => {
  const enabled = Boolean((input as { enabled?: boolean }).enabled);
  await updateModel(params.id, { enabled });
  revalidatePath('/admin/models');
  return ok({}, '已更新');
});
