/**
 * Payment gateway abstraction.
 *
 * Every PSP (Stripe, and in the future Alipay / WeChat / manual…) implements
 * this interface. The order service (lib/server/payments/order-service.ts)
 * talks only to the interface, so adding a new PSP is one new file + a
 * registry entry — no changes to callers.
 */

import type { PaymentChannel } from '@/lib/db/enums';
import type { Order } from '@/lib/types';

export interface CheckoutSessionInput {
  order: Order;
  /** Absolute URL the user lands on after a successful payment. */
  successUrl: string;
  /** Absolute URL the user lands on if they cancel / close the checkout. */
  cancelUrl: string;
  /** ISO currency code (e.g. "usd"). */
  currency: string;
}

export interface CheckoutSession {
  /** Gateway-side session id (stored as order.paymentRef). */
  id: string;
  /** URL to redirect the user to for payment. */
  url: string;
}

export interface RefundInput {
  order: Order;
  /** Amount to refund in cents. Defaults to the full order amount. */
  amountCents?: number;
  /** Optional reason shown to the user and in the PSP dashboard. */
  reason?: string;
}

export interface RefundResult {
  id: string;
  amountCents: number;
  status: 'succeeded' | 'pending' | 'failed';
}

/** A verified webhook event dispatched by the gateway. */
export interface GatewayWebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'refund.failed' | 'unknown';
  /** The order id that this event relates to (passed through metadata). */
  orderId: string;
  /** PSP-side payment / refund reference. */
  reference: string;
  /** Amount in cents (for refunds). */
  amountCents?: number;
  /** Raw payload for logging / debugging. */
  raw: unknown;
}

export interface WebhookResult {
  handled: boolean;
  event?: GatewayWebhookEvent;
}

export interface PaymentGateway {
  readonly channel: PaymentChannel;
  /** Whether this gateway is properly configured (env / settings present). */
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  refund(input: RefundInput): Promise<RefundResult>;
  /**
   * Verify the webhook signature and translate the raw event into a
   * GatewayWebhookEvent. Returns handled=false for events that should be
   * ignored (e.g. retried events that were already processed).
   */
  handleWebhook(req: Request): Promise<WebhookResult>;
}
