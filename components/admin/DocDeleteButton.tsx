'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiDelete } from '@/lib/client/api';
import { getDict, type Locale } from '@/lib/i18n';

export function DocDeleteButton({ id, locale }: { id: string; locale: Locale }) {
  const router = useRouter();
  const t = getDict(locale);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(t.admin.docsCms.deleteConfirm)) return;
    startTransition(async () => {
      const res = await apiDelete(`/api/admin/docs/${id}`);
      if (res.code === '0000') {
        toast.success(res.msg);
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={onDelete}>
      {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
      {t.admin.docsCms.delete}
    </Button>
  );
}
