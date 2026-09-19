'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiPostJson } from '@/lib/client/api';
import { getDict, type Locale } from '@/lib/i18n';

export function CheckoutPayButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const t = getDict(locale).common.checkout;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pay() {
    startTransition(async () => {
      const result = await apiPostJson(`/api/orders/${orderId}/pay`);
      if (result.code === '0000') {
        toast.success(result.msg);
        router.replace(`/dashboard/billing?paid=${orderId}`);
      } else {
        toast.error(result.msg || t.notFound);
      }
    });
  }

  return (
    <Button onClick={pay} disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? t.paying : t.pay}
    </Button>
  );
}
