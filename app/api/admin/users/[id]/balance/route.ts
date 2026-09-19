import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { withApi, ok, notFound, fail, ErrorCodes } from '@/lib/server/wrappers';
import { adjustBalanceSchema } from '@/lib/validators';
import { adjustBalance, getUserById } from '@/lib/repositories/users';
import { LedgerType } from '@/lib/db/enums';

/**
 * POST /api/admin/users/:id/balance  (form: amountDollars, note)
 * A negative amount deducts; rejects driving the balance below zero.
 */
export const POST = withApi(
  { role: 'admin', schema: adjustBalanceSchema },
  async ({ input, params }) => {
    const data = input as z.infer<typeof adjustBalanceSchema>;
    const cents = Math.round(data.amountDollars * 100);
    if (cents === 0) {
      return fail(ErrorCodes.BUSINESS_RULE, 'Amount cannot be zero.');
    }

    const target = await getUserById(params.id);
    if (!target) throw notFound('User not found.');
    if (target.balanceCents + cents < 0) {
      return fail(
        ErrorCodes.BUSINESS_RULE,
        `Balance would go negative (current $${(target.balanceCents / 100).toFixed(2)}).`,
      );
    }

    await adjustBalance(params.id, cents, {
      type: cents > 0 ? LedgerType.Adjustment : LedgerType.Refund,
      note: data.note || 'Admin balance adjustment',
    });
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${params.id}`);
    return ok({}, '余额已调整');
  },
);
