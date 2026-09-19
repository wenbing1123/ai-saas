'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { apiPostForm } from '@/lib/client/api';
import { type ApiResponse, initialApiResponse } from '@/lib/server/api-response';
import { ErrorCodes } from '@/lib/server/errors';
import { getDict, type Locale } from '@/lib/i18n';

export function AdjustBalanceForm({ locale, userId }: { locale: Locale; userId: string }) {
  const router = useRouter();
  const t = getDict(locale);
  const fb = t.admin.userDetail.adjustBalance;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiResponse>(initialApiResponse());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(fb.defaultNote);

  function submit(sign: 1 | -1) {
    setResult(initialApiResponse());
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error(fb.enterPositive);
      setResult({ code: ErrorCodes.VALIDATION_FAILED, msg: fb.enterPositive, data: {} });
      return;
    }
    const fd = new FormData();
    fd.set('amountDollars', String(sign * value));
    fd.set('note', note);
    startTransition(async () => {
      const res = await apiPostForm(`/api/admin/users/${userId}/balance`, fd);
      setResult(res);
      if (res.code === '0000') {
        toast.success(fb.success);
        setAmount('');
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="adj-amount" className="text-xs font-medium">{fb.amount}</Label>
          <Input id="adj-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adj-note" className="text-xs font-medium">{fb.ledgerNote}</Label>
          <Input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => submit(1)}>
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <PlusCircle className="mr-1 h-3 w-3" />}
          {fb.credit}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => submit(-1)}>
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <MinusCircle className="mr-1 h-3 w-3" />}
          {fb.deduct}
        </Button>
      </div>
    </div>
  );
}
