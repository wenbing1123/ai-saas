import { revalidatePath } from 'next/cache';
import { withApi, ok, businessRule } from '@/lib/server/wrappers';
import { planFormSchema } from '@/lib/validators';
import { createPlan } from '@/lib/repositories/plans';
import { listModels } from '@/lib/repositories/models';
import {
  toPlanInput,
  persistZhTranslations,
  parseAllowedModels,
  type PlanFormValues,
} from './plan-form';

function revalidateStorefront() {
  revalidatePath('/admin/plans');
  revalidatePath('/pricing');
  revalidatePath('/');
  revalidatePath('/dashboard/billing');
}

/** POST /api/admin/plans — create a package. */
export const POST = withApi(
  { role: 'admin', schema: planFormSchema },
  async ({ input, formData }) => {
    const data = input as PlanFormValues;
    if (data.creditDollars > data.priceDollars * 2) {
      throw businessRule(
        `Granted credit ($${data.creditDollars}) is more than 2x the price ($${data.priceDollars}). Reduce the bonus or raise the price.`,
      );
    }

    const allowed = parseAllowedModels(formData!);
    const allModels = await listModels(false);
    const validIds = new Set(allModels.map((m) => m.id));
    if (allowed.some((id) => !validIds.has(id))) {
      throw businessRule('Allowed models contain an invalid selection.');
    }

    const created = await createPlan(toPlanInput(data, allowed));
    await persistZhTranslations(created.id, data);
    revalidateStorefront();
    return ok({}, '套餐已创建');
  },
);
