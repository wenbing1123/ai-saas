/**
 * Order + payment orchestration.
 *
 * The UI / webhook layer calls these; they own the state machine
 * (pending → paid → refunded) and delegate PSP work to the registered
 * PaymentGateway so adding a new PSP never touches this file.
 */

import { PaymentChannel, OrderStatus } from '@/lib/db/enums';
import { logger } from '@/lib/server/logger';
import type { User, Plan, Order } from '@/lib/types';
import { createOrder, getOrderById, markOrderPaid, markOrderRefunded } from '@/lib/repositories/orders';
import { getGateway } from './registry';
import type { GatewayWebhookEvent } from './types';

export interface CreateCheckoutResult {
  order: Order;
  /** Empty for the manual/sandbox gateway (order is paid instantly). */
  redirectUrl: string;
}

export async function createOrderAndCheckout(
  user: User,
  plan: Plan,
  channel: PaymentChannel,
  successUrlTemplate: string,
  cancelUrlTemplate: string,
): Promise<CreateCheckoutResult> {
  const order = await createOrder(user, plan, channel);
  const gateway = getGateway(channel);

  const fill = (tpl: string) => tpl.replace('{orderId}', order.id);

  if (channel === PaymentChannel.Manual) {
    // Sandbox: redirect to a local mock checkout page so the pending → paid
    // state transition is exercised just like a real PSP.
    return { order, redirectUrl: `/checkout/${order.id}` };
  }

  const session = await gateway.createCheckoutSession({
    order: { ...order, planName: plan.name },
    successUrl: fill(successUrlTemplate),
    cancelUrl: fill(cancelUrlTemplate),
    currency: order.currency,
  });
  return { order, redirectUrl: session.url };
}

/**
 * Process a verified webhook event from any gateway. Idempotent — repeated
 * events for an already-paid / already-refunded order are no-ops.
 */
export async function handleWebhookEvent(event: GatewayWebhookEvent): Promise<void> {
  switch (event.type) {
    case 'payment.succeeded': {
      await markOrderPaid(event.orderId, event.reference);
      break;
    }
    case 'refund.succeeded': {
      await markOrderRefunded(event.orderId, event.amountCents);
      break;
    }
    case 'payment.failed':
    case 'refund.failed':
    case 'unknown':
      // No state change; log and ack.
      logger.warn({ event }, '[payments] unhandled webhook event');
      break;
  }
}

export async function refundOrder(orderId: string, amountCents?: number): Promise<Order | null> {
  const found = await getOrderById(orderId);
  if (!found) return null;
  const { order } = found;

  if (order.status !== OrderStatus.Paid) {
    throw new Error(`Order ${order.orderNo} is not paid (status=${order.status}); cannot refund.`);
  }

  const gateway = getGateway(order.paymentChannel);
  if (order.paymentChannel !== PaymentChannel.Manual) {
    const result = await gateway.refund({ order, amountCents });
    if (result.status === 'failed') throw new Error(`Refund failed at gateway: ${result.id}`);
  }

  return markOrderRefunded(orderId, amountCents);
}
