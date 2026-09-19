'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiPostJson } from '@/lib/client/api';
import { formatUsd } from '@/lib/server/pricing';
import { getDict, type Locale } from '@/lib/i18n';
import type { Plan } from '@/lib/types';

export function PurchaseButton({ plan, variant, locale }: { plan: Plan; variant?: 'default' | 'outline'; locale: Locale }) {
  const d = getDict(locale);
  const t = d.console.billing;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [purchasedNo, setPurchasedNo] = useState<string | null>(null);

  function buy() {
    startTransition(async () => {
      const result = await apiPostJson<{ orderNo: string; redirectUrl: string }>(
        '/api/orders/purchase',
        { planId: plan.id },
      );
      if (result.code === '0000' && result.data) {
        if (result.data.redirectUrl) {
          // Hosted checkout (Stripe). Redirect away from the app.
          window.location.assign(result.data.redirectUrl);
          return;
        }
        // Sandbox/manual: paid instantly.
        setPurchasedNo(result.data.orderNo);
        toast.success(result.msg);
        router.refresh();
      } else {
        toast.error(result.msg || t.paymentFailed);
      }
    });
  }

  if (purchasedNo) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Check className="mr-2 h-4 w-4" />{' '}
        {t.credited.replace('{amount}', formatUsd(plan.creditCents)).replace('{orderNo}', purchasedNo)}
      </Button>
    );
  }

  return (
    <Button variant={variant ?? 'default'} disabled={pending} onClick={buy} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t.buyFor.replace('{amount}', formatUsd(plan.priceCents))}
    </Button>
  );
}
