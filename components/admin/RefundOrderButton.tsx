'use client';

import { useTransition } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiPostJson } from '@/lib/client/api';
import { getDict, type Locale } from '@/lib/i18n';

export function RefundOrderButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const t = getDict(locale).admin.orders;
  const [pending, startTransition] = useTransition();

  function refund() {
    if (!window.confirm(t.refundConfirm)) return;
    startTransition(async () => {
      const result = await apiPostJson(`/api/admin/orders/${orderId}/refund`);
      if (result.code === '0000') toast.success(result.msg);
      else toast.error(result.msg || t.refundFailed);
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={refund}>
      {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
      {t.refund}
    </Button>
  );
}
