'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { purchasePlanAction } from '@/lib/server/actions/billing';
import { formatUsd } from '@/lib/server/pricing';
import { getDict, type Locale } from '@/lib/i18n';
import type { Plan } from '@/lib/types';

export function PurchaseButton({ plan, variant, locale }: { plan: Plan; variant?: 'default' | 'outline'; locale: Locale }) {
  const d = getDict(locale);
  const t = d.console.billing;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [purchasedNo, setPurchasedNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buy() {
    setError(null);
    startTransition(async () => {
      const result = await purchasePlanAction(plan.id);
      if (result.ok && result.data) {
        setPurchasedNo(result.data.orderNo);
        router.refresh();
      } else {
        setError(result.error ?? t.paymentFailed);
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
    <div className="w-full">
      <Button variant={variant ?? 'default'} disabled={pending} onClick={buy} className="w-full">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t.buyFor.replace('{amount}', formatUsd(plan.priceCents))}
      </Button>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
