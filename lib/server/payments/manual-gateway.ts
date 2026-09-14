/**
 * Manual / sandbox gateway.
 *
 * Keeps the existing "buy now and instantly get the package" flow working for
 * local development and demos. The checkout "session" is a no-op that
 * immediately marks the order paid — no real PSP is involved.
 */

import { PaymentChannel } from '@/lib/db/enums';
import type { PaymentGateway, CheckoutSession, RefundResult } from './types';

export class ManualGateway implements PaymentGateway {
  readonly channel = PaymentChannel.Manual;

  isConfigured(): boolean {
    return true;
  }

  async createCheckoutSession(): Promise<CheckoutSession> {
    // In sandbox mode the caller marks the order paid itself; the session id
    // is just a stable placeholder.
    return { id: `sandbox-${Date.now()}`, url: '' };
  }

  async refund(): Promise<RefundResult> {
    // Sandbox refunds are always immediate.
    return { id: `sandbox-refund-${Date.now()}`, amountCents: 0, status: 'succeeded' };
  }

  async handleWebhook(): Promise<{ handled: boolean }> {
    // Sandbox has no webhooks.
    return { handled: false };
  }
}
