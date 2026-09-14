/**
 * Gateway registry — resolves a PaymentChannel to its PaymentGateway.
 * Add a new PSP here (and in enums.ts PaymentChannel) to extend.
 */

import { PaymentChannel } from '@/lib/db/enums';
import type { PaymentGateway } from './types';
import { StripeGateway } from './stripe-gateway';
import { ManualGateway } from './manual-gateway';

const registry = new Map<PaymentChannel, PaymentGateway>([
  [PaymentChannel.Stripe, new StripeGateway()],
  [PaymentChannel.Manual, new ManualGateway()],
]);

export function getGateway(channel: PaymentChannel): PaymentGateway {
  const gw = registry.get(channel);
  if (!gw) throw new Error(`No payment gateway registered for channel ${channel}`);
  return gw;
}

export function listConfiguredGateways(): PaymentGateway[] {
  return Array.from(registry.values()).filter((g) => g.isConfigured());
}
