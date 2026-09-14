'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { payOrderAction } from '@/lib/server/actions/billing';
import { getDict, type Locale } from '@/lib/i18n';

export function CheckoutPayButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const t = getDict(locale).common.checkout;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const result = await payOrderAction(orderId);
      if (result.ok) {
        router.replace(`/dashboard/billing?paid=${orderId}`);
      } else {
        setError(result.error ?? t.notFound);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={pay} disabled={pending} className="w-full">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {pending ? t.paying : t.pay}
      </Button>
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
