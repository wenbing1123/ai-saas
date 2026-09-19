import { handleWebhookEvent } from '@/lib/server/payments/order-service';
import { getGateway } from '@/lib/server/payments/registry';
import { withApi, ok } from '@/lib/server/wrappers';
import { PaymentChannel } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stripe webhook. Public route (no user auth — Stripe signs the payload
 * separately inside `gateway.handleWebhook`). The `withApi` wrapper still
 * gives us unified try/catch → `{ code, msg, data }` and structured logging.
 *
 * Stripe only inspects the HTTP status; the JSON body is for humans/operators.
 * On processing failure the wrapper returns HTTP 500 (code 2001), which
 * triggers Stripe's automatic retry — exactly what we want.
 */
export const POST = withApi({}, async ({ req }) => {
  const gateway = getGateway(PaymentChannel.Stripe);
  const result = await gateway.handleWebhook(req);

  // Signature failed or event type we ignore — still 200 so Stripe stops retrying.
  if (!result.handled || !result.event) {
    return ok({ received: true, ignored: true });
  }

  // Throwing here surfaces as HTTP 500 → Stripe retries the event.
  await handleWebhookEvent(result.event);

  return ok({ received: true });
});
