/**
 * Stripe payment gateway.
 *
 * Uses Stripe Checkout (hosted payment page) so we never touch card data.
 * The order id is carried in Checkout Session metadata so webhooks can find
 * the right order. After payment succeeds, order.paymentRef is set to the
 * Stripe PaymentIntent id (used later for refunds).
 */

import Stripe from 'stripe';
import { PaymentChannel } from '@/lib/db/enums';
import type { PaymentGateway, CheckoutSessionInput, CheckoutSession, RefundInput, RefundResult, WebhookResult, GatewayWebhookEvent } from './types';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error('STRIPE_SECRET_KEY is not configured');
    stripeClient = new Stripe(apiKey, { typescript: true });
  }
  return stripeClient;
}

export class StripeGateway implements PaymentGateway {
  readonly channel = PaymentChannel.Stripe;

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: { name: `Package: ${input.order.planName ?? 'Nebula API'}` },
            unit_amount: input.order.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { orderId: input.order.id },
      client_reference_id: input.order.id,
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { id: session.id, url: session.url };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const stripe = getStripe();
    const paymentIntent = input.order.paymentRef;
    if (!paymentIntent) throw new Error('Order has no Stripe payment reference to refund');

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      ...(input.amountCents ? { amount: input.amountCents } : {}),
      metadata: { orderId: input.order.id },
    });
    return {
      id: refund.id,
      amountCents: refund.amount,
      status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'pending' ? 'pending' : 'failed',
    };
  }

  async handleWebhook(req: Request): Promise<WebhookResult> {
    const stripe = getStripe();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = await req.text();

    if (!signature || !webhookSecret) {
      return { handled: false };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      return { handled: false };
    }

    const data = event.data.object as Stripe.Checkout.Session | Stripe.Charge | Stripe.Refund;
    const metadata = (data as { metadata?: { orderId?: string } }).metadata;
    const orderId = metadata?.orderId;

    if (!orderId) return { handled: false };

    const out: GatewayWebhookEvent = {
      type: 'unknown',
      orderId,
      reference: event.id,
      raw: event,
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = data as Stripe.Checkout.Session;
        out.type = 'payment.succeeded';
        // Store the PaymentIntent id as paymentRef so refunds work later.
        out.reference = session.payment_intent as string;
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed':
        out.type = 'payment.failed';
        break;
      case 'charge.refunded': {
        const charge = data as Stripe.Charge;
        out.type = 'refund.succeeded';
        out.amountCents = charge.amount_refunded;
        out.reference = charge.id;
        break;
      }
      default:
        return { handled: false };
    }

    return { handled: true, event: out };
  }
}
