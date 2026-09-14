import { handleWebhookEvent } from '@/lib/server/payments/order-service';
import { getGateway } from '@/lib/server/payments/registry';
import { PaymentChannel } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gateway = getGateway(PaymentChannel.Stripe);
  const result = await gateway.handleWebhook(req);

  if (!result.handled || !result.event) {
    // Signature failed or event type we ignore — still 200 so Stripe stops retrying.
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await handleWebhookEvent(result.event);
  } catch (err) {
    console.error('[webhook:stripe] event processing failed', err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
