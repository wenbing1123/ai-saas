'use client';

import { useState, useTransition } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPostJson } from '@/lib/client/api';
import { getDict, type Locale } from '@/lib/i18n';

export function RefundOrderButton({ orderId, locale }: { orderId: string; locale: Locale }) {
  const t = getDict(locale).admin.orders;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refund() {
    if (!window.confirm(t.refundConfirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await apiPostJson(`/api/admin/orders/${orderId}/refund`);
      if (result.code !== '0000') setError(result.msg || t.refundFailed);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={refund}>
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
        {t.refund}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
