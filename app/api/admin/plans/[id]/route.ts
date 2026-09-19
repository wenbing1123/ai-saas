import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, businessRule } from '@/lib/server/wrappers';
import { planFormSchema } from '@/lib/validators';
import { updatePlan, getPlanById } from '@/lib/repositories/plans';
import {
  toPlanInput,
  persistZhTranslations,
  parseAllowedModels,
  type PlanFormValues,
} from '../plan-form';

/** PUT /api/admin/plans/:id — update a package. */
export const PUT = withApi(
  { role: 'admin', schema: planFormSchema },
  async ({ input, formData, params }) => {
    const existing = await getPlanById(params.id);
    if (!existing) throw notFound('Plan not found.');

    const data = input as PlanFormValues;
    if (data.creditDollars > data.priceDollars * 2) {
      throw businessRule('Granted credit cannot exceed 2x the package price.');
    }

    await updatePlan(params.id, toPlanInput(data, parseAllowedModels(formData!)));
    await persistZhTranslations(params.id, data);

    revalidatePath('/admin/plans');
    revalidatePath('/pricing');
    revalidatePath('/');
    revalidatePath('/dashboard/billing');
    return ok({}, '套餐已更新');
  },
);
