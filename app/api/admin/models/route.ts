import { revalidatePath } from 'next/cache';
import { withApi, ok, conflict, businessRule } from '@/lib/server/wrappers';
import { modelFormSchema } from '@/lib/validators';
import { createModel, getModelByPublicId } from '@/lib/repositories/models';
import { getSettings } from '@/lib/repositories/settings';
import {
  validatePricing,
  costSetOf,
  sellSetOf,
  addSurcharge,
  infraSurchargePer1m,
} from '@/lib/server/pricing';
import { buildWriteInput, modelFormTransform, type ModelFormValues } from './model-form';

/** POST /api/admin/models — create a model. */
export const POST = withApi(
  { role: 'admin', schema: modelFormSchema, transformFormData: modelFormTransform },
  async ({ input }) => {
    const data = input as ModelFormValues;
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
    const violations = validatePricing(
      addSurcharge(costSetOf(write), surcharge),
      sellSetOf(write),
      settings.target_profit_percent,
    );
    if (violations.length) throw businessRule(violations.map((v) => v.message).join(' '));

    if (await getModelByPublicId(write.modelId)) {
      throw conflict('This model ID already exists.', {
        fieldErrors: { modelId: 'This model ID already exists.' },
      });
    }

    await createModel(write);
    revalidatePath('/admin/models');
    revalidatePath('/pricing');
    revalidatePath('/');
    return ok({}, '模型已创建');
  },
);
