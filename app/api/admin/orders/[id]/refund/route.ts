import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound } from '@/lib/server/wrappers';
import { refundOrder } from '@/lib/server/payments/order-service';

/** POST /api/admin/orders/:id/refund  { amountCents?: number } */
export const POST = withApi({ role: 'admin', body: 'json' }, async ({ input, params }) => {
  const amountCents = (input as { amountCents?: number }).amountCents;
  const order = await refundOrder(params.id, amountCents);
  if (!order) throw notFound('Order not found.');
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return ok({}, '已退款');
});
