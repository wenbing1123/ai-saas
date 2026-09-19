'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiPatchJson } from '@/lib/client/api';
import { cn } from '@/lib/utils';
import { getDict, type Locale } from '@/lib/i18n';

export function ToggleModelButton({ locale, modelId, enabled }: { locale: Locale; modelId: string; enabled: boolean }) {
  const router = useRouter();
  const t = getDict(locale);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !isEnabled;
      const res = await apiPatchJson(`/api/admin/models/${modelId}`, { enabled: next });
      if (res.code === '0000') {
        setIsEnabled(next);
        toast.success(res.msg);
        router.refresh();
      } else {
        toast.error(res.msg || t.admin.models.toggle.failed);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={toggle}
      className={cn(
        'min-w-[92px]',
        isEnabled && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400',
      )}
    >
      {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {isEnabled ? t.admin.models.toggle.enabled : t.admin.models.toggle.disabled}
    </Button>
  );
}
