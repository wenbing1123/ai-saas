import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound, forbidden, businessRule } from '@/lib/server/wrappers';
import { getOrderById, markOrderPaid } from '@/lib/repositories/orders';
import { PaymentChannel } from '@/lib/db/enums';

/**
 * POST /api/orders/:id/pay
 * Sandbox "pay now" — simulates a successful PSP callback for manual orders.
 */
export const POST = withApi({ role: 'user' }, async ({ user, params }) => {
  const found = await getOrderById(params.id);
  if (!found) throw notFound('Order not found.');
  const { order } = found;
  if (order.userId !== user!.id) throw forbidden('Order does not belong to you.');
  if (order.paymentChannel !== PaymentChannel.Manual) {
    throw businessRule('This order must be paid through its payment provider.');
  }
  const paid = await markOrderPaid(order.id, `sandbox-${order.id}`);
  if (!paid) throw businessRule('Payment could not be processed.');
  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard');
  return ok({ orderNo: paid.orderNo });
});
